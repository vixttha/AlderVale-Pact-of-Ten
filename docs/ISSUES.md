# Launcher issue index

GitHub Issues is canonical. Issues are repository-wide, not branch-local;
each issue names this launcher branch and the audited game SHA.

## Tracking issue

[#143 — public launcher release readiness](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/143)

## Work packages

| Issue | Work | Initial status |
| --- | --- | --- |
| [#144](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/144) | Define the accessible pre-game install, update, repair and play experience | OPEN; no implementation acceptance |
| [#145](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/145) | Validate Electron and Tauri packaging against the real AlderVale runtime on all three OSes | OPEN; no implementation acceptance |
| [#146](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/146) | Design authenticated launcher/game release feeds, repair and safe recovery | OPEN; no implementation acceptance |
| [#147](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/147) | Specify save migration, account handoff and the trusted online-game boundary | OPEN; no implementation acceptance |
| [#148](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/148) | Resolve installer signing, publisher privacy, redistribution rights and release costs | OPEN; no implementation acceptance |
| [#149](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/149) | Establish native installer and real upgrade evidence through Test Vault and public CI | OPEN; no implementation acceptance |
| [#150](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/150) | Define permanent branch ownership and a reviewable path into the main game | OPEN; no implementation acceptance |

Recommended order: product/integration decisions (#144, #150); runtime feasibility
and signing constraints (#145, #148); update and data contracts (#146, #147);
native installed evidence and draft release preparation (#149).
Parallel planning is possible, but no overlapping unclaimed edits or invented
workers. No estimate or delivery date is promised.

## Existing work and dependencies

- [PR #91](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/91): original Windows owner-play launcher, merged.
- [PR #118](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/118): five Windows launcher contracts,
  merged into `AlderVale-Test-Vault`, not proof of adoption on game main.
- [#82](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/82) and
  [open PR #138](https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/138): existing online progression
  authority work. Do not duplicate, close, merge or call it accepted here.
- Open game issues [#16](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/16),
  [#20](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/20) and
  [#21](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/21) are save/economy release dependencies
  to re-evaluate for the chosen online feature scope.

Update status from GitHub, not this initial snapshot. Closing an issue requires
appropriate evidence and the owner's applicable acceptance direction.
