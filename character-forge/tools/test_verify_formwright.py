"""Negative-path and success-path tests for the Formwright validator."""
import tempfile
import unittest
from pathlib import Path

from verify_formwright import (
    REQUIRED, check_archives, check_markdown_links, check_required,
    is_allowed_path, portable_violations,
)


class FormwrightVerifierTests(unittest.TestCase):
    def test_portable_accepts_generic_identity(self):
        self.assertEqual(portable_violations("Formwright portable role, reviewed by an owner."), [])

    def test_portable_rejects_project_specific_content(self):
        self.assertIn("aldervale", portable_violations("AlderVale race spec"))
        self.assertIn("notion.com", portable_violations("https://notion.com/private"))

    def test_invalid_archive_manifest_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            version = root / "versions" / "v0.0.1"
            version.mkdir(parents=True)
            (version / "README.md").write_text("frozen", encoding="utf-8")
            (version / "CHANGELOG.md").write_text("frozen", encoding="utf-8")
            (version / "MANIFEST.json").write_text(
                '{"version":"v0.0.1","files":[{"source_commit":"bad","source_blob_sha":"bad",'
                '"source_path":"safe.md","archived_path":"character-forge/versions/v0.0.1/README.md"}]}',
                encoding="utf-8",
            )
            self.assertTrue(any("invalid 40-character" in m for m in check_archives(root)))

    def test_rejects_out_of_scope_changes(self):
        self.assertTrue(is_allowed_path("character-forge/README.md"))
        self.assertTrue(is_allowed_path(".github/workflows/formwright.yml"))
        self.assertFalse(is_allowed_path("README.md"))
        self.assertFalse(is_allowed_path("shared/wardrobe.ts"))
        self.assertFalse(is_allowed_path(".github/workflows/validate.yml"))

    def test_missing_required_file_detected(self):
        with tempfile.TemporaryDirectory() as d:
            missing = check_required(Path(d))
            self.assertEqual(len(missing), len(REQUIRED))
            self.assertTrue(any("AGENT_IDENTITY.md" in m for m in missing))

    def test_rejects_broken_local_markdown_links(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            doc = root / "doc.md"
            doc.write_text("[broken](missing.md)", encoding="utf-8")
            self.assertTrue(any("broken local link" in m for m in check_markdown_links(doc, root)))

    def test_rejects_link_escape(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            doc = root / "doc.md"
            doc.write_text("[escape](../../outside.md)", encoding="utf-8")
            self.assertTrue(any("escapes repository" in m for m in check_markdown_links(doc, root)))

    def test_accepts_existing_local_markdown_link(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "target.md").write_text("exists", encoding="utf-8")
            doc = root / "doc.md"
            doc.write_text("[target](target.md)", encoding="utf-8")
            self.assertEqual(check_markdown_links(doc, root), [])


if __name__ == "__main__":
    unittest.main()
