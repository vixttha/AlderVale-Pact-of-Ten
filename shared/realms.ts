export type RealmId = 'breeze' | 'horizon' | 'everpeak';

export interface RealmConfig {
  id: RealmId;
  name: string;
  tagline: string;
  targetLength: string;
  xpMultiplier: number;
  dropMultiplier: number;
  bondMultiplier: number;
  accentHex: string;
  description: string;
}

export const REALMS: Record<RealmId, RealmConfig> = {
  breeze: {
    id: 'breeze',
    name: 'Breeze',
    tagline: '~25-Min Fast Path',
    targetLength: '25 min',
    xpMultiplier: 3.5,
    dropMultiplier: 2.5,
    bondMultiplier: 3.0,
    accentHex: '#38a3a5',
    description: 'Rapid academy ascent for quick solo/PvP mastery, fast Rare Trials, and speedy lineage unlocks.',
  },
  horizon: {
    id: 'horizon',
    name: 'Horizon',
    tagline: '~1-Hr Balanced Path',
    targetLength: '1 hour',
    xpMultiplier: 1.75,
    dropMultiplier: 1.5,
    bondMultiplier: 1.75,
    accentHex: '#d97706',
    description: 'Brisk evening adventure pacing with steady crafting, creature stages, and balanced guild competition.',
  },
  everpeak: {
    id: 'everpeak',
    name: 'Everpeak',
    tagline: '~3-Hr Classic Saga',
    targetLength: '3 hours',
    xpMultiplier: 1.0,
    dropMultiplier: 1.0,
    bondMultiplier: 1.0,
    accentHex: '#6d597a',
    description: 'Classic Wizard-academy progression where every duel, crafted garment, and rare unlock feels hard-won.',
  },
};

export const REALM_LIST: RealmConfig[] = [REALMS.breeze, REALMS.horizon, REALMS.everpeak];

export function xpRequiredForLevel(level: number): number {
  return Math.round(90 + level * 45 + level * level * 12);
}

export function rankFromLevel(level: number): number {
  return Math.min(20, Math.max(1, Math.floor((level + 1) / 2)));
}
