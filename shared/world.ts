import type { ElementId } from './elements.ts';
import type { RaceId } from './wardrobe.ts';

export type ZoneId = 'hub' | 'amphitheater' | 'arbor' | 'sanctuary';

export interface ZoneDefinition {
  id: ZoneId;
  name: string;
  subtitle: string;
  spawnPos: [number, number, number];
}

export const ZONES: Record<ZoneId, ZoneDefinition> = {
  hub: {
    id: 'hub',
    name: 'Central Academy Commons',
    subtitle: 'Sunlit courtyard, Velvet Thimble, Bazaar, & Campus Mentors',
    spawnPos: [0, 0, 8],
  },
  amphitheater: {
    id: 'amphitheater',
    name: 'Duel Amphitheater',
    subtitle: 'Stone duel rings, Rare Trial Pedestals, PvP & Spire Gate',
    spawnPos: [0, 0, 11],
  },
  arbor: {
    id: 'arbor',
    name: 'Hatchery & Training Arbor',
    subtitle: 'Greenhouse nest, Rune-Catch rings, & Cloud-Pier Fishing',
    spawnPos: [0, 0, 10],
  },
  sanctuary: {
    id: 'sanctuary',
    name: 'Personal Sanctuary Dorm',
    subtitle: 'Sky-island loft, Garden Plots, Workbench & Public Tours',
    spawnPos: [0, 0, 7],
  },
};

export interface CampusNpc {
  id: string;
  name: string;
  role: string;
  raceId: RaceId;
  elementId: ElementId;
  zone: ZoneId;
  position: [number, number, number];
  greeting: string;
  opensPanel: 'quests' | 'shops' | 'tailor' | 'creatures' | 'duel' | 'deck' | 'bazaar' | 'lectern';
}

export const CAMPUS_NPCS: CampusNpc[] = [
  {
    id: 'npc_headmaster_vance',
    name: 'Headmaster Vance',
    role: 'Academy Dean',
    raceId: 'human',
    elementId: 'sol',
    zone: 'hub',
    position: [0, 0, -5],
    greeting: 'Welcome back to Aldervale! Check your Saga Ledger or Claim your Term Track rewards.',
    opensPanel: 'quests',
  },
  {
    id: 'npc_tailor_selene',
    name: 'Stitchmaster Selene',
    role: 'Velvet Thimble Tailor',
    raceId: 'dryad',
    elementId: 'bramble',
    zone: 'hub',
    position: [-9, 0, -1],
    greeting: 'Every cloak and bomber fits horns, wings, fins, and molten Stoneborn cracks cleanly.',
    opensPanel: 'tailor',
  },
  {
    id: 'npc_forge_brynn',
    name: 'Forge-Matron Brynn',
    role: 'Quartermaster & Smith',
    raceId: 'dwarf',
    elementId: 'verdigris',
    zone: 'hub',
    position: [9, 0, -1],
    greeting: 'Fresh Runestones and socket chisels! Craft well and your pierce will sing.',
    opensPanel: 'shops',
  },
  {
    id: 'npc_bazaar_nerissa',
    name: 'Dockmaster Nerissa',
    role: 'Courtyard Bazaar Broker',
    raceId: 'tide_siren',
    elementId: 'tide',
    zone: 'hub',
    position: [8, 0, 7],
    greeting: 'Browse listings from fellow wizards in this exact Realm—zero bots, fair Florins.',
    opensPanel: 'bazaar',
  },
  {
    id: 'npc_archivist_lyra',
    name: 'Archivist Lyra',
    role: 'Spire Scriptorium & Lectern',
    raceId: 'dark_elf',
    elementId: 'umbra',
    zone: 'hub',
    position: [-8, 0, 7],
    greeting: 'Need Spellwrighting tips or a custom fusion strategy? Open the Archivist Lectern.',
    opensPanel: 'lectern',
  },
  {
    id: 'npc_arbor_liri',
    name: 'Keeper Liri',
    role: 'Hatchery & Fishing Warden',
    raceId: 'river_naiad',
    elementId: 'frost',
    zone: 'arbor',
    position: [0, 0, -5],
    greeting: 'Care for your creatures, charge Hybrid Eggs in battle, or cast a line off Cloud-Pier.',
    opensPanel: 'creatures',
  },
  {
    id: 'npc_duel_marshal',
    name: 'Marshal Zephyr',
    role: 'Amphitheater Arbiter',
    raceId: 'sky_avian',
    elementId: 'gale',
    zone: 'amphitheater',
    position: [0, 0, -6],
    greeting: 'Step onto a sigil for Solo Skirmishes, Rare Trials, Co-op Team-Ups, or the 10-Floor Spire!',
    opensPanel: 'duel',
  },
];

