import type { ElementId } from './elements.ts';
import type { StatusEffectKind } from './combat.ts';

export type SpellKind =
  | 'attack'
  | 'aoe'
  | 'drain'
  | 'blade'
  | 'shield'
  | 'trap'
  | 'weakness'
  | 'heal'
  | 'regen'
  | 'prism'
  | 'bubble'
  | 'stun'
  | 'stun_block'
  | 'reshuffle'
  | 'enchant';

export interface SpellDefinition {
  id: string;
  name: string;
  element: ElementId;
  pipCost: number;
  kind: SpellKind;
  accuracy: number;
  baseValue: number; // Damage, heal, or modifier %
  dotDamage?: number; // Over-time ticks across 3 turns
  dotTurns?: number;
  appliesStatus?: {
    kind: StatusEffectKind;
    target: 'self' | 'enemy';
    magnitude: number;
    turns: number;
  };
  /** Optional branching Spellwrighting upgrades unlocked via Spell Shards */
  wrightA?: { label: string; deltaValue: number; deltaAccuracy?: number };
  wrightB?: { label: string; bonusEffect: 'extra_blade' | 'extra_shield' | 'pierce_15' | 'heal_120' };
  description: string;
  unlockRank: number;
  priceFlorins?: number;
}

export const SPELLS: SpellDefinition[] = [
  // EMBER
  { id: 'ember_cinder_dart', name: 'Cinder Dart', element: 'ember', pipCost: 1, kind: 'attack', accuracy: 82, baseValue: 95, appliesStatus: { kind: 'burning', target: 'enemy', magnitude: 30, turns: 2 }, wrightA: { label: '+25 Base Damage', deltaValue: 25 }, wrightB: { label: '+15% Pierce', bonusEffect: 'pierce_15' }, description: 'Snappy hearth-spark projectile that inflicts Burning.', unlockRank: 1 },
  { id: 'ember_fox_flare', name: 'Foxfire Volley', element: 'ember', pipCost: 3, kind: 'attack', accuracy: 80, baseValue: 210, dotDamage: 90, dotTurns: 3, wrightA: { label: '+45 Impact', deltaValue: 45 }, wrightB: { label: 'Leave +20% Blade', bonusEffect: 'extra_blade' }, description: 'Scorches foe then inflicts Burning for 3 turns.', unlockRank: 1 },
  { id: 'ember_hearth_blade', name: 'Hearth Blade', element: 'ember', pipCost: 0, kind: 'blade', accuracy: 100, baseValue: 35, description: 'Next Ember attack deals +35% damage.', unlockRank: 1 },
  { id: 'ember_meteor_roar', name: 'Caldera Roar', element: 'ember', pipCost: 5, kind: 'aoe', accuracy: 78, baseValue: 360, dotDamage: 120, dotTurns: 2, description: 'Sweeps all foes in molten Burning ash.', unlockRank: 3, priceFlorins: 160 },

  // FROST
  { id: 'frost_rime_shard', name: 'Rime Shard', element: 'frost', pipCost: 1, kind: 'attack', accuracy: 86, baseValue: 85, appliesStatus: { kind: 'frostbite', target: 'enemy', magnitude: 20, turns: 2 }, description: 'Crisp winter lance inflicting Frostbite (-15% foe dmg).', unlockRank: 1 },
  { id: 'frost_glacial_stag', name: 'Glacial Stag', element: 'frost', pipCost: 3, kind: 'attack', accuracy: 85, baseValue: 220, wrightA: { label: '+40 Damage', deltaValue: 40 }, wrightB: { label: 'Gain -35% Shield', bonusEffect: 'extra_shield' }, description: 'Charges through frozen mist.', unlockRank: 1 },
  { id: 'frost_tower_ward', name: 'Bastion Ward', element: 'frost', pipCost: 0, kind: 'shield', accuracy: 100, baseValue: 50, description: 'Blocks 50% of the next incoming attack.', unlockRank: 1 },
  { id: 'frost_stasis_chime', name: 'Winter Freeze', element: 'frost', pipCost: 2, kind: 'stun', accuracy: 85, baseValue: 1, description: 'Stuns target for 1 turn unless warded.', unlockRank: 2, priceFlorins: 120 },

  // GALE
  { id: 'gale_feather_bolt', name: 'Pinion Bolt', element: 'gale', pipCost: 1, kind: 'attack', accuracy: 90, baseValue: 90, description: 'Swift wind-carved dart.', unlockRank: 1 },
  { id: 'gale_sky_falcon', name: 'Zephyr Falcon', element: 'gale', pipCost: 3, kind: 'attack', accuracy: 88, baseValue: 235, wrightA: { label: '+35 Damage & +4% Acc', deltaValue: 35, deltaAccuracy: 4 }, wrightB: { label: 'Gain +20% Blade', bonusEffect: 'extra_blade' }, description: 'Diving sky-crest strike.', unlockRank: 1 },
  { id: 'gale_tailwind', name: 'Tailwind Charm', element: 'gale', pipCost: 0, kind: 'blade', accuracy: 100, baseValue: 35, description: 'Next Gale spell deals +35% damage.', unlockRank: 1 },
  { id: 'gale_spiral_dome', name: 'Updraft Dome', element: 'gale', pipCost: 2, kind: 'bubble', accuracy: 100, baseValue: 25, description: 'Arena Bubble: +25% Gale & +10% Accuracy.', unlockRank: 2, priceFlorins: 130 },

  // BRAMBLE
  { id: 'bramble_thorn_snap', name: 'Thorn Snap', element: 'bramble', pipCost: 1, kind: 'attack', accuracy: 92, baseValue: 82, description: 'Quick vine lash.', unlockRank: 1 },
  { id: 'bramble_dryad_bloom', name: 'Sunpetal Mend', element: 'bramble', pipCost: 2, kind: 'heal', accuracy: 95, baseValue: 240, appliesStatus: { kind: 'regen', target: 'self', magnitude: 65, turns: 3 }, wrightA: { label: '+70 Healing', deltaValue: 70 }, wrightB: { label: 'Leave -30% Ward', bonusEffect: 'extra_shield' }, description: 'Restores 240 HP and grants Regen (+65 HP/turn for 3t).', unlockRank: 1 },
  { id: 'bramble_moss_oath', name: 'Ancient Briars', element: 'bramble', pipCost: 4, kind: 'attack', accuracy: 90, baseValue: 300, description: 'Crushing woodland roots.', unlockRank: 2, priceFlorins: 140 },
  { id: 'bramble_sap_blade', name: 'Verdant Blade', element: 'bramble', pipCost: 0, kind: 'blade', accuracy: 100, baseValue: 35, description: 'Next Bramble spell deals +35% damage.', unlockRank: 1 },

  // TIDE
  { id: 'tide_foam_jet', name: 'Foam Jet', element: 'tide', pipCost: 1, kind: 'attack', accuracy: 86, baseValue: 88, description: 'Pressurized harbor wave.', unlockRank: 1 },
  { id: 'tide_siren_hymn', name: 'Siren Undertow', element: 'tide', pipCost: 3, kind: 'attack', accuracy: 86, baseValue: 245, wrightA: { label: '+40 Damage', deltaValue: 40 }, wrightB: { label: 'Heal 120 HP', bonusEffect: 'heal_120' }, description: 'Crash of reef currents.', unlockRank: 1 },
  { id: 'tide_mist_trap', name: 'Brine Trap', element: 'tide', pipCost: 0, kind: 'trap', accuracy: 100, baseValue: 30, description: 'Target takes +30% from next hit.', unlockRank: 1 },
  { id: 'tide_prism', name: 'Coral Prism', element: 'tide', pipCost: 0, kind: 'prism', accuracy: 100, baseValue: 1, description: 'Converts your next Tide hit into Spark damage.', unlockRank: 2, priceFlorins: 90 },

  // SPARK
  { id: 'spark_arc_jolt', name: 'Arc Jolt', element: 'spark', pipCost: 1, kind: 'attack', accuracy: 76, baseValue: 118, appliesStatus: { kind: 'shocked', target: 'enemy', magnitude: 10, turns: 2 }, description: 'High-voltage snap inflicting Shocked (-10% Accuracy).', unlockRank: 1 },
  { id: 'spark_cloud_kraken', name: 'Thunder Lynx', element: 'spark', pipCost: 4, kind: 'attack', accuracy: 75, baseValue: 390, wrightA: { label: '+55 Damage', deltaValue: 55 }, wrightB: { label: '+15% Pierce', bonusEffect: 'pierce_15' }, description: 'Crackling sky-beast pounce.', unlockRank: 1 },
  { id: 'spark_surge_blade', name: 'Static Blade', element: 'spark', pipCost: 0, kind: 'blade', accuracy: 100, baseValue: 40, description: 'Next Spark spell deals +40% damage.', unlockRank: 1 },
  { id: 'spark_storm_prism', name: 'Nimbus Prism', element: 'spark', pipCost: 0, kind: 'prism', accuracy: 100, baseValue: 1, description: 'Converts your next Spark hit into Tide damage.', unlockRank: 2, priceFlorins: 90 },

  // UNIVERSAL & UTILITY
  { id: 'uni_mending_mist', name: 'Spring Regen', element: 'tide', pipCost: 1, kind: 'regen', accuracy: 100, baseValue: 75, dotTurns: 3, description: 'Grants Regen (+75 HP/turn for 3 turns) to Wizard & Lead Creature.', unlockRank: 1, priceFlorins: 75 },
  { id: 'uni_ember_prism', name: 'Thermal Prism', element: 'ember', pipCost: 0, kind: 'prism', accuracy: 100, baseValue: 1, description: 'Converts your next Ember hit into Frost damage.', unlockRank: 1, priceFlorins: 70 },
  { id: 'uni_stun_ward', name: 'Anchor Conviction', element: 'frost', pipCost: 0, kind: 'stun_block', accuracy: 100, baseValue: 2, description: 'Blocks the next 2 Stun attempts on your side.', unlockRank: 2, priceFlorins: 110 },
  { id: 'uni_reshuffle', name: 'Archivist Reshuffle', element: 'chronos', pipCost: 4, kind: 'reshuffle', accuracy: 100, baseValue: 1, description: 'Recycles all discarded main-deck spells.', unlockRank: 2, priceFlorins: 180 },
  { id: 'uni_enchant_keen', name: 'Keen Ink Enchant', element: 'sol', pipCost: 0, kind: 'enchant', accuracy: 100, baseValue: 65, description: 'In-Hand Fusion: Adds +65 Base Power & +8% Acc to an attack card.', unlockRank: 2, priceFlorins: 140 },

  // RARE ELEMENTS (Rank 4 + Trial)
  { id: 'umbra_velvet_drain', name: 'Velvet Leech', element: 'umbra', pipCost: 4, kind: 'drain', accuracy: 83, baseValue: 340, description: 'Drains 340 Umbra damage; heals 50% back.', unlockRank: 4, priceFlorins: 220 },
  { id: 'umbra_hex_veil', name: 'Dusk Weakness', element: 'umbra', pipCost: 1, kind: 'weakness', accuracy: 100, baseValue: 35, description: 'Reduces foe next attack by 35%.', unlockRank: 4, priceFlorins: 160 },
  { id: 'sol_dawn_lance', name: 'Dawnbrand Spear', element: 'sol', pipCost: 5, kind: 'attack', accuracy: 87, baseValue: 485, description: 'Piercing solar beam forged above the clouds.', unlockRank: 4, priceFlorins: 240 },
  { id: 'sol_auric_banner', name: 'Golden Pact Banner', element: 'sol', pipCost: 1, kind: 'blade', accuracy: 100, baseValue: 45, description: 'Grants +45% universal damage blade to your team.', unlockRank: 4, priceFlorins: 190 },
  { id: 'verdigris_anvil', name: 'Runeforge Hammer', element: 'verdigris', pipCost: 5, kind: 'attack', accuracy: 85, baseValue: 470, wrightB: { label: '+15% Pierce', bonusEffect: 'pierce_15' }, description: 'Ignores 20% shields and crushes wards.', unlockRank: 4, priceFlorins: 240 },
  { id: 'verdigris_copper_wall', name: 'Patina Bulwark', element: 'verdigris', pipCost: 1, kind: 'shield', accuracy: 100, baseValue: 65, description: 'Blocks 65% of incoming strike.', unlockRank: 4, priceFlorins: 180 },
  { id: 'chronos_pendulum', name: 'Grand Pendulum', element: 'chronos', pipCost: 6, kind: 'attack', accuracy: 86, baseValue: 560, description: 'Strikes across echoes of time.', unlockRank: 4, priceFlorins: 260 },

  // SECRET FUSION ELEMENTS
  { id: 'magma_tectonic', name: 'Tectonic Eruption', element: 'magma', pipCost: 5, kind: 'aoe', accuracy: 85, baseValue: 490, dotDamage: 140, dotTurns: 2, description: 'Fusion Spell: Shatters the arena floor in liquid rock.', unlockRank: 3 },
  { id: 'tempest_maelstrom', name: 'Sky-Sea Maelstrom', element: 'tempest', pipCost: 6, kind: 'aoe', accuracy: 82, baseValue: 610, description: 'Fusion Spell: Monsoon waves charged with lightning.', unlockRank: 3 },
  { id: 'glacier_abyss', name: 'Permafrost Tide', element: 'glacier', pipCost: 5, kind: 'attack', accuracy: 88, baseValue: 470, description: 'Fusion Spell: Freezes armor and shields alike.', unlockRank: 3 },
  { id: 'eclipse_twilight', name: 'Corona Requiem', element: 'eclipse', pipCost: 6, kind: 'drain', accuracy: 86, baseValue: 590, description: 'Fusion Spell: Lunar shadow & solar crown siphon.', unlockRank: 5 },
  { id: 'aetheris_astrolabe', name: 'Astrolabe Zenith', element: 'aetheris', pipCost: 7, kind: 'attack', accuracy: 90, baseValue: 690, description: 'Fusion Spell: Masterwork beam of brass & star-time.', unlockRank: 6 },
];

export const SPELL_BY_ID: Record<string, SpellDefinition> = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

export function getStarterDeckForElement(element: ElementId): string[] {
  const ownSpells = SPELLS.filter((s) => s.element === element && s.unlockRank <= 2).map((s) => s.id);
  const deck: string[] = [];
  for (const id of ownSpells) {
    deck.push(id, id, id);
  }
  deck.push('uni_stun_ward', 'uni_ember_prism', 'bramble_dryad_bloom', 'frost_tower_ward');
  while (deck.length < 24) {
    deck.push(ownSpells[deck.length % ownSpells.length] ?? 'ember_cinder_dart');
  }
  return deck.slice(0, 26);
}
