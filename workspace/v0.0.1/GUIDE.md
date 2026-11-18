# Adopt the launcher-agent template

## Pin source

Select a real template version and exact source commit. Draft may be adopted only
for development with status clearly marked; approved distribution requires owner
source acceptance. Record repository, branch, version, source path, commit and
SHA-256 for every file in the instruction bundle. Never follow branch HEAD as an
implicit update channel. Template and consumer versions are independent.

## Bind and render

Copy the complete template bundle, validate project bindings against its schema,
and render both instruction/identity files deterministically. Preserve original
template bytes beside rendered output. Reject missing, unknown or unresolved
parameters, altered vendor files and mismatched rendered output. Root consumer
instructions must point to the rendered version; unused files are not adoption.
Never store credentials, personal paths or private Notion URLs as parameters.

## Verify

Read source bytes from the exact Git commit and compare the complete file
inventory/hashes. Verify source and rendered instructions are inside the consumer
version's Graphify inventory. Public CI uses reviewed retained extraction and
actual Graphify MCP readback; it does not run model APIs or adopt tool permissions.
Test valid adoption plus tampered source, wrong hashes, unresolved parameters,
unknown bindings and changed rendered instructions. Keep real host behavior and
native launcher tests as separate evidence.

## Update safely

Prepare an explicit template upgrade with both old/new commits and version
compatibility. Review changed authority, tool scope, data handling and lifecycle
rules before accepting it. Regenerate consumer output/maps and rerun validation.
Do not overwrite consumer custom rules or merge the whole template branch.
