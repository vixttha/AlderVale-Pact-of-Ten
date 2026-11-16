# Public Memory Record Schema

Use this schema only for records approved for this public repository. Private Notion records use Notion's own schema and must not be exported here.

## Required fields

| Field | Meaning |
| --- | --- |
| `id` | Stable, non-personal record identifier |
| `kind` | `project-fact`, `public-decision`, or `procedure` |
| `status` | `current`, `superseded`, or `unverified` |
| `statement` | Concise public-safe fact or decision |
| `source_type` | Public GitHub source, or “owner-approved public summary” |
| `source_url` | Public URL only; omit for private sources |
| `source_sha` | Exact commit SHA when source is commit-dependent |
| `verified_at` | ISO-8601 timestamp |
| `review_after` | Date to recheck a fact that can go stale |
| `supersedes` | Earlier public record ID, if applicable |

## Record template

```yaml
id: AV-PUBLIC-0001
kind: project-fact
status: current
statement: "Public-safe statement only."
source_type: "GitHub file"
source_url: "https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/<sha>/<path>"
source_sha: "<full-commit-sha>"
verified_at: "YYYY-MM-DDTHH:MM:SSZ"
review_after: "YYYY-MM-DD"
supersedes: null
```

## Prohibited fields and content

Do not add personal names, private contact details, private Notion page titles or URLs, private page IDs, private milestone details, copied chat messages, credentials, tokens, or private agent-memory exports. Do not use a private Notion URL as a source URL. If a public decision is approved from a private discussion, store only the approved public summary and identify its source as an owner-approved public summary.
