import type { ElementId } from './elements.ts';

export type StratumId = 'bridging' | 'canopy' | 'waters' | 'deeproot';

export type RaceId =
  | 'human'
  | 'stoneborn'
  | 'dryad'
  | 'beastfolk'
  | 'tide_siren'
  | 'river_naiad'
  | 'sky_avian'
  | 'cloud_sylph'
  | 'dwarf'
  | 'high_elf'
  | 'dark_elf'
  | 'draconic_kin'
  | 'astral_kin';

export type BeastClanId = 'ember_fox' | 'spark_lynx' | 'gale_owl';

export interface RaceDefinition {
  id: RaceId;
  name: string;
  stratum: StratumId;
  stratumLabel: string;
  affinityElements: ElementId[];
  unlockType: 'starter' | 'rank4_trial' | 'rank5_drake' | 'rank7_fusion';
  unlockRequirementLabel: string;
  passiveName: string;
  passiveBonus: {
    hpBonusPct?: number;
    powerBonusPct?: number;
    accuracyBonus?: number;
    pierceBonus?: number;
    craftDiscountPct?: number;
    bondXpBonusPct?: number;
  };
  silhouetteNotes: string;
  skinSwatches: string[];
  /** Stoneborn chest lava glow changes color automatically to match active Element */
  usesElementMoltenChest?: boolean;
  hasBeastClans?: boolean;
}

export const BEAST_CLANS: Record<BeastClanId, { id: BeastClanId; name: string; element: ElementId; ears: string; furHex: string }> = {
  ember_fox: { id: 'ember_fox', name: 'Ember Fox', element: 'ember', ears: 'Pointed brush-fox ears & plume tail', furHex: '#d96b38' },
  spark_lynx: { id: 'spark_lynx', name: 'Spark Lynx', element: 'spark', ears: 'Tufted lynx ears & bobbed lightning tail', furHex: '#7d62b8' },
  gale_owl: { id: 'gale_owl', name: 'Gale Owl', element: 'gale', ears: 'Feathered ear-tufts & swoop tail-plumes', furHex: '#5ca397' },
};

