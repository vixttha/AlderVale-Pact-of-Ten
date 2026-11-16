# AlderVale: Pact of Ten

**A spellcasting academy among floating islands.**

Create a wizard, explore a 3D campus, and build a deck for turn-based duels. The first playable lets you take Rowan into Breeze, win a solo skirmish, and keep your First Spark rewards after a reload.

[Quick start](#quick-start) · [Choose a realm](#choose-a-realm) · [First Spark](#first-spark) · [Troubleshooting](#troubleshooting) · [Development](#development)

## Quick start

**In development · Local guest play**

You’ll need Git, Node.js **24.12.0 or newer**, and Bun **1.4.4**. Clone the repository from GitHub’s **Code** menu, then run these commands from the cloned directory.

```bash
bun install --frozen-lockfile
bun run dev
```

Keep the terminal open and visit [localhost:3000](http://localhost:3000) in a WebGL 2-capable browser. Guest play requires neither a Google sign-in nor an API key.

## Choose a realm

| Realm | Progression pace |
| --- | --- |
| **Breeze** | Fast path. Start here for First Spark. |
| **Horizon** | Balanced progression. |
| **Everpeak** | Classic progression. |

## First Spark

1. **Create your wizard.** Choose **Breeze**, enter a name, select **Human** with the **Rowan** appearance, and choose **Begin Academy Journey**.
2. **Enter a solo duel.** Open **Duel**, then select **Frost** under **Solo Academy Skirmishes**. Use **Cast Turn** with a spell you can afford, or **Pass (+Gain Pip)** to build pips.
3. **Claim your rewards.** After a win, select **Claim Rewards & Return**. Check **Active Saga Quest** for **First Spark in the Ring** marked **Completed**.
4. **Resume after reload.** Reopen the same wizard in Breeze with **Enter Aldervale**. Check the quest and confirm your Florin and Spell Shard totals match.

## Troubleshooting

- **3D world unavailable.** Use **Retry 3D**. The wizard and menus stay available.
- **Guest progress could not be saved.** Allow browser site storage and select **Retry save** before reloading or closing the tab.
- **Wizard missing after reload.** Use the same browser profile, address, and realm. Clearing site data removes local guest saves.

## Development

Run `bun run validate:core` for type checking, rules lint, tests, the production build, and HTTP and WebSocket checks. Public CI also exercises the guest journey in Chromium, Firefox, and WebKit and runs Firestore emulator tests.

- [Validation guide](docs/VALIDATION.md)
- [Test Vault](docs/test-vault/README.md)
- Open the repository’s **Issues** tab to report a bug. Include the commit or build, browser and operating system, realm, and the steps that reproduce it.
