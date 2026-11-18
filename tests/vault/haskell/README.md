# Haskell spell-card contracts

Batch 1 models the spell-card piles in Haskell and compares that model with AlderVale's TypeScript duel resolver. Every fixture records the ordered hand, deck, discard and sideboard after an action and again after a passive round.

| Case | Coverage |
|---|---|
| G06-004 | Draw in deck order, stop at seven cards, and stop on an empty deck. |
| G06-005 | Preserve the submitted card position after discards. Exercise duplicate cards, repeated discard indices and a selection that was discarded. |
| G06-006 | Consume Keen Ink and upgrade just the selected card. Exercise duplicate targets, placement on either side of Ink and ineligible targets. |
| G06-007 | A successful sideboard cast consumes that card. A fizzle retains it. Both preserve the submitted hand card. |
| G06-008 | Recycle discard cards after the existing deck, clear the discard, and preserve the card inventory through the following round. |

The Haskell source defines the fixture inputs and expected results. The Node adapter reads only the inputs and calls the real resolver. Each case group rejects a controlled observation with an inserted card. Fixtures use fixed rolls and synthetic wizards.

Run from the repository root with GHC and Node 24.

```sh
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
ghc -Wall -Werror -outputdir "$work" -o "$work/spell-card-contracts" tests/vault/haskell/SpellCardContracts.hs
"$work/spell-card-contracts" fixtures > "$work/fixtures.tsv"
node tests/vault/haskell/observe-cards.mjs "$work/fixtures.tsv" > "$work/observed.tsv"
"$work/spell-card-contracts" verify "$work/observed.tsv"
```

The Vault catalog job uses GHC provided by the standard Ubuntu runner image and prints its version beside the tested checkout and result. The suite covers the resolver's card-pile state. Browser interactions, pacing and damage balance have separate coverage.