export const RACES: Record<RaceId, RaceDefinition> = {
  human: {
    id: 'human',
    name: 'Alder Human',
    stratum: 'bridging',
    stratumLabel: 'Core & Bridging Folk',
    affinityElements: ['ember', 'frost', 'gale', 'bramble', 'tide', 'spark'],
    unlockType: 'starter',
    unlockRequirementLabel: 'Starter Lineage',
    passiveName: 'Versatile Pact',
    passiveBonus: { bondXpBonusPct: 5, accuracyBonus: 2 },
    silhouetteNotes: 'Balanced anime-storybook frame uniting all sky-island traditions.',
    skinSwatches: ['#f6d6be', '#e5b899', '#c68d68', '#8d593c', '#573624'],
  },
  stoneborn: {
    id: 'stoneborn',
    name: 'Stoneborn',
    stratum: 'bridging',
    stratumLabel: 'Core & Bridging Folk',
    affinityElements: ['ember', 'frost', 'gale', 'bramble', 'tide', 'spark', 'magma', 'verdigris'],
    unlockType: 'starter',
    unlockRequirementLabel: 'Starter Lineage',
    passiveName: 'Molten Core',
    passiveBonus: { hpBonusPct: 6, powerBonusPct: 3 },
    silhouetteNotes: 'Solid carved stone body (grey, brown, obsidian, or alabaster) with glowing molten chest cracks matching your chosen Element.',
    skinSwatches: ['#7c8087', '#806954', '#2d3038', '#dcd8cf'],
    usesElementMoltenChest: true,
  },
  sky_avian: {
    id: 'sky_avian',
    name: 'Sky-Avian',
    stratum: 'canopy',
    stratumLabel: 'Canopy & High Winds',
    affinityElements: ['gale'],
    unlockType: 'starter',
    unlockRequirementLabel: 'Starter Lineage',
    passiveName: 'Thermal Glide',
    passiveBonus: { accuracyBonus: 4, powerBonusPct: 3 },
    silhouetteNotes: 'Feathered crest plumes, wing-sleeved streetwear, and light agile posture.',
    skinSwatches: ['#e8eef5', '#87a8bd', '#5b7285', '#c9a679'],
  },
  cloud_sylph: {
    id: 'cloud_sylph',
    name: 'Cloud-Mist Sylph',
    stratum: 'canopy',
    stratumLabel: 'Canopy & High Winds',
    affinityElements: ['spark', 'tempest'],
    unlockType: 'rank4_trial',
    unlockRequirementLabel: 'Reach Rank 4 & Clear a Rare Trial',
    passiveName: 'Static Nimbus',
    passiveBonus: { powerBonusPct: 5, accuracyBonus: 2 },
    silhouetteNotes: 'Billowing vapor-curl hair, floating storm beads, and crackling nimbus cuffs.',
    skinSwatches: ['#d7e5f7', '#b4c6e7', '#949dc9', '#eef5ff'],
  },
  dryad: {
    id: 'dryad',
    name: 'Woodland Dryad',
    stratum: 'canopy',
    stratumLabel: 'Canopy & High Winds',
    affinityElements: ['bramble'],
    unlockType: 'starter',
    unlockRequirementLabel: 'Starter Lineage',
    passiveName: 'Rootbound Vigor',
    passiveBonus: { hpBonusPct: 5, bondXpBonusPct: 6 },
    silhouetteNotes: 'Leaf-crowned hair, bark-etched sleeves, and blossom freckles.',
    skinSwatches: ['#d7e0c3', '#a6b888', '#7d8e5f', '#6b5340'],
  },
  high_elf: {
    id: 'high_elf',
    name: 'High Elf',
    stratum: 'canopy',
    stratumLabel: 'Canopy & High Winds',
    affinityElements: ['sol'],
    unlockType: 'rank4_trial',
    unlockRequirementLabel: 'Reach Rank 4 & Clear Sol Trial',
    passiveName: 'Sunspire Focus',
    passiveBonus: { accuracyBonus: 4, powerBonusPct: 4 },
    silhouetteNotes: 'Long swept ears, gold-piped high collars, and sunlit iris sheen.',
    skinSwatches: ['#f9e4d4', '#ecc8ae', '#d4a787', '#ffe9cf'],
  },
  tide_siren: {
    id: 'tide_siren',
    name: 'Tideborn Siren',
    stratum: 'waters',
    stratumLabel: 'Waters & Hearth Valleys',
    affinityElements: ['tide'],
    unlockType: 'starter',
    unlockRequirementLabel: 'Starter Lineage',
    passiveName: 'Harbor Cadence',
    passiveBonus: { powerBonusPct: 4, accuracyBonus: 3 },
    silhouetteNotes: 'Iridescent ear-fins, sea-glass jewelry, and coastal cropped trench styling.',
    skinSwatches: ['#b6dfe6', '#7cb8c9', '#568da6', '#d8f0f2'],
  },
  river_naiad: {
    id: 'river_naiad',
    name: 'River Naiad',
    stratum: 'waters',
    stratumLabel: 'Waters & Hearth Valleys',
    affinityElements: ['frost', 'glacier', 'tide'],
    unlockType: 'starter',
    unlockRequirementLabel: 'Starter Lineage',
    passiveName: 'Springwell Grace',
    passiveBonus: { hpBonusPct: 4, accuracyBonus: 3 },
    silhouetteNotes: 'Translucent lotus fins, reed ribbons, and cool freshwater shimmer.',
    skinSwatches: ['#cfeae6', '#9cd4cc', '#6eaeb0', '#e7f7f5'],
  },
  beastfolk: {
    id: 'beastfolk',
    name: 'Beastfolk Clan',
    stratum: 'waters',
    stratumLabel: 'Waters & Hearth Valleys',
    affinityElements: ['ember', 'spark', 'gale'],
    unlockType: 'starter',
    unlockRequirementLabel: 'Starter Lineage (Ember Fox · Spark Lynx · Gale Owl)',
    passiveName: 'Pack Reflex',
    passiveBonus: { powerBonusPct: 4, bondXpBonusPct: 6 },
    silhouetteNotes: 'Expressive clan ears & tail threaded cleanly through streetwear cutouts.',
    skinSwatches: ['#e8b692', '#d98a5b', '#8d75b5', '#73a39b'],
    hasBeastClans: true,
  },
  dwarf: {
    id: 'dwarf',
    name: 'Runeforge Dwarf',
    stratum: 'deeproot',
    stratumLabel: 'Deep Root & Astral Core',
    affinityElements: ['verdigris'],
    unlockType: 'rank4_trial',
    unlockRequirementLabel: 'Reach Rank 4 & Clear Verdigris Trial',
    passiveName: 'Anvil Pierce',
    passiveBonus: { pierceBonus: 6, craftDiscountPct: 12, hpBonusPct: 4 },
    silhouetteNotes: 'Stout broad shoulders, rune-clasped braided beards, and brass-buckled forge coats.',
    skinSwatches: ['#f0cdb3', '#d6a584', '#a87454', '#7a523b'],
  },
  dark_elf: {
    id: 'dark_elf',
    name: 'Dark Elf',
    stratum: 'deeproot',
    stratumLabel: 'Deep Root & Astral Core',
    affinityElements: ['umbra'],
    unlockType: 'rank4_trial',
    unlockRequirementLabel: 'Reach Rank 4 & Clear Umbra Trial',
    passiveName: 'Nocturne Edge',
    passiveBonus: { powerBonusPct: 5, pierceBonus: 3 },
    silhouetteNotes: 'Dusk-slate complexion, silver-white locks, and nocturnal asymmetric street cloaks.',
    skinSwatches: ['#635e78', '#4c4761', '#7f7899', '#3a354b'],
  },
  draconic_kin: {
    id: 'draconic_kin',
    name: 'Draconic Kin',
    stratum: 'deeproot',
    stratumLabel: 'Deep Root & Astral Core',
    affinityElements: ['ember', 'magma'],
    unlockType: 'rank5_drake',
    unlockRequirementLabel: 'Reach Rank 5 & Evolve a Stage 3 Drake',
    passiveName: 'Cinder Scale',
    passiveBonus: { powerBonusPct: 6, hpBonusPct: 4 },
    silhouetteNotes: 'Swept obsidian horns, scaled cheek crests, and ember-lined tail cloak.',
    skinSwatches: ['#b85c44', '#6d4c49', '#c99357', '#3f3b47'],
  },
  astral_kin: {
    id: 'astral_kin',
    name: 'Astral / Rift Kin',
    stratum: 'deeproot',
    stratumLabel: 'Deep Root & Astral Core',
    affinityElements: ['chronos', 'eclipse', 'aetheris'],
    unlockType: 'rank7_fusion',
    unlockRequirementLabel: 'Reach Rank 7 & Hatch a Secret Fusion Creature',
    passiveName: 'Astrolabe Resonance',
    passiveBonus: { accuracyBonus: 5, powerBonusPct: 6, pierceBonus: 3 },
    silhouetteNotes: 'Star-freckled skin, floating halo astrolabe rings, and celestial coat hems.',
    skinSwatches: ['#3d4a6e', '#56648f', '#d9d4eb', '#2a2c44'],
  },
};

