"""Test Vault regression cases for the public GitHub runner policy."""

from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


POLICY_CHECKER = Path(__file__).resolve().parents[2] / "tools/ci/check_runner_policy.py"


class PublicRunnerPolicyTest(unittest.TestCase):
    def run_checker(self, job_yaml):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            workflows = root / ".github" / "workflows"
            workflows.mkdir(parents=True)
            (workflows / "vault-fixture.yml").write_text(
                f"name: Test Vault fixture\non: push\njobs:\n  check:\n{job_yaml}\n",
                encoding="utf-8",
            )
            checker = root / "tools/ci/check_runner_policy.py"
            checker.parent.mkdir(parents=True)
            shutil.copyfile(POLICY_CHECKER, checker)
            return subprocess.run(
                [sys.executable, str(checker)],
                cwd=root,
                capture_output=True,
                text=True,
                timeout=10,
            )

    def assert_policy_passes(self, job_yaml):
        result = self.run_checker(job_yaml)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("PASS: 1 workflow files checked", result.stdout)

    def assert_policy_fails(self, job_yaml, diagnostic):
        result = self.run_checker(job_yaml)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("RUNNER POLICY FAILED", result.stdout)
        self.assertIn("vault-fixture.yml", result.stdout)
        self.assertIn(diagnostic, result.stdout)

    def test_allows_standard_hosted_runner(self):
        self.assert_policy_passes("    runs-on: ubuntu-latest")

    def test_allows_standard_os_matrix(self):
        self.assert_policy_passes(
            "    strategy:\n"
            "      matrix:\n"
            "        os: [ubuntu-latest, windows-latest, macos-latest]\n"
            "    runs-on: ${{ matrix.os }}"
        )

    def test_rejects_self_hosted_runner(self):
        self.assert_policy_fails(
            "    runs-on: self-hosted", "forbidden self-hosted reference"
        )

    def test_rejects_nonstandard_runner_label(self):
        self.assert_policy_fails(
            "    runs-on: ubuntu-24.04-16core", "unapproved runs-on"
        )
