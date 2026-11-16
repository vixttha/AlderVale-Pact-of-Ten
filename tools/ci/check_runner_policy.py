#!/usr/bin/env python3
"""Fail closed if any GitHub Actions workflow uses self-hosted or paid runner labels."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[2]
workflows = root / ".github" / "workflows"
errors = []
files = list(workflows.glob("*.yml")) + list(workflows.glob("*.yaml"))
if not files:
    errors.append("No GitHub Actions workflows found")
for file in sorted(files):
    content = file.read_text(encoding="utf-8")
    # Check YAML runner declarations (including inline arrays and expressions).
    # Deliberately reject dynamic expressions to prevent bypassing the allowlist.
    for n, line in enumerate(content.splitlines(), 1):
        if re.match(r"^\s*runs-on\s*:", line):
            value = line.split(":", 1)[1].strip()
            if value == "${{ matrix.os }}":
                matrices = re.findall(r"^\s*os:\s*\[([^\]]+)\]", content, re.MULTILINE)
                candidates = [v.strip() for group in matrices for v in group.split(",")]
                if not candidates or any(not re.fullmatch(r"(ubuntu|windows|macos)-(latest|[0-9]+(?:\.[0-9]+)?)", v) for v in candidates):
                    errors.append(f"{file.relative_to(root)}:{n}: unsafe matrix.os values")
                continue
            if not re.fullmatch(r"(ubuntu|windows|macos)-(latest|[0-9]+(?:\.[0-9]+)?)", value):
                errors.append(f"{file.relative_to(root)}:{n}: unapproved runs-on {value!r}")
    if re.search(r"\bself-hosted\b", content, re.IGNORECASE):
        errors.append(f"{file.relative_to(root)}: forbidden self-hosted reference")
if errors:
    print("RUNNER POLICY FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"PASS: {len(files)} workflow files checked for standard GitHub-hosted runners")
