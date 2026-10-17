#!/usr/bin/env python3
"""Comprueba que la wiki de un proyecto cumple el contrato del sdd-kit.

Uso:
    python3 .sdd-kit/scripts/check_wiki.py            # wiki según ai-kit.yaml
    python3 .sdd-kit/scripts/check_wiki.py . --wiki docs/wiki

Comprueba que index.md tiene una sección (##) por cada tema obligatorio de
kit/wiki-contract.yaml, que cada sección enlaza al menos a una página y que
todos los enlaces relativos del index apuntan a ficheros que existen.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("Falta PyYAML: pip install pyyaml")

KIT = Path(__file__).resolve().parent.parent / "kit"
HEADING = re.compile(r"^##\s+(.+?)\s*#*\s*$")
LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().casefold()


def sections_of(index_text: str) -> dict[str, list[str]]:
    """Cabecera ## normalizada -> enlaces que contiene su sección."""
    result: dict[str, list[str]] = {}
    current = None
    in_code = False
    for line in index_text.splitlines():
        if line.lstrip().startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        m = HEADING.match(line)
        if m:
            current = normalize(m.group(1))
            result.setdefault(current, [])
            continue
        if current is not None:
            result[current].extend(LINK.findall(line))
    return result


def is_relative(target: str) -> bool:
    return not re.match(r"^[a-z][a-z0-9+.-]*:", target, re.I) and not target.startswith("#")


def check(project: Path, wiki: str) -> list[str]:
    contract = yaml.safe_load((KIT / "wiki-contract.yaml").read_text(encoding="utf-8"))
    wiki_dir = project / wiki
    index = wiki_dir / contract.get("index", "index.md")
    if not index.exists():
        return [f"No existe {index.relative_to(project)}"]

    text = index.read_text(encoding="utf-8")
    sections = sections_of(text)
    errors = []

    def resolves(target: str) -> bool:
        path = target.split("#", 1)[0]
        return bool(path) and (index.parent / path).exists()

    for sec in contract["sections"]:
        names = [sec["title"], *sec.get("aliases", [])]
        found = next((normalize(n) for n in names if normalize(n) in sections), None)
        if found is None:
            errors.append(f"Falta la sección '## {sec['title']}' (o alias: {', '.join(sec.get('aliases', [])) or '-'})")
            continue
        links = [t for t in sections[found] if is_relative(t)]
        if not any(resolves(t) for t in links):
            errors.append(f"La sección '{sec['title']}' no enlaza a ninguna página existente")

    for target in LINK.findall(text):
        if is_relative(target) and not target.startswith("#") and not resolves(target):
            errors.append(f"Enlace roto en index: {target}")

    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Valida la wiki contra el contrato del sdd-kit")
    parser.add_argument("project", nargs="?", default=".")
    parser.add_argument("--wiki", help="ruta de la wiki (por defecto, la de ai-kit.yaml)")
    args = parser.parse_args(argv)

    project = Path(args.project).resolve()
    wiki = args.wiki
    if not wiki:
        manifest = project / "ai-kit.yaml"
        if not manifest.exists():
            print("Indica --wiki o crea ai-kit.yaml", file=sys.stderr)
            return 2
        wiki = (yaml.safe_load(manifest.read_text(encoding="utf-8")) or {}).get("wiki")
        if not wiki:
            print("ai-kit.yaml no define 'wiki'", file=sys.stderr)
            return 2

    errors = check(project, wiki.rstrip("/"))
    if errors:
        print(f"La wiki ({wiki}) no cumple el contrato:")
        for e in errors:
            print(f"  - {e}")
        return 1
    print(f"OK: la wiki ({wiki}) cumple el contrato")
    return 0


if __name__ == "__main__":
    sys.exit(main())
