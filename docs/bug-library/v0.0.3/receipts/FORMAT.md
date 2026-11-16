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
