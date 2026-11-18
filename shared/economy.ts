import type { ElementId } from './elements.ts';
import type { RealmId } from './realms.ts';
import type { BeastClanId, RaceId, WizardSculpt } from './wardrobe.ts';
import { SPECIES_BY_ID } from './creatures.ts';
import { getStarterDeckForElement } from './spells.ts';

export type ResourceId = 'sunleaf' | 'dewglass' | 'starstone' | 'copper_wire' | 'ember_ash';

export const CRAFT_XP_PER_RANK = 100;
export const CRAFT_XP_PER_TRANSMUTE = 25;

export function craftProgressionAfterGain(craftXp: number, gained: number) {
  const nextXp = craftXp + gained;
  return { craftXp: nextXp, craftRank: 1 + Math.floor(nextXp / CRAFT_XP_PER_RANK) };
}

export interface ResourceDef {
  id: ResourceId;
  name: string;
  colorHex: string;
  zoneHint: string;
}

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  sunleaf: { id: 'sunleaf', name: 'Sunleaf Sprig', colorHex: '#63a355', zoneHint: 'Canopy & Arbor' },
  dewglass: { id: 'dewglass', name: 'Dewglass Drop', colorHex: '#5bb8d4', zoneHint: 'Fountain & Pier' },
  starstone: { id: 'starstone', name: 'Starstone Shard', colorHex: '#8d7ae6', zoneHint: 'Astrolabe & Cliffs' },
  copper_wire: { id: 'copper_wire', name: 'Copper Rune-Wire', colorHex: '#c97a40', zoneHint: 'Forge Plaza' },
  ember_ash: { id: 'ember_ash', name: 'Cinder Hearth-Ash', colorHex: '#d9532f', zoneHint: 'Duel Amphitheater' },
};

export interface TermTierReward {
  tier: number;
  xpRequired: number;
  label: string;
  reward: {
    florins?: number;
    seals?: number;
    shards?: number;
    honorMarks?: number;
    cosmeticId?: string;
  };
}

export const TERM_REWARD_TRACK: TermTierReward[] = [
  { tier: 1, xpRequired: 60, label: 'Welcome Stipend', reward: { florins: 120, shards: 3 } },
  { tier: 2, xpRequired: 140, label: 'Bonding Seal Gift', reward: { seals: 1, florins: 100 } },
  { tier: 3, xpRequired: 240, label: 'Tailor Visor Kit', reward: { cosmeticId: 'hat_arcane_phones', shards: 5 } },
  { tier: 4, xpRequired: 360, label: 'Quartermaster Marks', reward: { honorMarks: 25, florins: 180 } },
  { tier: 5, xpRequired: 500, label: 'Nimbus Scarf & Seals', reward: { cosmeticId: 'back_scarf', seals: 2 } },
  { tier: 6, xpRequired: 680, label: 'Astrolabe Mastery', reward: { cosmeticId: 'staff_astrolabe', shards: 8, florins: 250 } },
  { tier: 7, xpRequired: 880, label: 'Sky-Trench Prestige', reward: { cosmeticId: 'torso_poncho', honorMarks: 40 } },
  { tier: 8, xpRequired: 1120, label: 'Lineage Rebirth Seal', reward: { seals: 3, shards: 12, florins: 400 } },
];

export interface WizardCurrencies {
  florins: number;
  honorMarks: number;
  bondingSeals: number;
  spellShards: number;
}

export interface WizardLoadout {
  name: string;
  gearIds: Record<'headgear' | 'torso' | 'back' | 'footwear' | 'staff', string>;
  deck: string[];
}

export interface WizardDocument {
  serverProgressionVersion?: number;
  id: string;
  ownerId: string;
  realmId: RealmId;
  name: string;
  raceId: RaceId;
  beastClan?: BeastClanId;
  elementId: ElementId;
  level: number;
  xp: number;
  rank: number;
  sculpt: WizardSculpt;
  wardrobe: {
    equipped: Record<'headgear' | 'torso' | 'back' | 'footwear' | 'staff', string>;
    ownedGearIds: string[];
    socketedRunestones: string[];
  };
  stitching: Record<'headgear' | 'torso' | 'back' | 'footwear' | 'staff', string | null>;
  currencies: WizardCurrencies;
  resources: Record<ResourceId, number>;
  progression: {
    craftRank: number;
    craftXp: number;
    fishingRank: number;
    flasks: number;
    maxFlasks: number;
    mana: number;
    maxMana: number;
    deck: string[];
    sideboard: string[];
    ownedSpellIds: string[];
    spellwrighting: Record<string, 'A' | 'B'>;
    unlockedElements: ElementId[];
    unlockedFusions: ElementId[];
    ownedMounts: string[];
    equippedMountId: string | null;
    rebirthSeals: number;
    spireBestFloor: number;
    almanacDay: number;
    lastAlmanacClaim: string;
    completedQuests: string[];
    questWins?: Record<string, number>;
    bestiarySeen: string[];
    titleBadge: string;
    loadouts: WizardLoadout[];
    eggs: { id: string; parentA: string; parentB: string; resultSpeciesId: string; winsNeeded: number; winsDone: number }[];
  };
  activeCreatureId: string;
}

