# AlderVale Test Vault v0.0.2 — first-playable cases

These cases use the existing [Vault case IDs](../public-template/case-catalog.md). The [execution and evidence guide](README.md) links the implemented checks and records gaps.

| Case | Area | Priority | Suggested implementation | Expected outcome |
|---|---|---|---|---|
| G01-001 | Guest onboarding | P0 | Playwright | From the title, start the Academy Journey as a fresh guest, name a wizard, and enter the campus with Rowan visible. |
| G01-002 | Enrollment retry | P0 | Playwright | When the first guest save fails, retain wizard form input and show the failure. Retrying and reloading yields one wizard. |
| G02-001 | Realm and wizard persistence | P0 | Playwright | Create a guest wizard in one realm and reload. The wizard remains selectable there and does not appear in the other realm. |
| G09-001 | Solo duel | P0 | Playwright | As Rowan in Breeze, start the First Spark solo duel, win it, claim victory, and return to the campus. |
| G13-001 | First Spark rewards | P0 | Vitest and Playwright | The controlled Breeze duel reports +388 XP, +273 Florins, and +5 Spell Shards in total. The quest completion and saved rewards survive reload. The Vitest storage regression checks that replay cannot pay the quest a second time. |
| G13-002 | Other campus quests | P0 | Vitest and Playwright | Verify Harmony of the Arbor and Rare Trial payouts for each completion path covered by the approved rules. Track pending behavior and acceptance in GitHub issue #13. |
| G17-001 | Tailor persistence | P1 | Playwright | Claim the Starstitch Brim Hat from the Realm Vault, equip it at the Tailor, and confirm the +10 HP persists after reload. |
| G21-002 | Rowan fallback and retry | P1 | Vitest and Playwright | Failed Rowan model loading leaves the Classic enrollment path usable. The lifecycle suite checks that a user retry can load the model. |
| G28-001 | Guest progress retry | P0 | Playwright | Keep a failed progress save visible. After retry and reload, preserve wizard and realm changes and prevent a second claim. |
| G30-001 | Offline HUD | P0 | Playwright | Show `1 Online` with the fixture connection and `Offline` when it drops. Record failures or retries under issue #10. |
| G34-001 | Narrow viewport | P1 | Playwright | Keep the title and creation controls reachable at the fixture's mobile viewport. Check other HUD controls and zoom separately. |
| G34-002 | WebGL recovery | P0 | Playwright | With WebGL unavailable, show a fallback during enrollment and world entry, keep settings usable, and preserve access after reload. |
| G36-001 | Owner desktop acceptance | P0 | Manual owner playthrough | On a pinned desktop build, complete title, guest creation, entry and movement in one realm, a solo duel, and persistence of the wizard and rewards after reload. |
| E15-001 | Game data integrity | P0 | Vitest | Check unique catalog IDs, valid starter decks, spell and creature references, quest givers and rewards, NPC and spawn data, and Term cosmetics. |
| E24-001 | Browser compatibility | P0 | GitHub Actions and Playwright | Run the guest and Rowan suites in Chromium, Firefox, and WebKit and retain each attempt's results. |
| E24-002 | Core compatibility | P0 | GitHub Actions and Bun | Run the frozen install, lint, unit tests, build, and server integration on Ubuntu, Windows, and macOS. |
| E34-002 | Isolated test services | P0 | GitHub Actions, browser fixtures, and Firestore emulator | Run the guest suite with external hosts blocked and Firestore checks against the `demo-aldervale-ci` emulator. |
