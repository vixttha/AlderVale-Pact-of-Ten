# AlderVale public-repository runner policy

**Owner decision:** `vixttha/AlderVale-Pact-of-Ten` remains public unless the owner explicitly authorizes a visibility change. Use only standard GitHub-hosted runner labels, such as `ubuntu-latest`, `windows-latest`, and `macos-latest`. Never require the owner's PC, local agents, self-hosted runner registration, paid larger runners, or GPU runners for ordinary CI.

This rule is already present in `PROJECT_RULES.md` and `AGENTS.md`. The new policy workflow checks all workflow files on pull requests and on pushes to main, and refuses to pass if repository visibility is private.

**Defense in depth:** configure a GitHub branch ruleset on `main` requiring the `policy` status check and preventing bypass or unreviewed changes to this policy and its workflow. Repository settings cannot be guaranteed solely by a checked-in file; visibility and rulesets are owner-controlled settings. If the policy workflow is deleted, a required check in branch protection is the independent enforcement layer.

Do not confuse free standard hosted compute on a public repository with unlimited artifact storage, paid services, or external API usage. No merge or release is authorized by this document.