export function applyTermReward(wizard: WizardDocument, tier: TermTierReward): WizardDocument {
  const { reward } = tier;
  return {
    ...wizard,
    currencies: {
      florins: wizard.currencies.florins + (reward.florins ?? 0),
      honorMarks: wizard.currencies.honorMarks + (reward.honorMarks ?? 0),
      bondingSeals: wizard.currencies.bondingSeals + (reward.seals ?? 0),
      spellShards: wizard.currencies.spellShards + (reward.shards ?? 0),
    },
    wardrobe: reward.cosmeticId && !wizard.wardrobe.ownedGearIds.includes(reward.cosmeticId)
      ? { ...wizard.wardrobe, ownedGearIds: [...wizard.wardrobe.ownedGearIds, reward.cosmeticId] }
      : wizard.wardrobe,
    progression: tier.tier === 8 ? { ...wizard.progression, rebirthSeals: wizard.progression.rebirthSeals + 1 } : wizard.progression,
  };
}

export function grantFusionSpells(
  wizard: WizardDocument,
  creatures: readonly {
    speciesId: string;
    ownerId: string;
    wizardId: string;
    realmId: RealmId;
  }[],
): WizardDocument {
  const currentFusions = wizard.progression.unlockedFusions ?? [];
  const currentSpells = wizard.progression.ownedSpellIds;
  const unlockedFusions = new Set(currentFusions);
  const ownedSpellIds = new Set(currentSpells);
  let changed = false;

  for (const creature of creatures) {
    if (creature.ownerId !== wizard.ownerId || creature.wizardId !== wizard.id || creature.realmId !== wizard.realmId) continue;
    const species = SPECIES_BY_ID[creature.speciesId];
    if (!species?.isFusionOnly) continue;

    if (!unlockedFusions.has(species.element)) {
      unlockedFusions.add(species.element);
      changed = true;
    }
    if (!ownedSpellIds.has(species.innatePactCardId)) {
      ownedSpellIds.add(species.innatePactCardId);
      changed = true;
    }
  }

  if (!changed) return wizard;
  return {
    ...wizard,
    progression: {
      ...wizard.progression,
      unlockedFusions: [...unlockedFusions],
      ownedSpellIds: [...ownedSpellIds],
    },
  };
}

export function createStarterWizard(params: {
  id: string;
  ownerId: string;
  realmId: RealmId;
  name: string;
  raceId: RaceId;
  beastClan?: BeastClanId;
  elementId: ElementId;
  sculpt: WizardSculpt;
}): WizardDocument {
  const starterDeck = getStarterDeckForElement(params.elementId);
  const ownedSpells = Array.from(new Set([...starterDeck, 'uni_enchant_keen', 'uni_reshuffle']));

  return {
    id: params.id,
    ownerId: params.ownerId,
    realmId: params.realmId,
    name: params.name,
    raceId: params.raceId,
    beastClan: params.beastClan,
    elementId: params.elementId,
    level: 1,
    xp: 0,
    rank: 1,
    sculpt: params.sculpt,
    wardrobe: {
      equipped: {
        headgear: 'hat_academy_cap',
        torso: 'torso_bomber',
        back: 'back_satchel',
        footwear: 'boots_sneakers',
        staff: 'staff_oak_wand',
      },
      ownedGearIds: ['hat_academy_cap', 'torso_bomber', 'back_satchel', 'boots_sneakers', 'staff_oak_wand'],
      socketedRunestones: [],
    },
    stitching: {
      headgear: null,
      torso: null,
      back: null,
      footwear: null,
      staff: null,
    },
    currencies: {
      florins: 220,
      honorMarks: 10,
      bondingSeals: 2,
      spellShards: 4,
    },
    resources: {
      sunleaf: 3,
      dewglass: 3,
      starstone: 1,
      copper_wire: 2,
      ember_ash: 2,
    },
    progression: {
      craftRank: 1,
      craftXp: 0,
      fishingRank: 1,
      flasks: 2,
      maxFlasks: 3,
      mana: 100,
      maxMana: 100,
      deck: starterDeck,
      sideboard: ['uni_enchant_keen', 'frost_tower_ward', 'bramble_dryad_bloom'],
      ownedSpellIds: ownedSpells,
      spellwrighting: {},
      unlockedElements: ['ember', 'frost', 'gale', 'bramble', 'tide', 'spark'],
      unlockedFusions: [],
      ownedMounts: ['mount_cloud_broom'],
      equippedMountId: null,
      rebirthSeals: 0,
      spireBestFloor: 0,
      almanacDay: 1,
      lastAlmanacClaim: '',
      completedQuests: [],
      bestiarySeen: [],
      titleBadge: 'First-Year Initiate',
      loadouts: [
        {
          name: 'Everyday Duelist',
          gearIds: {
            headgear: 'hat_academy_cap',
            torso: 'torso_bomber',
            back: 'back_satchel',
            footwear: 'boots_sneakers',
            staff: 'staff_oak_wand',
          },
          deck: starterDeck,
        },
      ],
      eggs: [],
    },
    activeCreatureId: `${params.id}_starter_pet`,
  };
}
