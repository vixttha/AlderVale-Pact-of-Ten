# Realm services

Install with `bun install --frozen-lockfile` or `npm ci` using Node 24.12 or newer. Run `npm run dev` for the game, and `npm run build` followed by `NODE_ENV=production npm start` for the production server.

The server uses Firebase Application Default Credentials for Bazaar, trades, houses, Dorm tours, and shared duel rewards. The service account must be able to read and write the same Firestore database used by the browser. The bundled app config supplies the default project and database. When overriding the database, use the same value for `FIRESTORE_DATABASE_ID` on the server and `VITE_FIRESTORE_DATABASE_ID` at build time. Install `firestore.rules` on that database when releasing the change. The app serves guest play without Firestore credentials. Cloud operations return an error if the service cannot reach Firestore.

Bazaar Florins, Honor Marks, Bonding Seals, and market gear are account-wide within a realm and stored under `worldRealms`. Each account starts with 220 Bazaar Florins per realm. Existing wizard Florins and gear remain in their saves for Academy shops and solo progression. Old wizard balances do not fund shared trading because those balances were player-controlled. Bazaar gear appears in Tailor and can be returned from escrow by canceling the listing. Shared duel rewards require Google sign-in, with guest matches available for practice. The current live matchmaker uses a single server instance.

For rule and transaction tests, use a demo Firestore emulator with no real player data:

```sh
GOOGLE_CLOUD_PROJECT=demo-aldervale-audit FIRESTORE_DATABASE_ID='(default)' \
  npx firebase-tools emulators:exec --only firestore --project demo-aldervale-audit 'npm test'
```

## Academy Houses

House data is stored in `worldRealms/{realmId}/clubs`. Each account can found or join
one player-created House per realm. Leaving changes membership immediately and
removes an empty House. The seeded academy House is a directory entry. The API
publishes member counts and keeps membership account IDs server-side. Existing
House member lists remain readable and are checked before allowing a join or creation.

The root `bazaar` and `houses` Firestore paths are legacy read-only paths. New
listings, clubs, and membership writes go through the server-backed `worldRealms`
paths documented in `firebase-blueprint.json`.

A production smoke test still needs verified Google sign-in, the configured Firestore database, and both browser and backend access to that database.
