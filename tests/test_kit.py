"""Tests del sdd-kit: python3 -m unittest discover -s tests"""
import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import check_wiki  # noqa: E402
import sync  # noqa: E402

MANIFEST = """project: Demo
wiki: docs/wiki
stacks: [ios]
harnesses: [copilot, claude]
"""


def run(fn, *args):
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        code = fn(list(args))
    return code, out.getvalue()


class SyncTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.p = Path(self.tmp.name)
        (self.p / "ai-kit.yaml").write_text(MANIFEST, encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def sync(self, *extra):
        return run(sync.main, str(self.p), *extra)

    def test_install_and_check(self):
        code, out = self.sync()
        self.assertEqual(code, 0, out)
        for rel in [
            "openspec/schemas/sdd-kit/schema.yaml",
            "openspec/schemas/sdd-kit/templates/spec.md",
            "openspec/config.yaml",
            ".github/agents/sdd-analista.agent.md",
            ".claude/agents/sdd-analista.md",
            ".github/skills/consultar-wiki/SKILL.md",
            ".claude/skills/stack-ios/SKILL.md",
            "docs/wiki/index.md",
            "AGENTS.md",
            "CLAUDE.md",
            ".sdd-kit.lock.json",
        ]:
            self.assertTrue((self.p / rel).exists(), rel)
        self.assertFalse((self.p / ".claude/skills/stack-android").exists())

        agent = (self.p / ".claude/agents/sdd-arquitecto.md").read_text(encoding="utf-8")
        self.assertTrue(agent.startswith("---\nname: sdd-arquitecto\n"))
        self.assertNotIn("harness:", agent)
        self.assertNotIn("{{", agent)
        self.assertIn("Demo", agent)
        self.assertIn("docs/wiki/index.md", (self.p / ".github/skills/consultar-wiki/SKILL.md").read_text(encoding="utf-8"))

        code, out = run(sync.main, str(self.p), "--check")
        self.assertEqual(code, 0, out)
        code, out = run(check_wiki.main, str(self.p))
        self.assertEqual(code, 0, out)

    def test_idempotent(self):
        self.sync()
        code, out = self.sync()
        self.assertIn("Todo al día", out)

    def test_hand_edit_is_protected_until_force(self):
        self.sync()
        f = self.p / ".claude/agents/sdd-revisor.md"
        f.write_text("editado", encoding="utf-8")
        code, out = self.sync()
        self.assertIn("editados a mano", out)
        self.assertEqual(f.read_text(encoding="utf-8"), "editado")
        self.assertEqual(run(sync.main, str(self.p), "--check")[0], 1)
        self.sync("--force")
        self.assertNotEqual(f.read_text(encoding="utf-8"), "editado")

    def test_project_files_are_not_overwritten(self):
        self.sync()
        cfg = self.p / "openspec/config.yaml"
        cfg.write_text("schema: sdd-kit\ncontext: mío\n", encoding="utf-8")
        idx = self.p / "docs/wiki/index.md"
        idx.write_text("# mía\n", encoding="utf-8")
        self.sync()
        self.assertIn("mío", cfg.read_text(encoding="utf-8"))
        self.assertEqual(idx.read_text(encoding="utf-8"), "# mía\n")

    def test_warns_if_config_uses_other_schema(self):
        self.sync()
        (self.p / "openspec/config.yaml").write_text("schema: spec-driven\n", encoding="utf-8")
        code, out = self.sync()
        self.assertIn("spec-driven", out)
        code, out = run(sync.main, str(self.p), "--check")
        self.assertEqual(code, 1)

    def test_agents_md_keeps_user_content(self):
        (self.p / "AGENTS.md").write_text("# Mi proyecto\n\nNotas propias.\n", encoding="utf-8")
        self.sync()
        text = (self.p / "AGENTS.md").read_text(encoding="utf-8")
        self.assertTrue(text.startswith("# Mi proyecto\n\nNotas propias."))
        self.assertEqual(text.count(sync.BLOCK_START), 1)
        self.sync()
        self.assertEqual((self.p / "AGENTS.md").read_text(encoding="utf-8").count(sync.BLOCK_START), 1)

    def test_removing_stack_and_harness_cleans_up(self):
        self.sync()
        (self.p / "ai-kit.yaml").write_text(MANIFEST.replace("[ios]", "[]").replace(", claude", ""),
                                            encoding="utf-8")
        self.sync()
        self.assertFalse((self.p / ".claude").exists())
        self.assertFalse((self.p / ".github/skills/stack-ios").exists())
        self.assertTrue((self.p / ".github/skills/consultar-wiki/SKILL.md").exists())

    def test_invalid_manifest(self):
        (self.p / "ai-kit.yaml").write_text(MANIFEST.replace("ios", "cobol").replace("claude", "vim"),
                                            encoding="utf-8")
        code, out = self.sync()
        self.assertEqual(code, 2)
        self.assertIn("cobol", out)
        self.assertIn("vim", out)

    def test_init(self):
        (self.p / "ai-kit.yaml").unlink()
        self.assertEqual(self.sync()[0], 2)
        self.assertEqual(self.sync("--init")[0], 0)
        self.assertTrue((self.p / "ai-kit.yaml").exists())


class WikiTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.p = Path(self.tmp.name)
        (self.p / "ai-kit.yaml").write_text(MANIFEST, encoding="utf-8")
        run(sync.main, str(self.p))
        self.idx = self.p / "docs/wiki/index.md"

    def tearDown(self):
        self.tmp.cleanup()

    def test_missing_section(self):
        self.idx.write_text(self.idx.read_text(encoding="utf-8").replace("## Comandos", "## Otra cosa"),
                            encoding="utf-8")
        code, out = run(check_wiki.main, str(self.p))
        self.assertEqual(code, 1)
        self.assertIn("Comandos", out)

    def test_alias_accepted(self):
        self.idx.write_text(self.idx.read_text(encoding="utf-8").replace("## Comandos", "## Commands"),
                            encoding="utf-8")
        self.assertEqual(run(check_wiki.main, str(self.p))[0], 0)

    def test_broken_link(self):
        (self.p / "docs/wiki/testing.md").unlink()
        code, out = run(check_wiki.main, str(self.p))
        self.assertEqual(code, 1)
        self.assertIn("testing.md", out)


class KitConsistencyTest(unittest.TestCase):
    def test_schema_templates_exist_and_requires_valid(self):
        import yaml
        root = sync.KIT / "openspec/schemas/sdd-kit"
        schema = yaml.safe_load((root / "schema.yaml").read_text(encoding="utf-8"))
        self.assertEqual(schema["name"], root.name)
        ids = [a["id"] for a in schema["artifacts"]]
        self.assertEqual(len(ids), len(set(ids)))
        for a in schema["artifacts"]:
            for key in ("id", "generates", "description", "template"):
                self.assertIn(key, a)
            self.assertTrue((root / "templates" / a["template"]).exists(), a["template"])
            for r in a.get("requires", []):
                self.assertIn(r, ids)
        for r in schema["apply"]["requires"]:
            self.assertIn(r, ids)
        tracked = schema["apply"]["tracks"]
        self.assertIn(tracked, [a["generates"] for a in schema["artifacts"]])

    def test_skill_names_unique(self):
        names = []
        for d in list((sync.KIT / "skills/core").iterdir()) + list((sync.KIT / "skills/stacks").iterdir()):
            if d.name.startswith("_"):
                continue
            meta, _ = sync.split_frontmatter((d / "SKILL.md").read_text(encoding="utf-8"), str(d))
            names.append(meta["name"])
        self.assertEqual(len(names), len(set(names)))


if __name__ == "__main__":
    unittest.main()