export const RACE_LIST: RaceDefinition[] = Object.values(RACES);

export interface WizardSculpt {
  /** Undefined keeps older saves compatible with the default Rowan appearance. */
  humanModel?: 'rowan' | 'classic';
  height: number; // 0.88..1.12
  build: 'slender' | 'balanced' | 'athletic';
  skinHex: string;
  hairStyle: string;
  hairHex: string;
  hairTipHex: string;
  eyeShape: 'bright' | 'sharp' | 'gentle';
  eyeLeftHex: string;
  eyeRightHex: string;
  browStyle: 'arched' | 'bold' | 'soft';
  marking: 'none' | 'star_freckle' | 'cheek_rune' | 'brow_scar' | 'crescent';
  primaryDye: string;
  trimDye: string;
  accentDye: string;
  castPose: 'scholar' | 'duelist' | 'drifter';
}

export interface ModularGearItem {
  id: string;
  slot: 'headgear' | 'torso' | 'back' | 'footwear' | 'staff';
  name: string;
  styleTag: string;
  schoolSet?: ElementId;
  levelReq: number;
  priceFlorins: number;
  craftRecipe?: Record<string, number>;
  stats: {
    hp: number;
    powerPct: number;
    accuracyPct: number;
    piercePct: number;
  };
  sockets: number;
  silhouette: string;
}

