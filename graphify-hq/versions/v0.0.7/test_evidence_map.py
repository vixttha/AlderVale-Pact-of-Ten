import json
import unittest
from pathlib import Path

from evidence_map import locate, validate_manifest
from github_provenance import verify_pull_request

FIXTURE = Path(__file__).parent / "examples" / "first-spark.json"


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads(FIXTURE.read_text(encoding="utf-8"))

    def test_manifest_accepts_both_vitest_and_playwright_sources(self):
        accepted = validate_manifest(self.manifest)
        self.assertEqual(len(accepted["features"][0]["tested_by"]), 2)

    def test_feature_links_are_optional(self):
        self.manifest["features"] = []
        self.assertEqual(validate_manifest(self.manifest)["features"], [])

    def test_source_path_must_stay_inside_commit(self):
        test = self.manifest["features"][0]["tested_by"][0]
        for path in ("../secrets.md", "/etc/passwd", "tools/../README.md", ".git/config", "HEAD:README.md"):
            with self.subTest(path=path):
                test["path"] = path
                with self.assertRaisesRegex(ValueError, "source link"):
                    validate_manifest(self.manifest)

    def test_anchor_resolves_to_one_exact_line(self):
        self.assertEqual(locate(["paragraph", "    evidence", "last"], "evidence", "case"), 2)
        for lines in (["no match"], ["evidence", "evidence"]):
            with self.subTest(lines=lines):
                with self.assertRaisesRegex(ValueError, "exactly one match"):
                    locate(lines, "evidence", "case")


class ProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.repo = "sample/example"
        self.source = "a" * 40
        self.head = "b" * 40
        self.expected = {"number": 3, "source_branch": "topic"}
        self.pr = {
            "number": 3, "state": "open", "draft": False, "merged": False,
            "base": {"repo": {"full_name": self.repo}},
            "head": {"repo": {"full_name": self.repo}, "ref": "topic", "sha": self.head},
            "merge_commit_sha": None,
        }
        self.commits = [{"sha": self.source}, {"sha": self.head}]
        self.reviews = []

    def fetch(self, route):
        return {
            "pulls/3": self.pr,
            "pulls/3/commits?per_page=100&page=1": self.commits,
            "pulls/3/reviews?per_page=100&page=1": self.reviews,
        }[route]

    def verify(self):
        return verify_pull_request(self.repo, self.source, self.expected, self.fetch)

    def test_historical_commit_requires_github_membership(self):
        self.assertEqual(self.verify()["source_relation"], "historical PR commit")
        self.commits = [{"sha": self.head}]
        with self.assertRaisesRegex(ValueError, "absent"):
            self.verify()

    def test_unrelated_repository_or_branch_is_rejected(self):
        self.pr["head"]["ref"] = "unrelated"
        with self.assertRaisesRegex(ValueError, "source repository and branch"):
            self.verify()
        self.pr["head"]["ref"] = "topic"
        self.pr["head"]["repo"]["full_name"] = "another/example"
        with self.assertRaisesRegex(ValueError, "source repository and branch"):
            self.verify()

    def test_superseded_and_later_commit_approvals_are_excluded(self):
        self.reviews = [
            {"user": {"id": 1}, "state": "APPROVED", "commit_id": self.source},
            {"user": {"id": 1}, "state": "CHANGES_REQUESTED", "commit_id": self.head},
            {"user": {"id": 2}, "state": "APPROVED", "commit_id": self.head},
            {"user": {"id": 3}, "state": "APPROVED", "commit_id": self.source},
        ]
        self.assertEqual(self.verify()["exact_commit_approvals"], 1)

    def test_merge_sha_is_distinct_from_source_sha(self):
        self.pr.update(state="closed", merged=True, merge_commit_sha="c" * 40)
        outcome = self.verify()
        self.assertEqual(outcome["source_commit"], self.source)
        self.assertEqual(outcome["merge_commit"], "c" * 40)
        self.assertEqual(outcome["pr_state"], "merged")


if __name__ == "__main__":
    unittest.main()
