# Aldervale: Pact of Ten — Security Specification & Dirty Dozen TDD

## 1. Data Invariants
1. **Strict Ownership Lock**: Every `/wizards/{wizardId}`, `/wizards/{wizardId}/creatures/{creatureId}`, and `/wizards/{wizardId}/sanctuary/{docId}` write must belong to `request.auth.uid == ownerId`, verified both on the document and parent wizard.
2. **Realm Server Isolation**: `realmId` (`breeze | horizon | everpeak`) is immutable after document creation. Cross-realm transfers or edits are rejected.
3. **PII Isolation**: `/accounts/{uid}` stores private account metadata (`email`) and is readable/writable strictly by `uid == request.auth.uid`. Public wizard inspection reads only `/publicWizards/{wizardId}` which contains zero PII.
4. **Immutable Lineage & Identity**: `ownerId`, `uid`, `realmId`, `createdAt`, and server-computed `ratingSum`/`ratingCount` cannot be spoofed or altered via client privilege escalation.
5. **Terminal Bazaar State Lock**: Once a Bazaar listing enters `sold` or `cancelled`, it cannot transition back to `open` or change `priceFlorins`.
6. **Transactional Server Locks (Orange Team)**: Server-side HTTP/WebSocket resource updates never honor override headers (`X-Internal-Override` ignored/banned), authenticate first (`401`), lock & verify `ownerId` inside a single atomic transaction (`404` on missing or non-owned resources), and filter updates via strict field allowlists.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Wizard Create**: `auth = null` posting a valid Wizard payload to `/wizards/w1`.
2. **Identity Spoofing**: Signed-in user `alice` creates `/wizards/w_spoof` with `ownerId: "bob"`.
3. **Ghost Field Shadow Update**: `alice` updates her own `/wizards/w_alice` injecting `"isAdmin": true`.
4. **Cross-Realm Hopping**: `alice` updates `/wizards/w_alice` attempting to mutate `realmId: "breeze"` -> `"everpeak"`.
5. **Timestamp Forgery**: `alice` creates `/wizards/w_alice` with a backdated `createdAt` instead of `request.time`.
6. **ID Poisoning**: `alice` attempts `setDoc` on `/wizards/${"A".repeat(300)}` exceeding `isValidId` bounds.
7. **PII Leak Attempt**: `bob` attempts `get` on `/accounts/alice`.
8. **Unfiltered List Scraping**: `bob` executes `list` on `/wizards` without `ownerId == bob` constraint.
9. **Orphaned Creature Write**: `bob` creates `/wizards/w_alice/creatures/c1` pretending `ownerId: "bob"`.
10. **Terminal Bazaar Re-open**: `alice` updates a `status: "sold"` listing back to `status: "open"`.
11. **Bazaar Price Manipulation by Buyer**: `bob` buys `alice`'s listing while modifying `priceFlorins: 1`.
12. **Unverified Email Spoof**: Signed-in user with `email_verified: false` attempts a profile or wizard mutation.