export const MODULAR_GEAR: ModularGearItem[] = [
  // Headgear
  { id: 'hat_academy_cap', slot: 'headgear', name: 'Aldervale Visor Beanie', styleTag: 'Streetwear', levelReq: 1, priceFlorins: 0, stats: { hp: 20, powerPct: 2, accuracyPct: 2, piercePct: 0 }, sockets: 1, silhouette: 'beanie_goggles' },
  { id: 'hat_pointed_brim', slot: 'headgear', name: 'Starstitch Brim Hat', styleTag: 'Classic', levelReq: 1, priceFlorins: 90, stats: { hp: 30, powerPct: 3, accuracyPct: 3, piercePct: 0 }, sockets: 1, silhouette: 'brim_hat' },
  { id: 'hat_arcane_phones', slot: 'headgear', name: 'Resonance Visor Headphones', styleTag: 'Tech-Mage', levelReq: 3, priceFlorins: 180, stats: { hp: 45, powerPct: 5, accuracyPct: 4, piercePct: 1 }, sockets: 2, silhouette: 'visor_phones' },
  { id: 'hat_circlet_sol', slot: 'headgear', name: 'Sunspire Ribbon Circlet', styleTag: 'Academy', levelReq: 5, priceFlorins: 320, stats: { hp: 65, powerPct: 7, accuracyPct: 5, piercePct: 2 }, sockets: 2, silhouette: 'circlet' },

  // Torso
  { id: 'torso_bomber', slot: 'torso', name: 'Cropped Sigil Bomber', styleTag: 'Streetwear', levelReq: 1, priceFlorins: 0, stats: { hp: 45, powerPct: 4, accuracyPct: 2, piercePct: 0 }, sockets: 1, silhouette: 'cropped_bomber' },
  { id: 'torso_trench', slot: 'torso', name: 'Asymmetric Sky-Trench', styleTag: 'Streetwear', levelReq: 2, priceFlorins: 140, stats: { hp: 70, powerPct: 6, accuracyPct: 3, piercePct: 1 }, sockets: 2, silhouette: 'street_trench' },
  { id: 'torso_poncho', slot: 'torso', name: 'Runewoven Tech-Mage Poncho', styleTag: 'Tech-Mage', levelReq: 4, priceFlorins: 260, stats: { hp: 95, powerPct: 8, accuracyPct: 4, piercePct: 2 }, sockets: 2, silhouette: 'poncho' },
  { id: 'torso_grand_robe', slot: 'torso', name: 'Archmage Storybook Greatcoat', styleTag: 'Classic', levelReq: 6, priceFlorins: 420, stats: { hp: 130, powerPct: 11, accuracyPct: 5, piercePct: 3 }, sockets: 3, silhouette: 'grand_robe' },

  // Back
  { id: 'back_satchel', slot: 'back', name: 'Crossbody Spell Satchel', styleTag: 'Streetwear', levelReq: 1, priceFlorins: 0, stats: { hp: 15, powerPct: 2, accuracyPct: 2, piercePct: 0 }, sockets: 1, silhouette: 'satchel' },
  { id: 'back_scarf', slot: 'back', name: 'Floating Nimbus Scarf', styleTag: 'Streetwear', levelReq: 3, priceFlorins: 150, stats: { hp: 30, powerPct: 4, accuracyPct: 4, piercePct: 1 }, sockets: 1, silhouette: 'floating_scarf' },
  { id: 'back_split_cloak', slot: 'back', name: 'Split-Wing Duelist Capelet', styleTag: 'Heroic', levelReq: 5, priceFlorins: 290, stats: { hp: 50, powerPct: 6, accuracyPct: 4, piercePct: 2 }, sockets: 2, silhouette: 'split_cloak' },

  // Footwear
  { id: 'boots_sneakers', slot: 'footwear', name: 'High-Top Rune Sneakers', styleTag: 'Streetwear', levelReq: 1, priceFlorins: 0, stats: { hp: 20, powerPct: 2, accuracyPct: 3, piercePct: 0 }, sockets: 1, silhouette: 'high_top_sneakers' },
  { id: 'boots_combat', slot: 'footwear', name: 'Buckled Sky-Combat Boots', styleTag: 'Streetwear', levelReq: 3, priceFlorins: 130, stats: { hp: 40, powerPct: 4, accuracyPct: 4, piercePct: 2 }, sockets: 1, silhouette: 'combat_boots' },
  { id: 'boots_greaves', slot: 'footwear', name: 'Verdigris Strider Greaves', styleTag: 'Armored', levelReq: 6, priceFlorins: 310, stats: { hp: 70, powerPct: 6, accuracyPct: 5, piercePct: 3 }, sockets: 2, silhouette: 'greaves' },

  // Staves
  { id: 'staff_oak_wand', slot: 'staff', name: 'Alderwood Apprentice Wand', styleTag: 'Academy', levelReq: 1, priceFlorins: 0, stats: { hp: 10, powerPct: 4, accuracyPct: 3, piercePct: 0 }, sockets: 1, silhouette: 'wand' },
  { id: 'staff_astrolabe', slot: 'staff', name: 'Brass Astrolabe Staff', styleTag: 'Celestial', levelReq: 3, priceFlorins: 190, stats: { hp: 25, powerPct: 7, accuracyPct: 5, piercePct: 2 }, sockets: 2, silhouette: 'astrolabe_staff' },
  { id: 'staff_runeblade', slot: 'staff', name: 'Lantern-Blade Caster', styleTag: 'Street-Arcane', levelReq: 5, priceFlorins: 360, stats: { hp: 40, powerPct: 10, accuracyPct: 6, piercePct: 4 }, sockets: 2, silhouette: 'lantern_staff' },
];

