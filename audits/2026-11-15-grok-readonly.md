# Read-only audit — 2026-11-15

| | |
| --- | --- |
| Repo | [vixttha/AlderVale-Pact-of-Ten](https://github.com/vixttha/AlderVale-Pact-of-Ten) |
| Branch read | `main` |
| Commit | `5403de5bc02759afbd19d9208e9ba4d38201c400` |
| Scope | Static read of source, Firestore rules, server, shared combat/economy, and CI. Not a playtest, not a dependency CVE scan, not a production pentest. CI was not re-run. |
| Method | Read only. No files on `main` were changed. |

Aldervale is a Vite + React + Three.js academy RPG with Firebase Auth/Firestore for cloud saves and an Express + `ws` process for bazaar, houses, tours, the Archivist, and live presence/duels/trade. Guest play is `localStorage`. Signed-in progress is written by the browser.

`docs/VALIDATION.md` already says guest browser tests do not prove Google sign-in, authenticated WebSocket identity, or atomic inventory/currency settlement. This audit confirms those limits are real in the code, not just untested.

## What is in good shape

- Firestore starts closed. `firestore.rules` default-denies `/{document=**}`, then opens specific paths.
- Wizard, creature, sanctuary, and account writes require `request.auth.uid` ownership. `realmId`, `ownerId`, and `createdAt` cannot be rewritten. `createdAt` / `updatedAt` must be `request.time`. Document ids are length- and charset-bounded.
- `/accounts/{uid}` is not readable by other users. `/publicWizards` is the public projection and does not include email.
- Listing `/wizards` requires `ownerId == request.auth.uid`, so an unfiltered scrape fails the rules.
- Bazaar **rules** (not the live HTTP store) reject reopening a sold/cancelled listing and reject a buyer changing `priceFlorins`. Email verification is required for Firestore writes.
- `PATCH /api/resources/:id` authenticates first, ignores override headers, returns 404 for missing or non-owned rows, and allowlists `titleBadge`, `motto`, `isPublic`. Covered by `tests/security_combat.test.ts`.
- Firebase ID token check in `server/authVerify.ts` requires `RS256`, `aud`, `iss`, `exp`, and a Google x509 signature. `.env*` is gitignored. `.env.example` has placeholders only.
- Actions are pinned by SHA, `permissions: contents: read`, `persist-credentials: false`, Bun `--frozen-lockfile`, and jobs skip when the repo is private unless someone dispatches them.
- Zone chat is stored in React state, not `innerHTML`. The `innerHTML = ''` calls in `worldViewport.tsx` only clear nameplate nodes.

## High

### 1. Live multiplayer does not authenticate the player

`server/wsHub.ts` accepts any socket on `/ws` and trusts the JSON body.

- `join_world` (around line 196) copies the client's `presence`, including `ownerId`, `wizardId`, `name`, `level`, and `rank`. No Firebase token is checked.
- During the 30s duel reconnect window, a new `join_world` with the same `realmId` + `wizardId` clears the forfeit timer and rebinds `part.sessionId` to the newcomer (lines 200–214). `wizardId` is broadcast on chat (`senderWizardId`), so this is guessable, not secret.
- `update_appearance` (line 240) spreads the client patch over presence and only pins `sessionId`, `wizardId`, and `realmId`. A client can change displayed `ownerId`, `level`, `name`, and `zone` for everyone in the zone.
- `duel_action` (line 441) does `pendingActions.set(act.actorId, act)` with no check that `actorId` is this socket's wizard. A duel participant can file the opponent's turn.
- `ownerId` (the Firebase uid) is part of `LivePlayerPresence` and is broadcast on `player_joined`.

There is also no `maxPayload` and no per-socket rate limit. `ws` defaults to a very large frame.

### 2. Cloud saves let the owner write the whole progression

`firestore.rules` wizard `update` (lines 226–237) allows the owner to change `level`, `xp`, `rank`, `currencies`, `resources`, and `progression` in one write. Bounds are coarse (`level` 1–50, `xp` up to 10_000_000, `rank` 1–20). `currencies`, `resources`, `progression`, `sculpt`, `wardrobe`, and `stitching` are untyped maps with no size cap.

`src/lib/storage.ts` `saveCloudWizard` writes those fields from the browser. The same pattern exists for realm `termXp`, `unlockedRaces`, `sharedVault`, and `claimedTermTiers` (rules lines 205–214).

Shops, fishing, harvesting, and duel rewards all mutate the wizard in the client and then save it (`src/App.tsx` `handleDuelFinished` around line 598, fishing around line 582, `AcademyModalHub.tsx` purchases). A modified client, or a direct Firestore write as the signed-in user, can set currencies and rank without playing. Guest `localStorage` is expected to be editable. Cloud saves currently are too.

This matches security spec invariant 4 only for `ratingSum` on **update**. It does not match "everything is earned" for florins, rank, or term rewards.

### 3. Archivist endpoint can spend the Gemini key with no caller check

`POST /api/academy/strategize` (`server.ts` lines 165–172) does not require a Firebase token, does not cap body size beyond the global 512kb JSON limit, and does not cap `goal` length. `server/lecternAi.ts` concatenates that goal into a prompt and, when `GEMINI_API_KEY` is set, calls `gemini-4-hydrogen` with `ThinkingLevel.HIGH`.

The deck UI calls this with no `Authorization` header (`DeckLecternPanel.tsx` around line 57). Offline, the handler returns a canned note. With a key configured, anyone who can reach the server can burn that key. That conflicts with the free-project rule in `PROJECT_RULES.md` (no unapproved metered API).

### 4. Bazaar and trade do not settle on the server

Two different bazaars exist:

- Firestore rules under `/bazaar/{realm}/listings` enforce seller, price, and terminal status. The game UI does not use them.
- The UI uses the in-memory maps in `server/authzStore.ts` via `server.ts`.

HTTP list (`server.ts` lines 51–83) does not check that the seller owns `itemId`, and does not remove the item. The client always sends `itemId: 'hat_pointed_brim'` (`AcademyModalHub.tsx` around line 178) while the displayed name is free text.

HTTP buy (lines 85–99) flips `status` to `sold` after auth. It does not debit florins, pay the seller, or grant the item. The browser debits itself only if it came through the UI (`AcademyModalHub.tsx` lines 190–205). A direct `POST` marks the listing sold without paying. `verifyFirebaseBearerToken` is `await`ed before the status check, so two overlapping buys can both observe `open`.

Memory is wiped on process restart. Firestore listings and HTTP listings are not the same data.

Trade (`wsHub.ts` lines 474–511) accepts any non-negative florin number, does not look up a balance, and on confirm sends `deltaFlorins` to the clients. `App.tsx` (around line 450) adds that delta locally and the cloud save will persist it. Offering more florins than you hold still completes.

## Medium

### 5. HTTP routes do not enforce the email-verified rule

`security_spec.md` dirty dozen #12 says an unverified email must not mutate profile or wizard state. Firestore rules do check `email_verified`. `verifyFirebaseBearerToken` returns `emailVerified` and then every caller ignores it (`server.ts` bazaar, houses, tours). WebSocket traffic never reaches this function.

### 6. Sanctuary ratings can be chosen at create time

Spec invariant 4 says `ratingSum` / `ratingCount` are server-computed. `isValidSanctuary` allows both on the document, and create does not force them to a server value (rules lines 113–124 and 269–276). Update correctly omits them from the allowlist, so the spoof is create-only.

### 7. The tested resource lock is not the save path

`TransactionalResourceStore` is careful, and tests hit it. Nothing in `src/` calls `PATCH /api/resources/:id`. Wizard saves go straight to Firestore as the user. The orange-team tests do not protect florins, duels, or the bazaar.

### 8. `npm start` and `npm install` do not match the documented toolchain

- `package.json` `"start": "node server.ts"` will not run TypeScript on plain Node. `dev` uses `tsx`. CI uses Bun.
- `"esbuild": "^0.25.0"` conflicts with Vite 8's optional `esbuild` peer. Already filed as issue #5. `bun install` works; `npm install` does not.
- `package.json` `name` is still `react-example`.

### 9. Title screen has no WebGL failure boundary

`src/engine/avatarPreview3d.tsx` line 20 constructs `THREE.WebGLRenderer` with no try/catch. There is no React error boundary under `src/`. A missing WebGL context unmounts `#root`. Same pattern in `worldViewport.tsx`. Already filed as issue #4.

## Low

- `firebase-applet-config.json` commits the web SDK config, including the client API key. That key is meant to ship in a browser app, but the repo is public, so it should be restricted by HTTP referrer and to the Firebase APIs you actually use. Do not treat it as a server secret, and do not add a service-account JSON beside it.
- `index.html` loads Google Fonts with no integrity pin and no Content-Security-Policy. The server sets no security headers.
- `public/models/*.glb` is about 23MB in git. Fine for a prototype, expensive if those files churn.
- Realm chat is capped at 180 characters and not rate-limited, so one socket can flood a realm.
- Token cert cache in `authVerify.ts` is a fixed 1 hour and does not read Google's `Cache-Control`.
- `publicWizards.level` / `rank` are not required to match `/wizards/{id}`.

## Already open, not re-filed

| Issue | What |
| --- | --- |
| #4 | Blank app when WebGL context creation throws |
| #5 | `npm install` ERESOLVE on esbuild vs Vite 8 |
| #2 | AI team workflow (process, not a defect) |
| #3 | Glitchwarden audit log |

## Suggested order if someone fixes these later

Not done on this branch.

1. Require a verified Firebase token on `/ws` before `join_world`, and bind `wizardId` / `ownerId` to that uid. Reject `duel_action` unless `actorId` is that wizard.
2. Stop trusting client currency, xp, rank, and term claims. Either move grants to the server or store them in fields the client cannot write.
3. Put florin debit, item remove, item grant, and seller credit in one bazaar transaction. Point the UI at that path only.
4. Auth and rate-limit `/api/academy/strategize`, or keep it on the offline note until a spend cap exists.
5. Add an error boundary around the 3D previews (issue #4) and align `esbuild` (issue #5).

## What this audit did not establish

No browser playtest, no Firestore emulator run, no `bun test`, no production Firebase project inspection, no secret-scanning alert pull, and no claim that CI is green on this SHA. Passing the existing suite would still not prove cloud sign-in or a cheat-resistant economy. That limit is already written in `docs/VALIDATION.md`.
