# Bug Library v0.0.4 — Acceptance Plan

Version 0.0.4 is not accepted by documentation completion alone. Each gate needs an inspectable result and the owner makes the final acceptance decision.

| Gate | Required result | Evidence / disposition |
| --- | --- | --- |
| A. Version foundation | Dedicated branch, project charter, architecture, workflow, acceptance contract; v0.0.2/v0.0.3 preserved | Branch commit and file review |
| B. Intake and triage | Duplicate-search protocol and complete triage schema; test against known issues without creating duplicates | Issue search links and triage examples |
| C. Investigation safety | Main-SHA pinning, repository instructions, overlap checks, milestone-fit handling, and cost/privacy gates | Reproducible dry-run checklist |
| D. Evidence receipts | Base/head/tested/merged SHAs and per-job results captured distinctly; missing evidence never passes | Unit fixtures for summary/receipt parsing and an Actions run |
| E. Lifecycle enforcement | Partial coverage remains open; fixed requires merged fix + required CI + regression coverage | Dry-run against #13 and #35 |
| F. Cross-tool handoff | Notion updated from verified GitHub receipts; no false claim of automatic CI sync | Private handoff readback |
| G. Audit workflow | On-request Color Team OPS review can be invoked and its result recorded accurately | Actual bounded audit receipt; otherwise pending |
| H. Operational acceptance | Fresh-session walkthrough of intake → triage → investigation → candidate → evidence → owner decision | Recorded walkthrough and owner review |

## Required regression fixtures

- **#35 — verified merged fix:** ensure a receipt records both hosted attempts and distinguishes emulator-backed sign-in from production Google sign-in.
- **#13 — partial coverage:** ensure First Spark PASS does not close the issue while Arbor and Rare Trial reward paths remain unverified.
- **Missing evidence:** a browser report with no matching First Spark test must produce “Evidence missing or ambiguous,” never “Passed.”
- **Flaky / skipped / canceled:** each outcome remains distinct and does not satisfy a fixed gate.
- **Wrong checkout:** a receipt whose tested SHA does not match the candidate cannot be attached to that candidate as a PASS.
- **Duplicate intake:** matching open or closed issue is linked/reused; no duplicate issue is created.

## Explicit non-goals

- No new bug database or duplicate Notion issue tracker.
- No autonomous bug closure, merge, release, or unattended issue creation.
- No always-on service, scheduled agent, webhook, CI-to-Notion automation, or remote MCP backend.
- No paid API, hosting, model, larger runner, storage expansion, or external metered service.
- No production Firebase credentials or live player data in CI.
- No claim that CI proves production login, gameplay quality, multiplayer security, or release readiness.

## Acceptance record

- Current state: project foundation only; not accepted.
- Tracking issue: [#65](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/65).
- Version branch baseline: `46c504ffdbd343df825398c403d3a0417acb9e82`.
- Milestone fit: unverified for the broader implementation; active Notion milestone currently targets the guest first-playable loop.
- Owner acceptance: pending.
