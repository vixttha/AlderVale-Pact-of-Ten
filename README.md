# AlderVale: Pact of Ten

A 3D fantasy RPG set at a spellcasting academy on floating islands. Create a wizard, explore the campus, and build a deck for turn-based spell duels.

**Status:** First playable in development. Start with the guest journey in Breeze.

[Run locally](#run-locally) · [First playthrough](#first-playthrough) · [Validation](#validation) · [Report a bug](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues)

## Run locally

You’ll need Node.js **24.12.0 or later**, Bun **1.4.4**, and a browser with **WebGL 2** enabled.

```bash
git clone https://github.com/vixttha/AlderVale-Pact-of-Ten.git
cd AlderVale-Pact-of-Ten
bun install --frozen-lockfile
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Guest play works without signing into Google or setting a Gemini API key. Guest saves live in your browser. Use the same browser profile and URL to resume.

## First playthrough

1. Choose **Breeze** and create a Human wizard with the **Rowan** appearance. Select **Begin Academy Journey**.
2. On campus, open **Duel** and win a solo match. Select **Claim Rewards & Return**.
3. Check **Active Saga Quest** for **First Spark in the Ring** marked **Completed**.
4. Reload, select the same wizard, and return to campus. Check that the quest and rewards are still there.

## Validation

Run `bun run validate:core` for the type check, rules lint, tests, production build, and HTTP/WebSocket checks. GitHub Actions also runs browser and Firestore emulator tests.

| What you want to check | Where to look |
| --- | --- |
| Build and test commands | [Validation guide](docs/VALIDATION.md) |
| Player journeys and regression coverage | [Test Vault](docs/test-vault/README.md) |
| Results for a specific commit | [GitHub Actions](https://github.com/vixttha/AlderVale-Pact-of-Ten/actions) |

## Report a bug

Search [GitHub Issues](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues) first. Include the commit or build, browser and operating system, realm, and steps to reproduce. Describe what you expected and what happened.
