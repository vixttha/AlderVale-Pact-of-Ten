# AlderVale project rules

These are the solo owner's confirmed directions from 2026-11-15. They apply to
AI Studio handoffs, Codex work, plugins, automation, and project documentation.
Later explicit owner instructions can change them; record the change in the
repository and the private Notion project so the two remain consistent.

## 1. Public code, private planning

- Keep `vixttha/AlderVale-Pact-of-Ten` public. This supersedes the earlier request
  to make it private after runner setup. Do not automatically privatize it at the
  end of a task, run, or time window.
- Keep the Notion project home and its documents private. A public GitHub
  repository does not authorize publishing Notion, changing its sharing, or
  moving it into a shared area.
- Publish only project material intended for the public repository. Do not copy
  private Notion content, personal information, credentials, tokens, or secret
  values into commits, issues, artifacts, logs, prompts, or public pages.

## 2. Free project budget

- The target is zero additional project spending. The owner has identified only
  existing ChatGPT.com and Notion subscriptions as paid tools.
- Use capabilities included in those subscriptions and verified free tools or
  allowances. A subscription or a plugin connection is not permission to incur
  API, credit, hosting, storage, or other usage charges.
- Do not buy a subscription, enable billing, add a card, upgrade a tier, use a
  paid model API, start a paid deployment, or consume an unverified trial/credit
  balance without explicit owner authorization.
- Check current provider terms and relevant available account allowance before
  introducing a potentially metered operation. A free tier is usable only within
  its known limits and without automatic paid overage. If the cost cannot be
  established, pause that operation and continue with a free alternative.
- Keep ordinary CI independent of paid AI APIs and production credentials.
  Use demo projects/emulators, fixtures, or offline behavior where appropriate,
  and label what those checks do and do not establish.

## 3. Get maximum useful value from public runners

- Prefer standard GitHub-hosted public-repository runners. Use Linux, Windows,
  and macOS where they reveal compatibility differences, and independent
  browser/server/emulator jobs where they test distinct behavior.
- Run useful jobs in parallel within GitHub's current concurrency and usage
  limits. Add shards, stress tests, or a larger matrix when the project's
  coverage, workload, or measurements justify them. Every job needs a concrete
  project purpose and inspectable output.
- Do not use paid larger/GPU runner labels or expose the local self-hosted runner
  fleet to untrusted public PRs. Local runner provisioning/lifecycle is a
  separate explicitly authorized task.
- Keep finite timeouts, cancellation of superseded runs, minimal token
  permissions, pinned action revisions, locked dependencies, and a bounded
  matrix. Do not add endless loops, automatic rerun storms, or idle jobs.
- Keep logs concise and failure artifacts small, with the current one-day
  retention. Artifact/cache storage has separate limits; verify allowance before
  increasing storage and never treat free public compute as unlimited free
  storage. There is no scheduled workload unless separately requested.
- If the owner later makes the repository private, automatic hosted jobs must
  skip. Do not manually dispatch private-repository jobs until their free
  allowance and lack of paid overage are established or spending is authorized.
- Standard public hosted compute being free does not make external APIs,
  hosting, storage overages, or game backends free. Recheck changing terms.

## 4. Use AI Studio, Codex, and plugins together

- Google AI Studio leads most game features, world/UI design, and visual
  iteration. Codex handles focused supporting implementation, hard bugs, Git,
  CI, tests, profiling, and asset tooling.
- Use installed/connected plugins whenever they materially help the task and
  fit the free-project budget. Prefer purpose-built connected tools to browser
  work when they have the required capabilities. Do not use a plugin merely to
  increase the number of integrations.
- Use GitHub for source code, engineering issues, PRs, Actions results, and
  versioned project rules. Use Notion for private context, roadmap, decisions,
  proposals, and AI Studio/Codex handoffs. Reuse the existing GitHub-synced Notion
  databases instead of creating a competing engineering tracker.
- New account connections, wider permissions, public sharing, purchases, or
  paid plugin operations require specific authorization. Existing authorization
  persists; do not repeatedly ask for routine actions it already covers.
- Do not claim a plugin is connected, a sync exists, or a task has run without
  direct evidence. The existing GitHub database sync is not a CI-to-Notion
  automation; record run receipts explicitly when reporting them in Notion.

## 5. Handoffs and honest completion

1. Select a scoped outcome and acceptance criteria.
2. Save/push the current AI Studio work to GitHub before overlapping Codex edits.
3. Record the base SHA, scope, reproduction steps, and relevant issue/PR.
4. Run proportional checks; inspect failures and repair their cause without
   weakening acceptance criteria just to obtain a green result.
5. Report the resulting SHA, actual validation receipts, and remaining limits.
6. Pull accepted GitHub changes into AI Studio before its next edit.

Keep the project solo unless the owner says otherwise. Do not invent teammates,
independent reviewers, approvals, completed meetings, or delivery dates. Passing
CI is evidence of its tested scenarios, not proof of cloud sign-in, production
security, deployment behavior, gameplay quality, or release acceptance.

## Operating references

- [Validation guide](docs/VALIDATION.md)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Runner security](https://docs.github.com/en/actions/reference/security/secure-use)
- [AI Studio development and GitHub sync](https://aistudio.google.com/docs/aistudio-build-mode)
