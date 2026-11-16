# Fresh-session retrieval evidence — v0.0.4

## Test protocol

A separate Notion agent session was started with a read-only request. It was asked to open the private AlderVale project context, active milestone, latest coordinator handoff and Bug Watch dashboard, then independently read the public repository instructions at the pinned main SHA and the v0.0.4 candidate.

## Results

| Source | Result | Evidence classification |
| --- | --- | --- |
| Root \`AGENTS.md\` at current main | PASS | Retrieved from GitHub at \`a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd\` |
| \`PROJECT_RULES.md\` at current main | PASS | Retrieved from GitHub at the same SHA |
| \`docs/AGENT_OPERATIONS.md\` at current main | PASS | Retrieved from GitHub at the same SHA |
| \`docs/VALIDATION.md\` and \`docs/PUBLIC_RUNNER_POLICY.md\` | PASS | Retrieved from GitHub at the same SHA |
| v0.0.4 architecture and entry-point documents | PASS | Retrieved from the candidate commit during the reviewer session |
| Private Notion project home, milestone, coordinator handoff and Bug Watch dashboard | FAIL / unavailable | Fresh session did not obtain page content; access is not inferred from the supplied starting link |
| Second fresh-session retrieval | NOT VERIFIED | Session result could not be retrieved; no PASS is claimed |

## Findings

- A fresh session could retrieve the public repository rules and v0.0.4 documents.
- Private Notion retrieval did not pass. **Milestone fit unverified.**
- The public entry point must continue to state that Notion access is a separate capability and that unavailable private context is never silently replaced with guesses.
- No Notion permissions, connections or sharing settings were changed as part of this test.

## Acceptance

Fresh-session public GitHub retrieval: partial pass. Full cross-system retrieval and owner walkthrough remain pending. This is not owner acceptance.
