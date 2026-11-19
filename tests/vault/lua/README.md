# Lua campus movement contracts

Batch 1 compares geometric expectations written in Lua with the coordinates returned by AlderVale's TypeScript campus collision helper. Each base scenario runs under eight axis transformations and three scales. Multi-step fixtures carry the actual position forward so the follow-up checks continuing movement.

| Case | Coverage |
|---|---|
| G20-001 | Straight, diagonal and stationary movement on open ground. |
| G20-002 | Movement inside, on and just outside the island perimeter. |
| G20-003 | Glancing projection, tangent contact, offset obstacles and a follow-up step. |
| G20-004 | Exact center hit and a near-center comparison. |
| G20-005 | Collision correction outside, inside and exactly on the island perimeter. |

The fixtures contain independently calculated positions. The Node adapter reads only the inputs and calls the production helper. Lua rejects missing, extra, out-of-order and incorrect observations. Each case also checks that its deliberately wrong coordinate fails comparison. The numerical tolerance scales with the island radius and is much smaller than the boundary offsets.

Run from the repository root with Lua 5.4 and Node 24.

```sh
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
lua tests/vault/lua/movement-contracts.lua fixtures > "$work/fixtures.tsv"
node tests/vault/lua/observe-movement.mjs "$work/fixtures.tsv" > "$work/observed.tsv"
lua tests/vault/lua/movement-contracts.lua verify "$work/observed.tsv"
```

The public Ubuntu Vault job builds Lua 5.4.8 from the SHA-256-verified upstream archive and records the tested checkout, runtime and results. These fixtures cover endpoint movement in the collision helper. Browser controls, frame timing, and high-speed movement through an obstacle between endpoints have separate coverage needs.
