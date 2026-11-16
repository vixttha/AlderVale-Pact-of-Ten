# Receipt format

Create a receipt for an issue and verification scope. Use the live GitHub issue for current state.

| Field | What to enter |
| --- | --- |
| Issue and fix | Canonical issue, relevant PR, and its merge state |
| Scope | Exact behavior exercised, test or suite name, and what still needs evidence |
| Revisions | PR base, PR head, actual checkout SHA from the job, and landed SHA if merged |
| Evidence | Run and attempt links, job or regression name, and observed result |
| Disposition | Verified fix, partial coverage, or evidence pending at the time of review |

Use one entry per attempt. Record pass, failure, flaky, skipped, canceled, and missing evidence distinctly. Label separately reported and manually verified checks with their actual source. An unmerged candidate or partial regression uses a plain `Refs #N` reference. Close as fixed after the relevant change is merged and its required checks and regression evidence cover the reported behavior. Omit creator details, private material, and credentials from public receipts.

## Executable CI receipt checks

Run these checks for new or updated CI evidence. The historical Markdown receipts remain readable as written.

```sh
node receipts/validate.mjs "$EXPECTED_CHECKOUT_SHA" required-checks.json receipt.json
```

Set the expected full SHA from the verified checkout this evidence must cover. For a PR, use the actual merge checkout when that is what Actions tested. Derive the required job and regression names from the issue scope and workflow before reading results. Supply those names as a JSON array of unique strings in `required-checks.json`.

Normalize the verified GitHub Actions run and its attempt records into this shape. Use the full checkout SHA recorded by each job, and name any required individual regression separately from its job.

```json
{
  "runId": 43913978673,
  "latestAttempt": 1,
  "attempts": [{
    "number": 1,
    "results": [{
      "name": "Queue, claim and conflict regressions",
      "outcome": "success",
      "checkoutSha": "d032db6c3a78a9378f35bd9fbd0b520a9fcc171c"
    }]
  }]
}
```

Use `success`, `failure`, `skipped`, `cancelled` (or `canceled`), `flaky`, or `missing` for normalized outcomes. Supply the run's actual latest completed attempt number and preserve every attempt from 1 through that number. A required result missing from any attempt blocks validation. If a rerun includes only some jobs, keep its partial record and the original result. An earlier failure followed by a success on the same checkout is reported as flaky, and both outcomes remain visible. A job's green conclusion cannot substitute for a missing required regression result.

Exit status 0 means all required evidence passed on the expected checkout. Status 1 means the receipt was rejected, with problem codes and the affected check and attempt where applicable. Status 2 indicates incorrect CLI arguments or an unreadable or invalid JSON input file. This command evaluates the supplied evidence. Use GitHub Actions logs and run metadata to verify the checkout, attempt history, and test coverage before entering them.
