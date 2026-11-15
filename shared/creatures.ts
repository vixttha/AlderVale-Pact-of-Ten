import type { ElementId } from './elements.ts';
import type { StratumId } from './wardrobe.ts';

export type ChromaticVariant = 'none' | 'dawn' | 'dusk';

export interface CreatureSpecies {
  id: string;
  name: string;
  element: ElementId;
  stratum: StratumId;
  stageNames: [string, string, string];
  baseHp: number;
  baseAttack: number;
  innatePactCardId: string;
  branchA: { name: string; kind: 'strike' | 'buff'; value: number; desc: string };
  branchB: { name: string; kind: 'buff' | 'shield' | 'heal' | 'debuff'; value: number; desc: string };
  silhouette: 'fox' | 'stag' | 'owl' | 'sprout' | 'kelpie' | 'lynx' | 'drake' | 'golem' | 'moth' | 'clockwork' | 'serpent' | 'gryphon';
  lore: string;
  bondSealCost: number;
  isDrake?: boolean;
  isFusionOnly?: boolean;
}

export const CREATURE_SPECIES: CreatureSpecies[] = [
  {
    id: 'cinder_kitsune',
    name: 'Hearth Kitsune',
    element: 'ember',
    stratum: 'waters',
    stageNames: ['Spark-Kit', 'Ember-Vixen', 'Solaris Nine-Tail'],
    baseHp: 210,
    baseAttack: 65,
    innatePactCardId: 'ember_hearth_blade',
    branchA: { name: 'Tail-Flame Lash', kind: 'strike', value: 78, desc: 'Deals Ember claw damage.' },
    branchB: { name: 'Warm Hearth Aura', kind: 'buff', value: 20, desc: 'Grants Wizard +20% Ember Blade.' },
    silhouette: 'fox',
    lore: 'Beloved hearth-spirit foxes that warm kettle-ovens along the Hearth Valleys.',
    bondSealCost: 1,
  },
  {
    id: 'rime_stag',
    name: 'Glacier Stag',
    element: 'frost',
    stratum: 'waters',
    stageNames: ['Snow-Fawn', 'Frost-Antler', 'Crown Rime-Hart'],
    baseHp: 260,
    baseAttack: 52,
    innatePactCardId: 'frost_tower_ward',
    branchA: { name: 'Icicle Charge', kind: 'strike', value: 64, desc: 'Sturdy Frost antler strike.' },
    branchB: { name: 'Winter Pelt Guard', kind: 'shield', value: 35, desc: 'Shields Wizard for -35% incoming hit.' },
    silhouette: 'stag',
    lore: 'Gentle glacier-horned stags that drink from Naiad cascade springs.',
    bondSealCost: 1,
  },
  {
    id: 'zephyr_owl',
    name: 'Gale Barn-Owl',
    element: 'gale',
    stratum: 'canopy',
    stageNames: ['Downy Owlet', 'Wind-Courier', 'Tempest Strix'],
    baseHp: 215,
    baseAttack: 62,
    innatePactCardId: 'gale_tailwind',
    branchA: { name: 'Silent Dive', kind: 'strike', value: 74, desc: 'High-accuracy Gale swoop.' },
    branchB: { name: 'Updraft Feather', kind: 'buff', value: 25, desc: 'Adds +25% Gale Blade & +5% Acc.' },
    silhouette: 'owl',
    lore: 'Trained by Sky-Avians to ferry sealed parchment letters across cloud strata.',
    bondSealCost: 1,
  },
  {
    id: 'bramble_sprig',
    name: 'Mosscap Budling',
    element: 'bramble',
    stratum: 'canopy',
    stageNames: ['Acorn Sprout', 'Bramble Warden', 'Elder Oak-Spirit'],
    baseHp: 245,
    baseAttack: 54,
    innatePactCardId: 'bramble_dryad_bloom',
    branchA: { name: 'Briar Snap', kind: 'strike', value: 64, desc: 'Thorny vine strike.' },
    branchB: { name: 'Dewdrop Mend', kind: 'heal', value: 85, desc: 'Heals Wizard +85 HP.' },
    silhouette: 'sprout',
    lore: 'Chimes softly when rain gathers in the Canopy greenhouse.',
    bondSealCost: 1,
  },
  {
    id: 'harbor_kelpie',
    name: 'Tidepool Otter',
    element: 'tide',
    stratum: 'waters',
    stageNames: ['Foam Pup', 'Reef Diver', 'Sovereign Leviathan-Otter'],
    baseHp: 230,
    baseAttack: 60,
    innatePactCardId: 'tide_mist_trap',
    branchA: { name: 'Riptide Roll', kind: 'strike', value: 72, desc: 'Surging Tide bash.' },
    branchB: { name: 'Sea-Foam Trap', kind: 'debuff', value: 25, desc: 'Places +25% Tide Trap on foe.' },
    silhouette: 'kelpie',
    lore: 'Nuzzles Tideborn dock lanterns and collects iridescent sea-glass.',
    bondSealCost: 1,
  },
  {
    id: 'spark_lynx_cub',
    name: 'Nimbus Lynx',
    element: 'spark',
    stratum: 'canopy',
    stageNames: ['Static Kit', 'Arc Stalker', 'Cloud-Crown Lynx'],
    baseHp: 195,
    baseAttack: 74,
    innatePactCardId: 'spark_surge_blade',
    branchA: { name: 'Lightning Pounce', kind: 'strike', value: 88, desc: 'Explosive Spark pounce.' },
    branchB: { name: 'Charged Whiskers', kind: 'buff', value: 25, desc: 'Grants +25% Spark Blade.' },
    silhouette: 'lynx',
    lore: 'Fur crackles playfully during dusk cloud-storms.',
    bondSealCost: 1,
  },
  {
    id: 'cinder_drake',
    name: 'Kiln-Crest Drake',
    element: 'ember',
    stratum: 'deeproot',
    stageNames: ['Ash Whelp', 'Furnace Wyvern', 'Cinder Sovereign'],
    baseHp: 250,
    baseAttack: 74,
    innatePactCardId: 'ember_fox_flare',
    branchA: { name: 'Molten Breath', kind: 'strike', value: 86, desc: 'Fierce draconic Ember breath.' },
    branchB: { name: 'Scale Bastion', kind: 'shield', value: 35, desc: 'Shields Wizard (-35%).' },
    silhouette: 'drake',
    lore: 'Evolving one to Stage 3 unlocks the Draconic Kin prestige lineage at Rank 5.',
    bondSealCost: 3,
    isDrake: true,
  },
  {
    id: 'dusk_moth',
    name: 'Nocturne Luna-Moth',
    element: 'umbra',
    stratum: 'deeproot',
    stageNames: ['Velvet Caterpillar', 'Crescent Wing', 'Eclipse Monarch'],
    baseHp: 235,
    baseAttack: 72,
    innatePactCardId: 'umbra_hex_veil',
    branchA: { name: 'Shadow Dust', kind: 'strike', value: 82, desc: 'Umbra wing pulse.' },
    branchB: { name: 'Dusk Haze', kind: 'debuff', value: 25, desc: 'Weakens foe next hit by 25%.' },
    silhouette: 'moth',
    lore: 'Guided by Dark Elf archivists beneath lantern-lit root arches.',
    bondSealCost: 3,
  },
  {
    id: 'sun_gryphon',
    name: 'Suncrest Gryphon',
    element: 'sol',
    stratum: 'canopy',
    stageNames: ['Amber Eaglet', 'Aegis Gryphon', 'High-Noon Sovereign'],
    baseHp: 250,
    baseAttack: 72,
    innatePactCardId: 'sol_auric_banner',
    branchA: { name: 'Solar Talon', kind: 'strike', value: 84, desc: 'Radiant Sol strike.' },
    branchB: { name: 'Sunburst Mend', kind: 'heal', value: 95, desc: 'Heals Wizard +95 HP.' },
    silhouette: 'gryphon',
    lore: 'Guards the gilded battlements of High Elf scholars.',
    bondSealCost: 3,
  },
  {
    id: 'runic_golem',
    name: 'Anvil-Sprite Golem',
    element: 'verdigris',
    stratum: 'deeproot',
    stageNames: ['Pebble Hop', 'Brass Construct', 'Runeforge Titan'],
    baseHp: 280,
    baseAttack: 66,
    innatePactCardId: 'verdigris_copper_wall',
    branchA: { name: 'Runic Slam', kind: 'strike', value: 78, desc: 'Shield-piercing Verdigris hit.' },
    branchB: { name: 'Patina Ward', kind: 'shield', value: 45, desc: 'Shields Wizard (-45%).' },
    silhouette: 'golem',
    lore: 'Hammered to life by Dwarf smiths; resonates naturally with Stoneborn.',
    bondSealCost: 3,
  },
  {
    id: 'chronos_owl',
    name: 'Pendulum Automaton',
    element: 'chronos',
    stratum: 'deeproot',
    stageNames: ['Tick-Gear', 'Astrolabe Hound', 'Grand Horologe'],
    baseHp: 240,
    baseAttack: 74,
    innatePactCardId: 'uni_reshuffle',
    branchA: { name: 'Chrono Needle', kind: 'strike', value: 84, desc: 'Precision Chronos burst.' },
    branchB: { name: 'Haste Chime', kind: 'buff', value: 30, desc: '+30% Universal Blade.' },
    silhouette: 'clockwork',
    lore: 'Tick-tock brass spirit attuned to Astral Observatory spires.',
    bondSealCost: 3,
  },
  // 5 Hybrid / Fusion Creatures (Hatchable via 2-Win Charged Eggs)
  {
    id: 'magma_salamander',
    name: 'Caldera Newt',
    element: 'magma',
    stratum: 'bridging',
    stageNames: ['Cinder Tadpole', 'Basalt Salamander', 'Obsidian Caldera'],
    baseHp: 270,
    baseAttack: 82,
    innatePactCardId: 'magma_tectonic',
    branchA: { name: 'Lava Surge', kind: 'strike', value: 94, desc: 'Magma fusion blast.' },
    branchB: { name: 'Stone Crust', kind: 'shield', value: 45, desc: 'Shields Wizard (-45%).' },
    silhouette: 'drake',
    lore: 'Hatched from Ember + Bramble parents.',
    bondSealCost: 0,
    isFusionOnly: true,
    isDrake: true,
  },
  {
    id: 'tempest_serpent',
    name: 'Maelstrom Eel',
    element: 'tempest',
    stratum: 'waters',
    stageNames: ['Spark Fin', 'Storm Serpent', 'Sovereign Maelstrom'],
    baseHp: 235,
    baseAttack: 90,
    innatePactCardId: 'tempest_maelstrom',
    branchA: { name: 'Arc Tide', kind: 'strike', value: 102, desc: 'High-voltage Tempest wave.' },
    branchB: { name: 'Nimbus Coil', kind: 'buff', value: 35, desc: '+35% Tempest Blade.' },
    silhouette: 'serpent',
    lore: 'Hatched from Tide + Spark parents.',
    bondSealCost: 0,
    isFusionOnly: true,
  },
  {
    id: 'glacier_bear',
    name: 'Permafrost Seal',
    element: 'glacier',
    stratum: 'waters',
    stageNames: ['Ice Pup', 'Rime Guardian', 'Glacier Monarch'],
    baseHp: 295,
    baseAttack: 76,
    innatePactCardId: 'glacier_abyss',
    branchA: { name: 'Glacial Crush', kind: 'strike', value: 88, desc: 'Freezing Glacier slam.' },
    branchB: { name: 'Rime Sanctuary', kind: 'heal', value: 110, desc: 'Heals Wizard +110 HP.' },
    silhouette: 'kelpie',
    lore: 'Hatched from Frost + Tide parents.',
    bondSealCost: 0,
    isFusionOnly: true,
  },
  {
    id: 'eclipse_lynx',
    name: 'Corona Caracal',
    element: 'eclipse',
    stratum: 'deeproot',
    stageNames: ['Twilight Kit', 'Corona Lynx', 'Eclipse Sovereign'],
    baseHp: 255,
    baseAttack: 88,
    innatePactCardId: 'eclipse_twilight',
    branchA: { name: 'Corona Fang', kind: 'strike', value: 98, desc: 'Eclipse drain strike.' },
    branchB: { name: 'Lunar Siphon', kind: 'heal', value: 105, desc: 'Heals Wizard +105 HP.' },
    silhouette: 'lynx',
    lore: 'Hatched from Umbra + Sol parents.',
    bondSealCost: 0,
    isFusionOnly: true,
  },
  {
    id: 'aetheris_dragonet',
    name: 'Astrolabe Dragonet',
    element: 'aetheris',
    stratum: 'deeproot',
    stageNames: ['Starlight Wyrm', 'Gilded Astrolabe', 'Aetheris Sovereign'],
    baseHp: 265,
    baseAttack: 92,
    innatePactCardId: 'aetheris_astrolabe',
    branchA: { name: 'Zenith Pulse', kind: 'strike', value: 104, desc: 'Aetheris fusion beam.' },
    branchB: { name: 'Time-Forged Ward', kind: 'buff', value: 35, desc: '+35% Universal Blade.' },
    silhouette: 'drake',
    lore: 'Hatched from Chronos + Verdigris parents.',
    bondSealCost: 0,
    isFusionOnly: true,
    isDrake: true,
  },
];

