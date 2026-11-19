# Proposed race anatomy and universal garment contract

**State:** Design contract, not final rig specification or implemented mesh catalog.

## Explicitly owner-approved boundaries

- Every one of the 13 playable races has distinct body/anatomy, not a generic human recolor.
- A common **humanoid foundation** is acceptable only if species features remain intact; design extensions around species, not species around a universal rig.
- Sky-Avian preliminary choice: separate back wings plus two normal arms/hands, with distinctive avian heads, feathers, feet and legs.
- Every clothing item is wearable by every race. It may use a different fitted **mesh** with the same item ID, visual identity, stats and saved item reference.
- Underwear remains a non-removable base. Socks are visible with low shoes, and automatically tuck/hide with tall boots.
- Wide facial/body proportions and species-specific presets are desired; exact slider ranges, rig chains, palettes and counts are **not approved**.

## Thirteen distinct race contracts

| Race ID | Silhouette / proposed anatomical extension | Clothing-fit risk |
| --- | --- | --- |
| human | standard variation, diverse faces and proportions | baseline fit, must not be only template |
| stoneborn | sculpted rock forms, angular joints and fissures | intersecting shoulders, rough surfaces |
| dryad | bark forms and leaf/branch growth | protrusions through hats and sleeves |
| beastfolk | clan-specific ears, tail and head/face forms | ear clearance, tail openings, alternate shoes |
| tide_siren | aquatic ear fins and skin detail | headwear/fin intersections |
| river_naiad | lotus/river fin forms, translucent details | fin clearance, transparency |
| sky_avian | distinct head, feathers, feet, separate back wings | wing-root collision, headwear, feet |
| cloud_sylph | vapor hair and floating adornments | attachments and effects layering |
| dwarf | compact height, wide shoulders/hands, optional beard | cuffs, helmets, hem lengths |
| high_elf | swept elongated ears and facial identity | hats/ear clearance |
| dark_elf | distinct face/ear form and hairstyles | headgear/face accessories |
| draconic_kin | scales, horns, tail, reptilian head and claws; wings unresolved | tailored collar, tail, boot and wing clearance |
| astral_kin | floating halo/ornaments and cosmic features | layers and effects |

This table is a proposed engineering taxonomy grounded in current race IDs, not final visual art or uniform race anatomy.

## Proposed implementation boundary

Shared humanoid motion contract -> race-specific body mesh / joint retarget map -> optional appendage chains -> same logical wardrobe item with anatomy-specific fits -> body morphs / collision rules -> rendering/animation/save.

**Avoid false guarantees:** shared skeleton does not remove the need for alternate clothing fits; body masks do not guarantee no clipping; procedural models and GLB models have different resource lifecycles. A placeholder appendage does not prove production geometry or flight behavior.

Preserve existing `WizardSculpt`, five gear slots, legacy saved characters, procedural race renderer, Rowan GLB loading and Classic fallback until separately scoped migrations have tests. Prefer a new cosmetic appearance schema rather than changing combat gear slots without migration and compatibility review.

## Unsettled design

Wing anatomy/root locations and full range of motion; tail routing; optional Draconic Kin wings; digitigrade feet support; garment authoring effort; extreme sliders; shading/style; render/texture/memory budgets; race presets. Obtain owner decisions before freezing a master rig.
