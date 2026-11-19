#!/usr/bin/env python3
"""Prevent the old slow WebKit dependency-install path from returning in GitHub CI."""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def job_block(workflow: str, name: str) -> str | None:
    matches = list(re.finditer(r"(?m)^  " + re.escape(name) + r":\s*$", workflow))
    if len(matches) != 1:
        return None
    body = workflow[matches[0].end():]
    end = re.search(r"(?m)^  [a-zA-Z_][a-zA-Z_0-9-]*:\s*$", body)
    return body[:end.start()] if end else body

def check_webkit_setup(workflow: str, version: str) -> list[str]:
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        return ["Playwright dependency must use a pinned x.y.z version"]
    webkit = job_block(workflow, "browser_webkit")
    if webkit is None:
        return ["Dedicated browser_webkit job missing or ambiguous"]
    problems = []
    if job_block(workflow, "browser_firefox") is None:
        problems.append("Dedicated browser_firefox job missing")
    browser = job_block(workflow, "browser")
    if browser is None or not re.search(r"(?m)^\s*browser:\s*\[\s*chromium\s*\]\s*$", browser):
        problems.append("Chromium matrix must not silently absorb Firefox or WebKit")
    active = re.sub(r"(?m)^\s*#.*$", "", webkit)
    expected = f"mcr.microsoft.com/playwright:v{version}-noble"
    if not re.search(r"(?m)^\s*container:\s*\n\s*image:\s*" + re.escape(expected) + r"\s*$", active):
        problems.append(f"WebKit must use pinned preinstalled container {expected}")
    if not re.search(r"(?m)^\s*runs-on:\s*ubuntu-24\.04\s*$", active):
        problems.append("WebKit must run on standard public ubuntu-24.04 GitHub runner")
    if re.search(r"(?i)\bplaywright\s+install\b|--with-deps\b|\bapt(?:-get)?\s+(?:update|install)\b", active):
        problems.append("WebKit must not install browsers or operating-system dependencies during CI")
    if not re.search(r"(?m)^\s*run:\s*.*npm run test:browser\b[^\n]*--project=webkit\b", active):
        problems.append("WebKit must execute the original Playwright webkit test project")
    if not re.search(r"(?m)^\s*run:\s*.*bun run build\b", active):
        problems.append("WebKit must build the game")
    if not re.search(r"(?m)^\s*run:\s*.*npm ci --prefix tools/ci\b", active):
        problems.append("WebKit must install locked validation tools")
    if not re.search(r"(?m)^\s*BROWSER_OUTCOME:", active) or not re.search(r"(?m)^\s*PLAYWRIGHT_EVIDENCE:", active):
        problems.append("WebKit must retain test outcome and evidence receipts")
    return problems

def main() -> int:
    workflow = ROOT / ".github/workflows/validate.yml"
    package = ROOT / "tools/ci/package.json"
    if not workflow.is_file() or not package.is_file():
        print("WEBKIT SETUP POLICY FAILED: missing workflow or package manifest")
        return 1
    try:
        version = json.loads(package.read_text(encoding="utf-8"))["devDependencies"]["@playwright/test"]
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        print(f"WEBKIT SETUP POLICY FAILED: unreadable Playwright version: {exc}")
        return 1
    errors = check_webkit_setup(workflow.read_text(encoding="utf-8"), version)
    if errors:
        print("WEBKIT SETUP POLICY FAILED")
        for error in errors:
            print(" -", error)
        return 1
    print(f"PASS: WebKit uses preconfigured Playwright v{version}-noble and still runs browser tests")
    return 0

if __name__ == "__main__":
    sys.exit(main())
