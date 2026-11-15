---
name: cursor-ops
description: Operate AlderVale Cursor agent v0.0.2. Use when asked what to do next, which checks to run, or how to hand work off.
---

# Cursor operations v0.0.2

1. Call `operatingBrief` before you assign roles, pick work, or write a public reply.
2. Call `validationRecipe` with the branch you are on before you name a test command.
3. Check the private milestone before you choose an issue. If that read fails, say milestone fit is unverified.
4. In public GitHub text, name the source class. Do not name a private page or paste its URL.
5. Recommend one issue. Include the current `main` SHA and say whether a pull request already covers it.
6. If `AGENTS.md` on `main` still says Google AI Studio leads, flag that mismatch.
7. Use a skill only when its file is in the checkout.

## Handoff

```txt
Goal / acceptance criteria:
Base SHA and branch or PR:
Scope:
Checks run, with links:
Checks pending:
Blocked action:
Next action:
```
