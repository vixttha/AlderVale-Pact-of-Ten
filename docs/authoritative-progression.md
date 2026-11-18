# Authoritative signed-in progression

Tracking issue [#82](https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/82).

## Server writes

| Surface | Server responsibility |
| --- | --- |
| Enrollment | Validate name, lineage unlock, catalog, appearance, and realm slot. Atomically create the wizard, starter creature, Dorm, public profile and realm enrollment. |
| Solo and Term | Keep the duel and round revision private, adjudicate turns, issue one settlement, update XP and derived rank, award eligible quests and hatches, and record one payout per Term tier. |
| Academy and Tailor | Resolve prices, costs, catalog ownership, available inventory, daily claims, vault edits, cosmetic validation, mounting, and gear. Vault deposits retain the existing copy behavior and the 60-entry bound. Combat recalculates equipped Bazaar ownership when a solo duel starts. |
| Deck and Arbor | Check owned spells, rank, slots, costs, creature ownership, species, egg parents, and branches. The server opens Rune-Catch attempts, judges the timing, and grants Bond XP, evolution or talents. |
| Dorm and campus | Validate furniture and Dorm edits, make gardens mature on the server clock, and settle harvests atomically. Campus interactions check the signed-in session's observed zone and proximity against known nodes, and use private cooldowns. |
| Live combat | Require the server-enrolled wizard and selected creature, verify their owner/wizard/realm, and resolve creature stats from the catalog and stored progression. Public wizard rank and title come from the server. |
| Personal data | Account settings and private gallery paintings stay owner-editable. They carry no reward or roster authority. |

The browser submits an explicit action and UUID. The gameplay transaction reads the
current wizard, realm, roster, and relevant server state. It calculates the delta and
writes it with a receipt. Retransmitting the same action ID does not issue the
reward again. Firestore denies gameplay document writes from browser clients and
keeps internal progression, turns, cooldowns, and receipts server-only.

The world still renders movement on the client, but signed-in WebSocket movement
is limited by a server-timed travel budget (16 units/second with at most 3 units
of burst allowance), zone boundaries, and zone transitions that land only at the
destination spawn. Rejected movement returns the server position for visual
correction and cannot advance resource or fishing proximity. Legitimate guests
keep the existing offline and live movement behavior. The server does not fully
simulate collisions or input physics; gradual bot movement and automation are
not certified as human.

Authenticated `update_appearance` messages never grant public rank, title,
element, lineage, cosmetics or companion traits from the client. Each signed-in
projection refreshes from the enrolled wizard and selected server creature;
invalid creature selections keep their roster eligibility restricted.
WebSocket heartbeats keep a stationary signed-in player active; disconnect
clears the session's economy presence immediately. A matching reconnect can
restore its last server-observed position for up to 60 seconds on that server.
A new session starts at the chosen zone spawn if no matching position exists.

## Earlier saves and guest play

Existing cloud progress remains in its original documents. Signed-in players can
copy an earlier wizard, its creatures, Dorm and paintings to an available local
guest slot. The copy is private, lacks online progression authority, and never
overwrites existing guest entries. If browser storage is full the original cloud
archive stays available. Local guest mechanics continue computing their own results.

A new online wizard begins with server-created defaults. Existing character stats,
inventories and roster data remain historical. Existing cloud Term completion
flags only suppress repeat payouts. Historical XP does not become earned online
XP. Earlier realm, vault and wizard documents remain owner-readable. A server-created
online character has a provenance field that browsers cannot write.

Use the updated server, frontend and rules together during an approved rollout.
Check legacy history and local copies before opening signed-in progression.
Full signed-in UI verification and production rollout are separate from emulator
checks on a pull request.

## Verification

The Auth/Firestore emulator suite uses production entry points with demo identities,
and covers enrollment and solo settlement retries, once-only claims, representative
gameplay writes, archived saves, authenticated roster selection, and direct client
write denial. The public guest browser suites and the core and rules jobs still run
on the same pull-request checkout.
