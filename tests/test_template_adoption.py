"""Exercise real pinned template adoption in isolated consumer copies."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from jsonschema.exceptions import ValidationError

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("adoption", ROOT / "tools/check_template_adoption.py")
adoption = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adoption)


class AdoptionContracts(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="launcher-adoption-fixture-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "consumer"
        subprocess.run(["git", "init", str(self.root)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # A shallow clone can omit unreferenced pinned template objects. Read
        # the already-verified parent object database without changing it.
        objects = Path(subprocess.check_output(
            ["git", "-C", str(ROOT), "rev-parse", "--git-path", "objects"]).decode().strip())
        if not objects.is_absolute():
            objects = (ROOT / objects).resolve()
        (self.root / ".git/objects/info/alternates").write_text(
            objects.as_posix() + "\n", encoding="utf-8", newline="\n")
        self.relative = Path("workspace/v0.0.1/agent/binding.json")
        self.folder = self.root / self.relative.parent
        self.folder.parent.mkdir(parents=True)
        shutil.copytree(ROOT / self.relative.parent, self.folder)
        shutil.copyfile(ROOT / "AGENTS.md", self.root / "AGENTS.md")
        (self.root / "agents/aldergate").mkdir(parents=True)
        shutil.copyfile(ROOT / "agents/aldergate/IDENTITY.md", self.root / "agents/aldergate/IDENTITY.md")
        self.data = json.loads((self.folder / "binding.json").read_text(encoding="utf-8"))

    def save(self):
        (self.folder / "binding.json").write_text(json.dumps(self.data), encoding="utf-8")

    def verify(self):
        return adoption.verify(self.root, self.relative, allow_fetch=False)

    def test_real_pinned_template_adoption(self):
        self.verify()

    def test_changed_vendor_template_rejected(self):
        (self.folder / "template/AGENTS.template.md").write_text("# altered\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Vendored template bytes"):
            self.verify()

    def test_changed_rendered_instructions_rejected(self):
        (self.folder / "AGENTS.md").write_text("# bypass\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Rendered instruction bytes"):
            self.verify()

    def test_unresolved_parameter_rejected(self):
        self.data["bindings"]["AGENT_NAME"] = "{{UNKNOWN}}"
        self.save()
        with self.assertRaisesRegex(ValueError, "Unresolved template token"):
            self.verify()

    def test_unknown_parameter_rejected(self):
        self.data["bindings"]["PROVIDER_SECRET"] = "synthetic-invalid-field"
        self.save()
        with self.assertRaises(ValidationError) as raised:
            self.verify()
        self.assertIn("Additional properties", str(raised.exception))

    def test_missing_parameter_rejected(self):
        del self.data["bindings"]["AGENT_ID"]
        self.save()
        with self.assertRaisesRegex(ValidationError, "required property"):
            self.verify()

    def test_changed_graph_receipt_hash_rejected(self):
        self.data["template"]["graph_receipt_sha256"] = "0" * 64
        self.save()
        with self.assertRaisesRegex(ValueError, "graph receipt changed"):
            self.verify()

    def test_draft_cannot_claim_approved_adoption(self):
        self.data["adoption_status"] = "approved"
        self.save()
        with self.assertRaisesRegex(ValueError, "marked development"):
            self.verify()

    def test_unused_instruction_files_are_not_adoption(self):
        (self.root / "AGENTS.md").write_text("# No activation\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "do not activate"):
            self.verify()

    def test_comment_only_instruction_reference_rejected(self):
        (self.root / "AGENTS.md").write_text(
            "Ignore the vendor. <!-- workspace/v0.0.1/agent/AGENTS.md -->\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "do not activate"):
            self.verify()

    def test_comment_only_identity_reference_rejected(self):
        (self.root / "agents/aldergate/IDENTITY.md").write_text(
            "Ignore the vendor. <!-- workspace/v0.0.1/agent/IDENTITY.md -->\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "do not activate"):
            self.verify()
