# AlderVale Fusion Design v1

**Status** · Draft for owner review. The [ten base elements and their five opposition pairs](aldervale-element-system-v1.md#v1-elemental-opposition-decision) are locked. This proposal explores how fusion creatures enter the roster.

## Three ways to make a fusion

| Model | How the creature is acquired | Why choose it | Main design cost |
| --- | --- | --- | --- |
| Biological breeding | Two compatible creatures produce an egg. They stay in the roster and the hatchling joins them. | Players immediately understand family lines and inherited traits. | Compatibility and inheritance can become complicated, and the world needs a reason wildly different species produce the same fusion. |
| Egg created through a pact | Two companions use their affinities together at a site where those affinities meet. Their pact forms an egg that hatches into a third creature. | The player explores a habitat, uses both companions, and gets a new species while keeping the original team. | Each first discovery needs a short encounter with a readable objective. |
| Literal creature fusion | Two creatures merge into a single body. A permanent merge replaces both roster entries. A temporary merge lasts for an encounter. | The transformation itself is the payoff. Permanent merging gives roster choices weight, and temporary merging adds a tactical turn. | Permanent merging costs two trained companions. Temporary merging needs rules for team slots, turn order, targeting, health, and separation. |

## Recommendation for the first prototype

Make fusion eggs through pacts. A fusion is the new creature formed from two affinities. Both contributors return to the party. The offspring has a fixed species, one derived affinity, its own growth stages, and a role the player can build a team around.

1. **Discover the pairing.** A bestiary clue points to a site where two habitats meet. The Hatchery previews the compatible affinities, the species, and what each companion contributes.
2. **Use both companions in a field encounter.** Complete a short objective with a recognizable contribution from each creature. A successful attempt forms a guaranteed egg. An unsuccessful attempt can be retried with both creatures available.
3. **Finish one incubation objective.** The egg shows what it needs and tracks progress through a save and reload. The first Magma egg can hatch during the same play session. Keep the prototype free of a currency entry fee so the encounter tests the appeal of the mechanic itself.
4. **Choose one imprint at hatching.** The player picks between two visible, species-specific traits shaped by the two affinities. Both choices produce the same species. The trait gives the hatchling a tactical tradeoff and one visual detail the player can recognize.
5. **Learn the hatchling in its own encounter.** A short field task lets it use its signature move. The bestiary keeps a lineage entry showing the two contributing creatures, the site, and the imprint.

### Four candidate encounters

| Existing candidate | Site and objective | Two readable imprint choices |
| --- | --- | --- |
| Fire + Forest → Magma Caldera Newt | At a forested caldera, Fire keeps a vent open while Forest anchors the cracking ground. | Hotter area pressure or stronger cover for one ally. |
| Water + Lightning → Tempest Maelstrom Eel | At a storm-surge coast, Water routes a current while Lightning powers stepping stones in sequence. | Chain damage with a narrower targeting window or a wider support move with lower damage. |
| Frost + Water → Glacier Permafrost Seal | At a glacial outlet, Water raises the flow and Frost sets a temporary bridge, then the pair shepherds swimmers through. | Reinforce one shield or cover more allies with a weaker ward. |
| Dark + Light → Eclipse Corona Caracal | At a twilight escarpment, Dark conceals a crossing while Light reveals markers that guide the team through it. | Set up a single-target strike or reveal hidden enemies for the team. |

These are encounter and trait concepts. The recipes already have species in the development build. Trait effects, art, and encounters need a playable test. Wind, Earth, and Metal can receive future recipes once the first discovery loop proves its value. Fighting an opposing element and forming a fusion use independently defined pairings.

### Reasons to return

- **Discover another habitat.** Bestiary clues connect the next fusion to a place the player can explore at their own pace.
- **Build a second lineage for a different role.** Guarantee the known species whenever the same recipe succeeds. Show both imprint choices before committing, and let players revisit the field encounter for the other role.
- **Keep favorite companions relevant.** The bestiary records which creatures contributed, even after they evolve. A fusion fills a team role alongside the original companions.
- **Give compatible pairs a future team move.** A later combat experiment can let two companions execute a combined move while each keeps its own role. A literal transformation is also worth testing separately if roster merging becomes an explicit goal.

## First playable test after the design decision

Prototype Magma only. Observe whether someone can find the site from the clue, explain each companion's job, predict what will hatch, and choose an imprint for a concrete tactical reason. Check that a retry and a reload preserve the two companions and that completing the objective grants one egg. After hatching, ask which pairing they want to discover next and why. That answer and a voluntary second attempt are stronger design signals than time spent waiting for an egg.

## Current development reference

The current Hatchery has an 80-Florin cost and a two-win requirement. It stores the resulting species at purchase, keeps both original creatures, and adds the hatchling to the roster. The field encounter, single incubation objective, and imprint choice above are proposal changes. [Hatchery code](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/19a9a85b039ad63e8df4d4a104ad9e98f68ae31c/src/features/creatures/CreaturesArborPanel.tsx#L127) · [Hatching code](https://github.com/vixttha/AlderVale-Pact-of-Ten/blob/19a9a85b039ad63e8df4d4a104ad9e98f68ae31c/src/App.tsx#L931)
