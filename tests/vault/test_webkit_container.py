"""Negative-path regression tests for the public WebKit container contract."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "tools/ci/check_webkit_container.py"
spec = importlib.util.spec_from_file_location("webkit_guard", SOURCE)
module = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(module)
BASE = (ROOT / ".github/workflows/validate.yml").read_text(encoding="utf-8")
VER = "1.65.1"

class WebkitContainerPolicyTest(unittest.TestCase):
    def must_fail(self, value, reason):
        errors = module.check_webkit_setup(value, VER)
        self.assertTrue(any(reason in item for item in errors), errors)

    def test_current_public_container_passes(self):
        self.assertEqual(module.check_webkit_setup(BASE, VER), [])

    def test_rejects_slow_dependency_install(self):
        self.must_fail(BASE.replace(
            "run: xvfb-run --auto-servernum npm run test:browser -- --project=webkit",
            "run: npx playwright install --with-deps webkit && xvfb-run --auto-servernum npm run test:browser -- --project=webkit",
        ), "must not install")

    def test_rejects_apt_package_install(self):
        self.must_fail(BASE.replace(
            "run: xvfb-run --auto-servernum npm run test:browser -- --project=webkit",
            "run: apt-get update && xvfb-run --auto-servernum npm run test:browser -- --project=webkit",
        ), "must not install")

    def test_rejects_container_latest(self):
        self.must_fail(BASE.replace(
            "image: mcr.microsoft.com/playwright:v1.65.1-noble",
            "image: mcr.microsoft.com/playwright:latest",
        ), "must use pinned")

    def test_rejects_mismatched_playwright_version(self):
        self.assertTrue(module.check_webkit_setup(BASE, "1.65.2"))

    def test_rejects_missing_webkit_job(self):
        self.must_fail(BASE.replace("  browser_webkit:", "  webkit_deleted:"),
                       "browser_webkit job missing")

    def test_rejects_commented_image(self):
        self.must_fail(BASE.replace(
            "image: mcr.microsoft.com/playwright:v1.65.1-noble",
            "# image: mcr.microsoft.com/playwright:v1.65.1-noble",
        ), "must use pinned")

    def test_rejects_webkit_in_plain_matrix(self):
        self.must_fail(BASE.replace(
            "browser: [chromium]", "browser: [chromium, firefox, webkit]"
        ), "must not silently absorb")

    def test_rejects_webkit_test_removed(self):
        self.must_fail(BASE.replace(
            "--project=webkit --headed", "--project=chromium --headed"
        ), "must execute")

    def test_rejects_evidence_removed(self):
        self.must_fail(BASE.replace(
            "          BROWSER_OUTCOME:", "          STATUS_DISABLED:"
        ), "must retain test outcome")

    def test_rejects_unpinned_dependency_version(self):
        self.assertTrue(module.check_webkit_setup(BASE, "^1.65.1"))

if __name__ == "__main__":
    unittest.main()