export const SPECIES_BY_ID: Record<string, CreatureSpecies> = Object.fromEntries(CREATURE_SPECIES.map((c) => [c.id, c]));

export interface CreatureTalent {
  id: string;
  name: string;
  kind: 'stat' | 'maycast';
  desc: string;
  bonusHp?: number;
  bonusPowerPct?: number;
  maycastTrigger?: 'on_cast' | 'on_hit_taken';
  maycastEffect?: 'mini_blade' | 'mini_shield' | 'mini_heal';
}

export const CREATURE_TALENTS: CreatureTalent[] = [
  { id: 'tal_sturdy', name: 'Oakheart Pelt', kind: 'stat', desc: '+45 Wizard Max HP', bonusHp: 45 },
  { id: 'tal_spellproof', name: 'Rune-Bound Coat', kind: 'stat', desc: '+5% Wizard Power', bonusPowerPct: 5 },
  { id: 'tal_may_blade', name: 'Maycast: Spark Cheer', kind: 'maycast', desc: '18% chance after casting to grant +20% Blade', maycastTrigger: 'on_cast', maycastEffect: 'mini_blade' },
  { id: 'tal_may_shield', name: 'Maycast: Bristle Ward', kind: 'maycast', desc: '20% chance when hit to grant -25% Shield', maycastTrigger: 'on_hit_taken', maycastEffect: 'mini_shield' },
  { id: 'tal_may_heal', name: 'Maycast: Sprite Mend', kind: 'maycast', desc: '18% chance after casting to heal +75 HP', maycastTrigger: 'on_cast', maycastEffect: 'mini_heal' },
];

export function resolveFusionSpecies(elA: ElementId, elB: ElementId): CreatureSpecies | null {
  const pair = new Set([elA, elB]);
  if (pair.has('ember') && pair.has('bramble')) return SPECIES_BY_ID.magma_salamander;
  if (pair.has('tide') && pair.has('spark')) return SPECIES_BY_ID.tempest_serpent;
  if (pair.has('frost') && pair.has('tide')) return SPECIES_BY_ID.glacier_bear;
  if (pair.has('umbra') && pair.has('sol')) return SPECIES_BY_ID.eclipse_lynx;
  if (pair.has('chronos') && pair.has('verdigris')) return SPECIES_BY_ID.aetheris_dragonet;
  return null;
}

export function getBondStage(bondXp: number): 1 | 2 | 3 {
  if (bondXp >= 300) return 3;
  if (bondXp >= 100) return 2;
  return 1;
}

export function hasStratumHarmony(wizardStratum: StratumId, creatureSpeciesId: string): boolean {
  const sp = SPECIES_BY_ID[creatureSpeciesId];
  if (!sp) return false;
  return sp.stratum === wizardStratum || wizardStratum === 'bridging';
}
