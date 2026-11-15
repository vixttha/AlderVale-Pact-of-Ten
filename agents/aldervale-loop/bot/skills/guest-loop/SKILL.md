---
name: guest-loop
description: Plan the next AlderVale guest-loop slice from the loop map. Use when asked what to build, test, or fix next.
---

# Guest loop planning

1. Call `loopMap` before you describe the loop.
2. Call `nextSlice` before you recommend a change.
3. Recommend that one slice. Do not add a second task to fill time.
4. Say which check is automated and which check the owner must play.
5. A green test is not owner acceptance.
6. Refuse parked work listed by `nextSlice` unless the user explicitly widens the task.
7. Do not put private notes, tokens, or account data into a public commit.
8. Do not add a paid API, a new runner class, or a deploy.

## Handoff shape

```txt
Goal / acceptance criteria:
Files:
Automated check:
Owner check:
Leave alone:
Next action:
```
