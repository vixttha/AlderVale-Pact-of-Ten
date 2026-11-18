"""Unit contracts for the Formwright document-version Graphify extractor."""
import unittest

from version_graph import document_paths, headings


class VersionGraphTests(unittest.TestCase):
    def test_headings_ignores_fenced_examples(self):
        sample = "# Real heading\n\n```bash\n# Not a heading\n```\n## Another heading"
        self.assertEqual(headings(sample), [(1, "Real heading"), (6, "Another heading")])

    def test_draft_template_and_adoption_are_both_indexed(self):
        paths = document_paths("v0.0.1", "draft")
        self.assertTrue(any("/template/v0.0.1/" in p.as_posix() for p in paths))
        self.assertTrue(any("/workspace/v0.0.1/" in p.as_posix() for p in paths))

    def test_rejects_invalid_version_and_unapproved_archive(self):
        with self.assertRaises(ValueError):
            document_paths("../main", "draft")
        with self.assertRaises(ValueError):
            document_paths("v0.0.1", "archive")


if __name__ == "__main__":
    unittest.main()
