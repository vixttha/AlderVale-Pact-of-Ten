import contextlib
import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError

import jules_audit as audit


REPO = "vixttha/AlderVale-Pact-of-Ten"
SOURCE = {"name": "sources/github-target", "githubRepo": {
    "owner": "vixttha", "repo": "AlderVale-Pact-of-Ten"}}
LINK = "https://jules.google.com/session/123456"


class AuditTests(unittest.TestCase):
    def test_github_repository_identity_is_case_insensitive(self):
        source = {**SOURCE, "githubRepo": {"owner": "Vixttha", "repo": "aldervale-pact-of-ten"}}
        with patch.object(audit, "request_json", return_value={"sources": [source]}):
            self.assertEqual(audit.find_source("test-key", REPO), source["name"])

    def test_documented_slash_delimited_source(self):
        source = {**SOURCE, "name": "sources/github/vixttha/AlderVale-Pact-of-Ten"}
        with patch.object(audit, "request_json", return_value={"sources": [source]}):
            self.assertEqual(audit.find_source("test-key", REPO), source["name"])

    def test_documented_session_name_without_url(self):
        with patch.object(audit, "find_source", return_value=SOURCE["name"]), patch.object(
                audit, "request_json", return_value={"name": "sessions/123456"}):
            self.assertEqual(audit.submit_audit("test-key", REPO, "a" * 40), LINK)

    def test_source_pagination_and_exact_match(self):
        with patch.object(audit, "request_json", side_effect=[
            {"sources": [{"name": "sources/wrong", "githubRepo": {
                "owner": "other", "repo": "AlderVale-Pact-of-Ten"}}],
             "nextPageToken": "second page"}, {"sources": [SOURCE]}]) as request:
            self.assertEqual(audit.find_source("test-key", REPO), SOURCE["name"])
            self.assertIn("pageToken=second+page", request.call_args.args[0])

    def test_missing_source_stops(self):
        with patch.object(audit, "request_json", return_value={}):
            with self.assertRaisesRegex(audit.AuditError, "Connect"):
                audit.find_source("test-key", REPO)

    def test_invalid_source_name_stops_before_post(self):
        with patch.object(audit, "request_json", return_value={
            "sources": [{**SOURCE, "name": "https://evil.example"}]}):
            with self.assertRaises(audit.AuditError):
                audit.find_source("test-key", REPO)

    def test_request_is_findings_only_and_links_are_validated(self):
        with patch.object(audit, "find_source", return_value=SOURCE["name"]), patch.object(audit, "request_json", return_value={"url": LINK}) as request:
            self.assertEqual(audit.submit_audit("test-key", REPO, "a" * 40), LINK)
            body = request.call_args.args[2]
            self.assertFalse(body["requirePlanApproval"])
            self.assertNotIn("automationMode", body)
            self.assertEqual(body["sourceContext"]["githubRepoContext"]["startingBranch"], "main")
            self.assertIn("Do not modify", body["prompt"])
            self.assertIn("a" * 40, body["prompt"])

    def test_malicious_or_missing_session_url_rejected(self):
        for url in (None, "https://evil.example/", LINK + "\nsecret", LINK + "?key=bad"):
            with self.subTest(url=url), patch.object(audit, "find_source", return_value=SOURCE["name"]), patch.object(
                    audit, "request_json", return_value={"url": url}):
                with self.assertRaises(audit.AuditError):
                    audit.submit_audit("test-key", REPO, "a" * 40)

    def test_http_error_does_not_echo_secret_or_retry(self):
        error = HTTPError("https://example.invalid", 401, "test-key", {}, io.BytesIO(b"test-key"))
        with patch.object(audit.OPENER, "open", side_effect=error) as request:
            with self.assertRaises(audit.AuditError) as raised:
                audit.request_json("sessions", "test-key", {"prompt": "audit"})
            self.assertNotIn("test-key", str(raised.exception))
            self.assertIn("401", str(raised.exception))
            self.assertEqual(request.call_count, 1)

    def test_network_failure_is_sanitized_and_not_retried(self):
        with patch.object(audit.OPENER, "open", side_effect=URLError("test-key")) as request:
            with self.assertRaises(audit.AuditError) as raised:
                audit.request_json("sessions", "test-key", {})
            self.assertNotIn("test-key", str(raised.exception))
            self.assertEqual(request.call_count, 1)

    def test_redirects_are_disabled(self):
        self.assertIsNone(audit.NoRedirect().redirect_request(None, None, 302, "", {}, "https://evil.example"))

    def test_missing_key_never_calls_api(self):
        output = io.StringIO()
        with patch.dict(os.environ, {"GOOGLE_JULES_API_KEY": ""}), patch.object(
                audit, "submit_audit") as submit, contextlib.redirect_stdout(output):
            self.assertEqual(audit.main(), 1)
            submit.assert_not_called()

    def test_summary_states_submission_not_completion(self):
        with tempfile.TemporaryDirectory() as folder:
            summary = Path(folder) / "summary.md"
            with patch.dict(os.environ, {
                "GOOGLE_JULES_API_KEY": "test-key", "GITHUB_REPOSITORY": REPO,
                "GITHUB_SHA": "a" * 40, "GITHUB_STEP_SUMMARY": str(summary)}), patch.object(
                    audit, "submit_audit", return_value=LINK), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(audit.main(), 0)
            text = summary.read_text()
            self.assertIn(LINK, text)
            self.assertIn("not an audit pass", text)
            self.assertNotIn("test-key", text)


if __name__ == "__main__":
    unittest.main()