export const GEAR_BY_ID: Record<string, ModularGearItem> = Object.fromEntries(MODULAR_GEAR.map((g) => [g.id, g]));

export const HAIR_STYLES = [
  'Windblown Shag',
  'Twin Braids',
  'Messy Side-Sweep',
  'High Ponytail',
  'Curly Bob',
  'Spiked Crest',
  'Half-Up Bun',
  'Long Flowing Locks',
  'Undercut Crop',
  'Ribboned Curls',
] as const;

export interface RunestoneItem {
  id: string;
  name: string;
  bonusHp: number;
  bonusPowerPct: number;
  bonusAccuracyPct: number;
  bonusPiercePct: number;
  priceFlorins: number;
}

export const RUNESTONES: RunestoneItem[] = [
  { id: 'rune_vital', name: 'Amber-Heart Stone', bonusHp: 35, bonusPowerPct: 0, bonusAccuracyPct: 0, bonusPiercePct: 0, priceFlorins: 75 },
  { id: 'rune_focus', name: 'Sky-Lens Accuracy Rune', bonusHp: 0, bonusPowerPct: 0, bonusAccuracyPct: 4, bonusPiercePct: 0, priceFlorins: 90 },
  { id: 'rune_spark', name: 'Fierce Spark Shard', bonusHp: 0, bonusPowerPct: 4, bonusAccuracyPct: 0, bonusPiercePct: 0, priceFlorins: 110 },
  { id: 'rune_pierce', name: 'Verdigris Chisel Rune', bonusHp: 10, bonusPowerPct: 2, bonusAccuracyPct: 0, bonusPiercePct: 4, priceFlorins: 130 },
];
