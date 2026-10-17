#!/usr/bin/env python3
"""Instala o actualiza el sdd-kit en un proyecto según su ai-kit.yaml.

Uso (desde la raíz del proyecto, con el kit como submódulo en .sdd-kit):
    python3 .sdd-kit/scripts/sync.py            # instala / actualiza
    python3 .sdd-kit/scripts/sync.py --init     # crea ai-kit.yaml de ejemplo
    python3 .sdd-kit/scripts/sync.py --check    # CI: falla si algo no está al día
    python3 .sdd-kit/scripts/sync.py --force    # pisa también ficheros gestionados editados a mano

Qué hace:
  - Gestionados (se regeneran siempre; registrados en .sdd-kit.lock.json):
      openspec/schemas/sdd-kit/**, agentes y skills de cada harness.
  - Bloque gestionado dentro de AGENTS.md (entre marcadores); el resto del fichero es tuyo.
  - Semilla (solo si no existen): openspec/config.yaml, la wiki, CLAUDE.md.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("Falta PyYAML: pip install pyyaml")

KIT_ROOT = Path(__file__).resolve().parent.parent
KIT = KIT_ROOT / "kit"
MANIFEST = "ai-kit.yaml"
LOCK = ".sdd-kit.lock.json"
SCHEMA_NAME = "sdd-kit"
BLOCK_START = "<!-- sdd-kit:start -->"
BLOCK_END = "<!-- sdd-kit:end -->"
HARNESSES = {
    # harness: (carpeta de agentes, sufijo de agente, carpeta de skills)
    "copilot": (".github/agents", ".agent.md", ".github/skills"),
    "claude": (".claude/agents", ".md", ".claude/skills"),
}
PLACEHOLDER = re.compile(r"\{\{([A-Z_]+)\}\}")


class KitError(Exception):
    pass


# ---------------------------------------------------------------- utilidades

def kit_version() -> str:
    return (KIT_ROOT / "VERSION").read_text(encoding="utf-8").strip()


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def render(text: str, variables: dict[str, str], origin: str) -> str:
    def sub(m: re.Match) -> str:
        key = m.group(1)
        if key not in variables:
            raise KitError(f"{origin}: variable desconocida {{{{{key}}}}}")
        return variables[key]

    return PLACEHOLDER.sub(sub, text)


def split_frontmatter(text: str, origin: str) -> tuple[dict, str]:
    if not text.startswith("---\n"):
        raise KitError(f"{origin}: falta el frontmatter YAML")
    end = text.find("\n---\n", 4)
    if end == -1:
        raise KitError(f"{origin}: frontmatter sin cerrar")
    meta = yaml.safe_load(text[4:end]) or {}
    if not isinstance(meta, dict):
        raise KitError(f"{origin}: el frontmatter no es un mapa")
    return meta, text[end + 5:]


def dump_frontmatter(meta: dict) -> str:
    body = yaml.safe_dump(meta, sort_keys=False, allow_unicode=True, width=1000)
    return f"---\n{body}---\n"


def generated_note(version: str) -> str:
    return (f"<!-- Generado por sdd-kit {version}. No editar aquí: "
            f"cambia el kit y ejecuta sync. -->\n")


# ---------------------------------------------------------------- manifiesto

def load_manifest(project: Path) -> dict:
    path = project / MANIFEST
    if not path.exists():
        raise KitError(f"No existe {MANIFEST}. Ejecuta con --init para crear uno de ejemplo.")
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}

    errors = []
    if not isinstance(data.get("project"), str) or not data["project"].strip():
        errors.append("'project' debe ser un texto")
    if not isinstance(data.get("wiki"), str) or not data["wiki"].strip():
        errors.append("'wiki' debe ser una ruta relativa")
    elif Path(data["wiki"]).is_absolute() or ".." in Path(data["wiki"]).parts:
        errors.append("'wiki' debe ser relativa y estar dentro del proyecto")

    stacks = data.get("stacks") or []
    if not isinstance(stacks, list):
        errors.append("'stacks' debe ser una lista")
        stacks = []
    available = sorted(p.name for p in (KIT / "skills/stacks").iterdir()
                       if p.is_dir() and not p.name.startswith("_"))
    for s in stacks:
        if s not in available:
            errors.append(f"stack '{s}' no existe en el kit (disponibles: {', '.join(available)})")

    harnesses = data.get("harnesses") or []
    if not isinstance(harnesses, list) or not harnesses:
        errors.append("'harnesses' debe ser una lista no vacía")
        harnesses = []
    for h in harnesses:
        if h not in HARNESSES:
            errors.append(f"harness '{h}' no soportado (usa: {', '.join(HARNESSES)})")

    if errors:
        raise KitError(f"{MANIFEST} no es válido:\n  - " + "\n  - ".join(errors))

    data["stacks"] = stacks
    data["harnesses"] = harnesses
    data["wiki"] = data["wiki"].strip().rstrip("/")
    return data


def variables_for(project: Path, manifest: dict) -> dict[str, str]:
    # Ruta del kit que se escribe en los ficheros generados. Si el kit vive dentro
    # del proyecto (submódulo) se calcula; si no, se usa kit_path del manifiesto,
    # para no dejar rutas de una máquina concreta en ficheros versionados.
    try:
        kit_rel = KIT_ROOT.relative_to(project.resolve()).as_posix()
    except ValueError:
        kit_rel = str(manifest.get("kit_path") or ".sdd-kit")
    return {
        "PROJECT_NAME": manifest["project"].strip(),
        "WIKI_PATH": manifest["wiki"],
        "STACKS": ", ".join(manifest["stacks"]) or "sin stack específico",
        "KIT_PATH": kit_rel,
    }


# ---------------------------------------------------------------- plan de salida

def planned_outputs(manifest: dict, variables: dict[str, str]) -> dict[str, bytes]:
    """Ficheros gestionados: ruta relativa al proyecto -> contenido."""
    version = kit_version()
    out: dict[str, bytes] = {}

    # 1. Schema de OpenSpec (copia literal)
    schema_src = KIT / "openspec/schemas" / SCHEMA_NAME
    for f in sorted(schema_src.rglob("*")):
        if f.is_file():
            rel = Path("openspec/schemas") / SCHEMA_NAME / f.relative_to(schema_src)
            out[rel.as_posix()] = f.read_bytes()

    # 2. Skills: core + stacks elegidos
    skill_dirs = sorted(p for p in (KIT / "skills/core").iterdir() if p.is_dir())
    skill_dirs += [KIT / "skills/stacks" / s for s in manifest["stacks"]]
    skills: list[tuple[str, Path]] = []
    for d in skill_dirs:
        meta, _ = split_frontmatter((d / "SKILL.md").read_text(encoding="utf-8"), str(d))
        name = meta.get("name")
        if not name or not meta.get("description"):
            raise KitError(f"{d}/SKILL.md: faltan 'name' o 'description'")
        skills.append((name, d))

    # 3. Agentes (fuente neutra)
    agents = []
    for f in sorted((KIT / "agents").glob("*.md")):
        meta, body = split_frontmatter(f.read_text(encoding="utf-8"), str(f))
        for key in ("name", "description"):
            if not meta.get(key):
                raise KitError(f"{f}: falta '{key}'")
        agents.append((meta, body, f))

    for h in manifest["harnesses"]:
        agents_dir, suffix, skills_dir = HARNESSES[h]

        for meta, body, f in agents:
            fm = {"name": meta["name"], "description": meta["description"]}
            extra = (meta.get("harness") or {}).get(h) or {}
            if not isinstance(extra, dict):
                raise KitError(f"{f}: harness.{h} debe ser un mapa")
            fm.update(extra)
            text = dump_frontmatter(fm) + generated_note(version) + render(body, variables, str(f))
            out[f"{agents_dir}/{meta['name']}{suffix}"] = text.encode("utf-8")

        for name, d in skills:
            for f in sorted(d.rglob("*")):
                if not f.is_file():
                    continue
                rel = f"{skills_dir}/{name}/{f.relative_to(d).as_posix()}"
                if f.suffix == ".md":
                    text = render(f.read_text(encoding="utf-8"), variables, str(f))
                    if f.name == "SKILL.md":
                        meta, body = split_frontmatter(text, str(f))
                        text = dump_frontmatter(meta) + generated_note(version) + body
                    out[rel] = text.encode("utf-8")
                else:
                    out[rel] = f.read_bytes()

    return out


def agents_block(variables: dict[str, str]) -> str:
    body = render((KIT / "project-templates/AGENTS.md").read_text(encoding="utf-8"),
                  variables, "AGENTS.md")
    return f"{BLOCK_START}\n{body.rstrip()}\n{BLOCK_END}"


def merge_agents_md(current: str | None, block: str) -> str:
    if current is None:
        return block + "\n"
    if BLOCK_START in current and BLOCK_END in current:
        start = current.index(BLOCK_START)
        end = current.index(BLOCK_END) + len(BLOCK_END)
        return current[:start] + block + current[end:]
    return current.rstrip() + "\n\n" + block + "\n"


def seeds(manifest: dict, variables: dict[str, str]) -> dict[str, str]:
    """Ficheros que se crean una vez y luego pertenecen al proyecto."""
    tpl = KIT / "project-templates"
    result = {
        "openspec/config.yaml": render((tpl / "openspec-config.yaml").read_text(encoding="utf-8"),
                                       variables, "openspec-config.yaml"),
    }
    if "claude" in manifest["harnesses"]:
        result["CLAUDE.md"] = "@AGENTS.md\n"
    return result


def wiki_seed(variables: dict[str, str]) -> dict[str, str]:
    src = KIT / "project-templates/wiki"
    return {f"{variables['WIKI_PATH']}/{f.relative_to(src).as_posix()}":
            render(f.read_text(encoding="utf-8"), variables, str(f))
            for f in sorted(src.rglob("*.md"))}


# ---------------------------------------------------------------- lock

def read_lock(project: Path) -> dict:
    path = project / LOCK
    if not path.exists():
        return {"files": {}}
    return json.loads(path.read_text(encoding="utf-8"))


def write_lock(project: Path, files: dict[str, str]) -> None:
    data = {"kit_version": kit_version(), "files": dict(sorted(files.items()))}
    (project / LOCK).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                                encoding="utf-8")


def config_schema_problem(project: Path) -> str | None:
    path = project / "openspec/config.yaml"
    if not path.exists():
        return "falta openspec/config.yaml"
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as e:
        return f"openspec/config.yaml no es YAML válido ({e.__class__.__name__})"
    if not isinstance(data, dict) or data.get("schema") != SCHEMA_NAME:
        found = data.get("schema") if isinstance(data, dict) else None
        return f"openspec/config.yaml usa schema '{found}', debería ser '{SCHEMA_NAME}'"
    return None


# ---------------------------------------------------------------- comandos

def cmd_init(project: Path) -> int:
    target = project / MANIFEST
    if target.exists():
        print(f"{MANIFEST} ya existe; no lo toco.")
        return 0
    shutil.copyfile(KIT / "project-templates/ai-kit.yaml", target)
    print(f"Creado {MANIFEST}. Edítalo y ejecuta sync sin --init.")
    return 0


def cmd_check(project: Path) -> int:
    manifest = load_manifest(project)
    variables = variables_for(project, manifest)
    planned = planned_outputs(manifest, variables)
    lock = read_lock(project)
    problems = []

    for rel, content in planned.items():
        path = project / rel
        if not path.exists():
            problems.append(f"falta        {rel}")
        elif path.read_bytes() != content:
            problems.append(f"desactualizado {rel}")
    for rel in lock.get("files", {}):
        if rel not in planned and (project / rel).exists():
            problems.append(f"sobra        {rel}")

    agents_md = project / "AGENTS.md"
    current = agents_md.read_text(encoding="utf-8") if agents_md.exists() else None
    if current is None or merge_agents_md(current, agents_block(variables)) != current:
        problems.append("desactualizado AGENTS.md (bloque sdd-kit)")
    schema_problem = config_schema_problem(project)
    if schema_problem:
        problems.append(schema_problem)

    if lock.get("kit_version") != kit_version():
        problems.append(f"lock en versión {lock.get('kit_version')} y kit en {kit_version()}")

    if problems:
        print("El proyecto no está sincronizado con el kit:")
        for p in problems:
            print("  " + p)
        print("Ejecuta: python3 " + variables["KIT_PATH"] + "/scripts/sync.py")
        return 1
    print(f"OK: sincronizado con sdd-kit {kit_version()}")
    return 0


def cmd_sync(project: Path, force: bool) -> int:
    manifest = load_manifest(project)
    variables = variables_for(project, manifest)
    planned = planned_outputs(manifest, variables)
    old = read_lock(project).get("files", {})
    new_lock: dict[str, str] = {}
    written, skipped, removed, seeded = [], [], [], []

    for rel, content in planned.items():
        path = project / rel
        new_hash = sha(content)
        if path.exists():
            disk = path.read_bytes()
            edited = rel in old and sha(disk) != old[rel] and disk != content
            unknown = rel not in old and disk != content
            if (edited or unknown) and not force:
                skipped.append(rel)
                new_lock[rel] = old.get(rel, sha(disk))
                continue
            if disk == content:
                new_lock[rel] = new_hash
                continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        new_lock[rel] = new_hash
        written.append(rel)

    for rel, h in old.items():
        if rel in planned:
            continue
        path = project / rel
        if path.exists():
            if sha(path.read_bytes()) != h and not force:
                skipped.append(rel + " (ya no lo gestiona el kit)")
                continue
            path.unlink()
            removed.append(rel)
            parent = path.parent
            while parent != project and parent.exists() and not any(parent.iterdir()):
                parent.rmdir()
                parent = parent.parent

    agents_md = project / "AGENTS.md"
    current = agents_md.read_text(encoding="utf-8") if agents_md.exists() else None
    merged = merge_agents_md(current, agents_block(variables))
    if merged != current:
        agents_md.write_text(merged, encoding="utf-8")
        written.append("AGENTS.md (bloque sdd-kit)")

    to_seed = seeds(manifest, variables)
    if not (project / manifest["wiki"] / "index.md").exists():
        to_seed.update(wiki_seed(variables))
    for rel, text in to_seed.items():
        path = project / rel
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
            seeded.append(rel)

    write_lock(project, new_lock)
    schema_warning = config_schema_problem(project)

    print(f"sdd-kit {kit_version()} → {manifest['project']}")
    print(f"  harnesses: {', '.join(manifest['harnesses'])} · stacks: {variables['STACKS']}")
    for label, items in (("escritos", written), ("creados (ahora son del proyecto)", seeded),
                         ("eliminados", removed)):
        if items:
            print(f"  {label}: {len(items)}")
            for i in items:
                print(f"    {i}")
    if skipped:
        print("  AVISO: editados a mano, no se han tocado (usa --force para pisarlos):")
        for i in skipped:
            print(f"    {i}")
    if schema_warning:
        print(f"  AVISO: {schema_warning}")
    if not (written or seeded or removed or skipped or schema_warning):
        print("  Todo al día.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sincroniza el sdd-kit en un proyecto")
    parser.add_argument("project", nargs="?", default=".", help="raíz del proyecto (por defecto .)")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--init", action="store_true", help="crea un ai-kit.yaml de ejemplo")
    mode.add_argument("--check", action="store_true", help="solo comprueba (para CI)")
    parser.add_argument("--force", action="store_true", help="pisa ficheros gestionados editados a mano")
    args = parser.parse_args(argv)

    project = Path(args.project).resolve()
    if not project.is_dir():
        print(f"No existe el directorio {project}", file=sys.stderr)
        return 2
    try:
        if args.init:
            return cmd_init(project)
        if args.check:
            return cmd_check(project)
        return cmd_sync(project, args.force)
    except KitError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