export interface MountDef {
  id: string;
  name: string;
  speedMultiplier: number;
  priceFlorins: number;
  accentHex: string;
}

export const MOUNTS: MountDef[] = [
  { id: 'mount_cloud_broom', name: 'Alder-Pine Cloud Broom', speedMultiplier: 1.45, priceFlorins: 0, accentHex: '#d4901c' },
  { id: 'mount_clockwork_stag', name: 'Verdigris Clockwork Stag', speedMultiplier: 1.55, priceFlorins: 380, accentHex: '#2f8a73' },
  { id: 'mount_nimbus_hoverboard', name: 'Nimbus Rune-Board', speedMultiplier: 1.6, priceFlorins: 520, accentHex: '#4f5fd1' },
];

export interface QuestDef {
  id: string;
  title: string;
  giverNpc: string;
  description: string;
  targetWins: number;
  rewardFlorins: number;
  rewardXp: number;
  rewardShards: number;
}

export const CAMPUS_QUESTS: QuestDef[] = [
  {
    id: 'q_first_duel',
    title: 'First Spark in the Ring',
    giverNpc: 'Headmaster Vance',
    description: 'Win 1 solo skirmish in the Duel Amphitheater.',
    targetWins: 1,
    rewardFlorins: 110,
    rewardXp: 90,
    rewardShards: 3,
  },
  {
    id: 'q_bond_arbor',
    title: 'Harmony of the Arbor',
    giverNpc: 'Keeper Liri',
    description: 'Play Rune-Catch or win 2 battles with your Lead Creature.',
    targetWins: 2,
    rewardFlorins: 160,
    rewardXp: 140,
    rewardShards: 4,
  },
  {
    id: 'q_rare_trial',
    title: 'Trial of the Hidden Crown',
    giverNpc: 'Marshal Zephyr',
    description: 'Reach Rank 4 and challenge a Rare Trial Guardian (Umbra, Sol, Verdigris, or Chronos).',
    targetWins: 3,
    rewardFlorins: 320,
    rewardXp: 260,
    rewardShards: 8,
  },
];

export interface DormItemCatalogDef {
  id: string;
  name: string;
  category: 'furniture' | 'trophy' | 'garden' | 'interactive';
  priceFlorins: number;
  triggerKind?: 'music_box' | 'mannequin' | 'workbench' | 'fountain' | 'garden_plot' | 'wall_painting';
  colorHex: string;
}

export const DORM_CATALOG: DormItemCatalogDef[] = [
  { id: 'dorm_rug', name: 'Woven Starlight Rug', category: 'furniture', priceFlorins: 60, colorHex: '#9c4146' },
  { id: 'dorm_bookshelf', name: 'Oak Spellbook Case', category: 'furniture', priceFlorins: 95, colorHex: '#7c5338' },
  { id: 'dorm_musicbox', name: 'Clockwork Harp Music Box', category: 'interactive', priceFlorins: 140, triggerKind: 'music_box', colorHex: '#d4901c' },
  { id: 'dorm_mannequin', name: 'Gear Display Mannequin', category: 'interactive', priceFlorins: 160, triggerKind: 'mannequin', colorHex: '#52658c' },
  { id: 'dorm_workbench', name: 'Runeforge Workbench', category: 'interactive', priceFlorins: 180, triggerKind: 'workbench', colorHex: '#2f8a73' },
  { id: 'dorm_garden_plot', name: 'Sky-Soil Garden Plot', category: 'garden', priceFlorins: 110, triggerKind: 'garden_plot', colorHex: '#5a8f49' },
  { id: 'dorm_skylens_frame', name: 'Sky-Lens Gilded Frame', category: 'trophy', priceFlorins: 120, triggerKind: 'wall_painting', colorHex: '#c89b3c' },
];

export const DORM_THEMES = [
  { id: 'sunlit_loft', name: 'Sunlit Timber Loft', floorHex: '#b88b5a', skyHex: '#cfe7f5' },
  { id: 'nocturne_observatory', name: 'Nocturne Observatory', floorHex: '#3c415c', skyHex: '#1f2544' },
  { id: 'verdigris_conservatory', name: 'Verdigris Conservatory', floorHex: '#6c876f', skyHex: '#d7efe2' },
] as const;

export const DORM_WEATHERS = ['clear_breeze', 'fireflies', 'gentle_snow', 'petal_drift'] as const;
