import type { ResourceId } from './economy.ts';
import type { ElementId } from './elements.ts';
import type { ModularGearItem, RaceId, WizardSculpt } from './wardrobe.ts';

export const PROGRESSION_VERSION = 1;

export type GameplayAction =
  | { type: 'buyGear' | 'buySpell' | 'buyMount' | 'equip' | 'socket' | 'vaultDeposit' | 'dormBuy'; id: string }
  | { type: 'almanac' | 'transmute' | 'mountToggle' | 'runeStart' | 'runeCatch' }
  | { type: 'deck'; id: string; add: boolean }
  | { type: 'wright' | 'branch'; id: string; branch: 'A' | 'B' }
  | { type: 'lead' | 'adopt'; id: string }
  | { type: 'egg'; first: string; second: string }
  | { type: 'appearance'; patch: Partial<WizardSculpt> }
  | { type: 'stitch'; slot: ModularGearItem['slot']; item: string | null }
  | { type: 'rebirth'; race: RaceId }
  | { type: 'vaultWithdraw'; index: number; id: string }
  | { type: 'world'; id: string }
  | { type: 'dormTheme' | 'dormWeather'; id: string }
  | { type: 'dormMove'; id: string; patch: Partial<{ x: number; y: number; z: number; rotY: number; scale: number }> }
  | { type: 'gardenPlant'; index: number; element: ElementId }
  | { type: 'gardenHarvest'; index: number };

export type RunGameplayAction = (action: GameplayAction) => Promise<GameplayFeedback | undefined>;
export interface GameplayFeedback {
  notice: string;
  rune?: { startedAt: number; serverNow: number };
}

export function runeCursorAt(elapsedMs: number): number {
  const step = (Math.floor(Math.max(0, elapsedMs) / 45) + 2) % 46;
  return 4 + (step <= 23 ? step : 46 - step) * 4;
}

export interface ProgressionNode {
  id: string;
  kind: 'fountain' | 'wisp' | 'resource' | 'fishing';
  x: number;
  z: number;
  resource?: ResourceId;
}

export function gatherNode(id: string, zone: string, resources: readonly ResourceId[]): ProgressionNode | undefined {
  if (id === 'fountain_main' && zone === 'hub') return { id, kind: 'fountain', x: 0, z: 0 };
  if (id === 'cloud_pier' && zone === 'arbor') return { id, kind: 'fishing', x: 11, z: 10.6 };
  if (zone !== 'hub' && zone !== 'arbor') return;
  if (id === 'wisp_0') return { id, kind: 'wisp', x: -6, z: 9 };
  if (id === 'wisp_1') return { id, kind: 'wisp', x: 7, z: -8 };
  const index = resources.findIndex((resource, i) => id === `res_${resource}_${i}`);
  if (index < 0) return;
  const angle = index * 1.25 + 0.6;
  return { id, kind: 'resource', resource: resources[index], x: Math.cos(angle) * 14.8, z: Math.sin(angle) * 14.8 };
}
