# Windows launcher contracts

Run this batch in AlderVale's existing public Windows Core job. PowerShell starts the real `Play AlderVale.cmd` entry point and reports five cases tied to the tested checkout.

| Case | Fixture and assertion |
| --- | --- |
| E24-003 | A detached worktree sits under parent folders with spaces. The launcher archives, installs, builds, and probes the real game. Verify exit 0 and a cached client at the tested revision. |
| E24-004 | Independently read Git HEAD and compare its full 40-character SHA to the real smoke run's reported revision. |
| E24-005 | Restrict the child PATH to Windows system tools so the launcher cannot find Node. Expect setup guidance, exit 1 and no game installation. |
| E24-006 | Redirect the launcher's Git fetch to a missing local path. Use a synthetic cached server with a unique health marker to prove that the last working build starts. Check its revision message and saved receipt. |
| E24-007 | Fetch a distinct candidate from a temporary local Git repository while an exclusive loopback listener holds the normal port. Expect the port diagnostic, exit 1, and retention of the previous receipt without fallback. |

The failure cases use temporary directories, fixtures, and child-only environment overrides. The normal-mode fixtures suppress the GUI browser opener and use a small synthetic HTTP server with the same startup endpoints. E24-003 and E24-004 exercise the actual game build and server together. The suite closes child processes and listeners and removes the worktree on completion. A manual Windows playthrough covers browser launch and gameplay.

From the repository root on the hosted Windows runner with PowerShell 7, Git and Node 24:

```powershell
pwsh -NoProfile -File tests/vault/powershell/launcher-contracts.ps1
```
