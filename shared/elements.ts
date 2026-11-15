export type StarterElementId = 'ember' | 'frost' | 'gale' | 'bramble' | 'tide' | 'spark';
export type RareElementId = 'umbra' | 'sol' | 'verdigris' | 'chronos';
export type FusionElementId = 'magma' | 'tempest' | 'glacier' | 'eclipse' | 'aetheris';
export type ElementId = StarterElementId | RareElementId | FusionElementId;
export type ElementTier = 'starter' | 'rare' | 'fusion';

export interface ElementDefinition {
  id: ElementId;
  name: string;
  tier: ElementTier;
  primaryHex: string;
  glowHex: string;
  opposingId?: ElementId;
  fusionParents?: [ElementId, ElementId];
  crestShape: string;
  /** Normalized 24x24 SVG path for colorblind-safe geometric emblem */
  crestSvgPath: string;
  archetype: string;
  baseAccuracy: number;
  baseCritPct: number;
  powerScalar: number;
}

export const ELEMENTS: Record<ElementId, ElementDefinition> = {
  ember: {
    id: 'ember',
    name: 'Ember',
    tier: 'starter',
    primaryHex: '#d9532f',
    glowHex: '#ff8a4c',
    opposingId: 'frost',
    crestShape: 'Flame Diamond',
    crestSvgPath: 'M12 2L17 9L14 14L17 18L12 22L7 18L10 14L7 9Z',
    archetype: 'Aggressive burn bursts & over-time cinders',
    baseAccuracy: 80,
    baseCritPct: 12,
    powerScalar: 1.0,
  },
  frost: {
    id: 'frost',
    name: 'Frost',
    tier: 'starter',
    primaryHex: '#3b82c4',
    glowHex: '#8bd3ff',
    opposingId: 'ember',
    crestShape: 'Six-Point Crystal',
    crestSvgPath: 'M12 2L14 8L20 6L16 12L20 18L14 16L12 22L10 16L4 18L8 12L4 6L10 8Z',
    archetype: 'Stalwart shields, freezes & sturdy HP pools',
    baseAccuracy: 85,
    baseCritPct: 8,
    powerScalar: 0.94,
  },
  gale: {
    id: 'gale',
    name: 'Gale',
    tier: 'starter',
    primaryHex: '#3b9b8f',
    glowHex: '#7de2d1',
    opposingId: 'bramble',
    crestShape: 'Twin Pinion Spiral',
    crestSvgPath: 'M4 12C4 7 8 4 13 4C18 4 20 8 17 11C14 14 10 12 10 9M20 12C20 17 16 20 11 20C6 20 4 16 7 13',
    archetype: 'Swift tempo, accuracy blades & agile dodges',
    baseAccuracy: 88,
    baseCritPct: 11,
    powerScalar: 0.98,
  },
  bramble: {
    id: 'bramble',
    name: 'Bramble',
    tier: 'starter',
    primaryHex: '#4b8f44',
    glowHex: '#8cd46e',
    opposingId: 'gale',
    crestShape: 'Thorn Tri-Leaf',
    crestSvgPath: 'M12 3C15 7 15 11 12 14C9 11 9 7 12 3ZM5 14C8 12 11 13 12 17C9 19 6 18 5 14ZM19 14C16 12 13 13 12 17C15 19 18 18 19 14Z',
    archetype: 'Healing blooms, thorn wards & steady sustain',
    baseAccuracy: 90,
    baseCritPct: 8,
    powerScalar: 0.93,
  },
  tide: {
    id: 'tide',
    name: 'Tide',
    tier: 'starter',
    primaryHex: '#256fa8',
    glowHex: '#5cc4ff',
    opposingId: 'spark',
    crestShape: 'Cresting Wave Ring',
    crestSvgPath: 'M3 13C6 9 10 9 12 12C14 15 18 15 21 11M5 17C8 14 11 15 13 17C15 19 18 19 20 16M12 4L15 8H9Z',
    archetype: 'Flow control, cleanse & balanced surge',
    baseAccuracy: 85,
    baseCritPct: 10,
    powerScalar: 0.97,
  },
  spark: {
    id: 'spark',
    name: 'Spark',
    tier: 'starter',
    primaryHex: '#8a52c7',
    glowHex: '#c699ff',
    opposingId: 'tide',
    crestShape: 'Jagged Bolt',
    crestSvgPath: 'M13 2L5 13H11L9 22L19 10H13L15 2Z',
    archetype: 'High-risk storm cannons & explosive crits',
    baseAccuracy: 74,
    baseCritPct: 16,
    powerScalar: 1.12,
  },
  umbra: {
    id: 'umbra',
    name: 'Umbra',
    tier: 'rare',
    primaryHex: '#524175',
    glowHex: '#a389e0',
    opposingId: 'sol',
    crestShape: 'Crescent Nocturne',
    crestSvgPath: 'M15 3C9.5 3.5 5 8 5 13.5C5 18.5 9 21 14 21C10.5 19 9 15.5 9.5 11.5C10 7.5 12 5 15 3ZM17 7L18 9L20 10L18 11L17 13L16 11L14 10L16 9Z',
    archetype: 'HP-drain hexes, weaknesses & shadow pacts',
    baseAccuracy: 82,
    baseCritPct: 13,
    powerScalar: 1.18,
  },
  sol: {
    id: 'sol',
    name: 'Sol',
    tier: 'rare',
    primaryHex: '#d4901c',
    glowHex: '#ffd166',
    opposingId: 'umbra',
    crestShape: 'Solar Starburst',
    crestSvgPath: 'M12 2L14 8L20 5L16 10L22 12L16 14L20 19L14 16L12 22L10 16L4 19L8 14L2 12L8 10L4 5L10 8Z',
    archetype: 'Radiant spears, group buffs & purge wards',
    baseAccuracy: 86,
    baseCritPct: 12,
    powerScalar: 1.18,
  },
  verdigris: {
    id: 'verdigris',
    name: 'Verdigris',
    tier: 'rare',
    primaryHex: '#2f8a73',
    glowHex: '#7ef0cb',
    opposingId: 'chronos',
    crestShape: 'Forged Anvil Hex',
    crestSvgPath: 'M4 7H20L17 11H14V16L18 20H6L10 16V11H7Z',
    archetype: 'Runeforged armor-pierce & metallic relics',
    baseAccuracy: 84,
    baseCritPct: 11,
    powerScalar: 1.18,
  },
  chronos: {
    id: 'chronos',
    name: 'Chronos',
    tier: 'rare',
    primaryHex: '#9c6644',
    glowHex: '#f4c98b',
    opposingId: 'verdigris',
    crestShape: 'Twin Hourglass',
    crestSvgPath: 'M6 3H18V6L13.5 12L18 18V21H6V18L10.5 12L6 6ZM9 5L12 9L15 5ZM9 19H15L12 15Z',
    archetype: 'Pip acceleration, echo turns & astral precision',
    baseAccuracy: 85,
    baseCritPct: 14,
    powerScalar: 1.18,
  },
  magma: {
    id: 'magma',
    name: 'Magma',
    tier: 'fusion',
    primaryHex: '#b83b1d',
    glowHex: '#ff7033',
    fusionParents: ['ember', 'bramble'],
    crestShape: 'Cracked Caldera',
    crestSvgPath: 'M4 19L9 7L12 12L15 6L20 19ZM9 19L12 14L15 19Z',
    archetype: 'Molten siege blasts & living crust shields',
    baseAccuracy: 84,
    baseCritPct: 13,
    powerScalar: 1.22,
  },
  tempest: {
    id: 'tempest',
    name: 'Tempest',
    tier: 'fusion',
    primaryHex: '#4f5fd1',
    glowHex: '#98a6ff',
    fusionParents: ['tide', 'spark'],
    crestShape: 'Maelstrom Eye',
    crestSvgPath: 'M12 3C17 3 21 7 21 12C21 15 19 18 16 19.5M12 21C7 21 3 17 3 12C3 9 5 6 8 4.5M13 8L9 13H12L11 17L15 11.5H12Z',
    archetype: 'Surging storm-tides & multi-target chain arcs',
    baseAccuracy: 80,
    baseCritPct: 15,
    powerScalar: 1.24,
  },
  glacier: {
    id: 'glacier',
    name: 'Glacier',
    tier: 'fusion',
    primaryHex: '#2f95b8',
    glowHex: '#aef2ff',
    fusionParents: ['frost', 'tide'],
    crestShape: 'Faceted Iceberg',
    crestSvgPath: 'M12 2L19 9L16 20H8L5 9ZM12 5L9 10L12 18L15 10Z',
    archetype: 'Rime barriers, chill locks & crushing glacial waves',
    baseAccuracy: 87,
    baseCritPct: 10,
    powerScalar: 1.18,
  },
  eclipse: {
    id: 'eclipse',
    name: 'Eclipse',
    tier: 'fusion',
    primaryHex: '#7d3c68',
    glowHex: '#ff96c5',
    fusionParents: ['umbra', 'sol'],
    crestShape: 'Corona Ring',
    crestSvgPath: 'M12 4A8 8 0 1 0 12 20A8 8 0 1 0 12 4ZM13.5 6.5A5.5 5.5 0 1 1 8.5 15.5A6 6 0 0 0 13.5 6.5Z',
    archetype: 'Twilight balance of drain & solar burst',
    baseAccuracy: 85,
    baseCritPct: 15,
    powerScalar: 1.26,
  },
  aetheris: {
    id: 'aetheris',
    name: 'Aetheris',
    tier: 'fusion',
    primaryHex: '#5a8f99',
    glowHex: '#d1fff7',
    fusionParents: ['chronos', 'verdigris'],
    crestShape: 'Celestial Astrolabe',
    crestSvgPath: 'M12 2V22M2 12H22M12 5A7 7 0 1 1 11.99 5ZM12 8A4 4 0 1 0 12 16A4 4 0 1 0 12 8Z',
    archetype: 'Runic time-forged beams & universal pierce',
    baseAccuracy: 88,
    baseCritPct: 14,
    powerScalar: 1.26,
  },
};

export const ELEMENT_LIST: ElementDefinition[] = Object.values(ELEMENTS);
export const STARTER_ELEMENTS = ELEMENT_LIST.filter((e) => e.tier === 'starter');
export const RARE_ELEMENTS = ELEMENT_LIST.filter((e) => e.tier === 'rare');
export const FUSION_ELEMENTS = ELEMENT_LIST.filter((e) => e.tier === 'fusion');

export function getElementMatchupMultiplier(attacker: ElementId, defender: ElementId): number {
  const atk = ELEMENTS[attacker];
  if (attacker === defender) return 0.85; // -15% mirror resist
  if (atk.opposingId === defender) return 1.25; // +25% opposing advantage
  if (atk.fusionParents && atk.fusionParents.some((p) => ELEMENTS[p].opposingId === defender)) {
    return 1.15;
  }
  return 1.0;
}

export function isValidElementId(id: string): id is ElementId {
  return id in ELEMENTS;
}
