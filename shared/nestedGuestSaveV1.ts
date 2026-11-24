import type { RealmId } from './realms.ts';
import { readLegacyGuestSave } from './legacyGuestSave.ts';
import * as v1 from './legacyGuestCatalogV1.ts';

type RecordValue = Record<string, unknown>;
type Code = 'invalid-json' | 'duplicate-key' | 'inspection-limit' | 'invalid-shape' | 'unsupported-version' | 'identity-mismatch' | 'unknown-reference' | 'invalid-value';
export type NestedSaveDiagnostic = { code: Code; path: string };
export type NestedGuestSave =
  | { kind: 'missing' }
  | { kind: 'validated'; raw: string; legacyAffinityPresent: boolean }
  | { kind: 'recovery-required'; raw: string; diagnostics: NestedSaveDiagnostic[] };

const maxRawLength = 10 * 1024 * 1024; // UTF-16 code units; fail closed, never truncate.
const maxDepth = 128;
const maxDiagnostics = 64;
const slots = ['headgear', 'torso', 'back', 'footwear', 'staff'] as const;
const record = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const identity = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && !['__proto__', 'constructor', 'prototype'].includes(value);
const text = (value: unknown): value is string => typeof value === 'string';
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const integer = (value: unknown, low = 0, high = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= low && value <= high;
const within = (value: unknown, low: number, high: number): value is number => finite(value) && value >= low && value <= high;
const has = (values: readonly unknown[], value: unknown) => values.includes(value);
const catalog = (values: object, value: unknown): value is string => identity(value) && Object.hasOwn(values, value);
const hex = (value: unknown) => text(value) && /^#[0-9a-f]{6}$/i.test(value);

/** JSON.parse alone silently accepts duplicate keys, even with different escaping.
 * Scan the already syntax-checked JSON tokens without recursive descent or raw data in diagnostics.
 * Unknown extension data remains in the original string, not a reconstructed object.
 */
function inspectTokens(raw: string): Code | null {
  const tokens = /"(?:[^"\\]|\\.)*"|[{}\[\]:,]|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g;
  const stack: (Set<string> | null)[] = [];
  let match: RegExpExecArray | null;
  while ((match = tokens.exec(raw)) !== null) {
    const token = match[0];
    if (token === '{' || token === '[') {
      stack.push(token === '{' ? new Set<string>() : null);
      if (stack.length > maxDepth) return 'inspection-limit';
    } else if (token === '}' || token === ']') {
      stack.pop();
    } else if (token[0] === '"') {
      let index = tokens.lastIndex;
      while (/\s/.test(raw[index] ?? '') && index < raw.length) index++;
      const keys = stack[stack.length - 1];
      if (keys && raw[index] === ':') {
        const key = JSON.parse(token) as string;
        if (keys.has(key)) return 'duplicate-key';
        keys.add(key);
      }
    } else if (/^[-0-9]/.test(token)) {
      const value = Number(token);
      if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) return 'invalid-value';
    }
  }
  return null;
}

/**
 * Isolated validation of historical guest v1 serialized data. "validated" only
 * permits consideration for a byte-identical staging copy, not gameplay, new
 * registry eligibility, entitlement synthesis, or permission to replace data.
 * No storage, IO, mutation, conversion, or serialization of player data.
 */
export function validateNestedGuestSave(raw: string | null, realm: RealmId): NestedGuestSave {
  if (raw === null) return { kind: 'missing' };
  const diagnostics: NestedSaveDiagnostic[] = [];
  const add = (path: string, code: Code = 'invalid-value') => {
    if (diagnostics.length < maxDiagnostics) diagnostics.push({ path, code });
  };
  const recover = (): NestedGuestSave => ({ kind: 'recovery-required', raw, diagnostics });
  if (!has(['breeze', 'horizon', 'everpeak'], realm)) { add('$', 'identity-mismatch'); return recover(); }
  if (raw.length > maxRawLength) { add('$', 'inspection-limit'); return recover(); }
  let envelope: unknown;
  try { envelope = JSON.parse(raw); } catch { add('$', 'invalid-json'); return recover(); }
  const tokenIssue = inspectTokens(raw);
  if (tokenIssue) { add('$', tokenIssue); return recover(); }
  const preliminary = readLegacyGuestSave(raw, realm);
  let legacyAffinityPresent = false;
  if (preliminary.kind === 'recovery-required') {
    for (const diagnostic of preliminary.diagnostics) {
      if (diagnostic.code === 'retired-element') legacyAffinityPresent = true;
      else add(diagnostic.path, diagnostic.code === 'unknown-element' ? 'unknown-reference' : diagnostic.code);
    }
  }
  if (diagnostics.length) return recover();
  if (!record(envelope)) { add('$', 'invalid-shape'); return recover(); }

  const obj = (value: unknown, path: string): RecordValue => {
    if (record(value)) return value;
    add(path, 'invalid-shape'); return {};
  };
  const arr = (value: unknown, path: string): unknown[] => {
    if (Array.isArray(value)) return value;
    add(path, 'invalid-shape'); return [];
  };
  const check = (ok: unknown, path: string, code: Code = 'invalid-value') => { if (!ok) add(path, code); };
  const stringList = (value: unknown, path: string, accept: (entry: unknown) => boolean, unique = false) => {
    const entries = arr(value, path);
    entries.forEach((entry, i) => check(accept(entry), path + '[' + i + ']', 'unknown-reference'));
    if (unique) check(new Set(entries).size === entries.length, path, 'identity-mismatch');
    return entries;
  };
  const known = (values: readonly unknown[]) => (value: unknown) => has(values, value);
  const element = (value: unknown, path: string) => {
    check(has(v1.elements, value), path, 'unknown-reference');
    if (has(['chronos', 'magma', 'tempest', 'glacier', 'eclipse', 'aetheris'], value)) legacyAffinityPresent = true;
  };
  const count = (r: RecordValue, fields: readonly string[], path: string, low = 0) =>
    fields.forEach(key => check(integer(r[key], low), path + '.' + key));
  const gear = (value: unknown, slot: string, path: string, nullable: boolean) => {
    if (nullable && value === null) return;
    if (!nullable && value === '') return; // An empty equipment slot is supported by wearableEquipment.
    check(catalog(v1.gear, value) && (v1.gear as Record<string,string>)[value] === slot, path, 'unknown-reference');
  };
  const gearSlots = (value: unknown, path: string, nullable = false) => {
    const r = obj(value, path);
    slots.forEach(slot => gear(r[slot], slot, path + '.' + slot, nullable));
    return r;
  };
  const deck = (value: unknown, path: string) => {
    const entries = stringList(value, path, known(v1.spells));
    check(entries.length >= 24 && entries.length <= 40, path);
    return entries;
  };
  const account = obj(envelope.account, 'account');
  const wizardIds = stringList(account.wizardIds, 'account.wizardIds', identity, true);
  const races = stringList(account.unlockedRaces, 'account.unlockedRaces', known(v1.races), true);
  const sharedGear = stringList(account.sharedVault, 'account.sharedVault', id => catalog(v1.gear, id));
  check(integer(account.termXp), 'account.termXp');
  const tiers = arr(account.claimedTermTiers, 'account.claimedTermTiers');
  check(tiers.every(value => integer(value, 1, 8)), 'account.claimedTermTiers');
  check(new Set(tiers).size === tiers.length, 'account.claimedTermTiers', 'identity-mismatch');
  const wizards = arr(envelope.wizards, 'wizards');
  check(wizardIds.length === wizards.length && wizards.length <= 3, 'wizards', 'identity-mismatch');
  const creatures = obj(envelope.creatures, 'creatures');
  const sanctuaries = obj(envelope.sanctuaries, 'sanctuaries');
  const globalPetIds = new Set<unknown>();

  wizards.forEach((value, i) => {
    const path = 'wizards[' + i + ']';
    const w = obj(value, path);
    check(identity(w.id) && wizardIds.includes(w.id), path + '.id', 'identity-mismatch');
    check(w.serverProgressionVersion === undefined, path + '.serverProgressionVersion', 'unsupported-version');
    check(text(w.name) && w.name.trim().length >= 2 && w.name.length <= 24, path + '.name');
    check(has(v1.races, w.raceId) && races.includes(w.raceId), path + '.raceId', 'unknown-reference');
    check(w.beastClan === undefined ? w.raceId !== 'beastfolk' : has(v1.clans, w.beastClan), path + '.beastClan');
    element(w.elementId, path + '.elementId');
    check(integer(w.level, 1, 50), path + '.level');
    check(integer(w.rank, 1, 20), path + '.rank');
    check(integer(w.xp, 0, 10_000_000), path + '.xp');
    const s = obj(w.sculpt, path + '.sculpt');
    check(s.humanModel === undefined || has(['rowan', 'classic'], s.humanModel), path + '.sculpt.humanModel');
    check(within(s.height, 0.88, 1.12), path + '.sculpt.height');
    for (const [field, values] of Object.entries({
      build: ['slender', 'balanced', 'athletic'], eyeShape: ['bright', 'sharp', 'gentle'],
      browStyle: ['arched', 'bold', 'soft'], marking: ['none', 'star_freckle', 'cheek_rune', 'brow_scar', 'crescent'],
      castPose: ['scholar', 'duelist', 'drifter'], hairStyle: v1.hair,
    })) check(has(values, s[field]), path + '.sculpt.' + field, 'unknown-reference');
    for (const field of ['skinHex','hairHex','hairTipHex','eyeLeftHex','eyeRightHex','primaryDye','trimDye','accentDye'])
      check(hex(s[field]), path + '.sculpt.' + field);
    const wardrobe = obj(w.wardrobe, path + '.wardrobe');
    const owned = stringList(wardrobe.ownedGearIds, path + '.wardrobe.ownedGearIds', id => catalog(v1.gear, id));
    const equipped = gearSlots(wardrobe.equipped, path + '.wardrobe.equipped');
    slots.forEach(slot => {
      const id = equipped[slot];
      check(id === '' || owned.includes(id) || sharedGear.includes(id), path + '.wardrobe.equipped.' + slot, 'unknown-reference');
    });
    const runes = stringList(wardrobe.socketedRunestones, path + '.wardrobe.socketedRunestones', known(v1.runes));
    check(runes.length <= 6, path + '.wardrobe.socketedRunestones');
    gearSlots(w.stitching, path + '.stitching', true);
    count(obj(w.currencies, path + '.currencies'), ['florins','honorMarks','bondingSeals','spellShards'], path + '.currencies');
    count(obj(w.resources, path + '.resources'), v1.resources, path + '.resources');
    const prog = obj(w.progression, path + '.progression');
    const pp = path + '.progression';
    count(prog, ['craftRank','fishingRank','maxFlasks','maxMana'], pp, 1);
    count(prog, ['craftXp','flasks','mana','rebirthSeals','spireBestFloor'], pp);
    check(integer(prog.flasks) && integer(prog.maxFlasks) && prog.flasks <= prog.maxFlasks, pp + '.flasks');
    check(integer(prog.mana) && integer(prog.maxMana) && prog.mana <= prog.maxMana, pp + '.mana');
    check(integer(prog.almanacDay, 1, 7), pp + '.almanacDay');
    check(text(prog.lastAlmanacClaim) && (prog.lastAlmanacClaim === '' || /^\d{4}-\d{2}-\d{2}$/.test(prog.lastAlmanacClaim)), pp + '.lastAlmanacClaim');
    check(text(prog.titleBadge), pp + '.titleBadge');
    const ownedSpells = stringList(prog.ownedSpellIds, pp + '.ownedSpellIds', known(v1.spells), true);
    deck(prog.deck, pp + '.deck').forEach((id, n) => check(ownedSpells.includes(id), pp + '.deck[' + n + ']', 'unknown-reference'));
    stringList(prog.sideboard, pp + '.sideboard', known(v1.spells));
    const wright = obj(prog.spellwrighting, pp + '.spellwrighting');
    for (const [key, branch] of Object.entries(wright)) {
      check(has(v1.spells, key) && ownedSpells.includes(key) && has(['A','B'], branch), pp + '.spellwrighting', 'unknown-reference');
    }
    for (const key of ['unlockedElements','unlockedFusions']) {
      if (key === 'unlockedFusions' && prog[key] === undefined) continue;
      const list = stringList(prog[key], pp + '.' + key, known(v1.elements), true);
      list.forEach((id, n) => element(id, pp + '.' + key + '[' + n + ']'));
    }
    const mounts = stringList(prog.ownedMounts, pp + '.ownedMounts', known(v1.mounts), true);
    check(prog.equippedMountId === null || mounts.includes(prog.equippedMountId), pp + '.equippedMountId', 'unknown-reference');
    stringList(prog.completedQuests, pp + '.completedQuests', known(v1.quests), true);
    if (prog.questWins !== undefined) {
      const wins = obj(prog.questWins, pp + '.questWins');
      for (const [key, value] of Object.entries(wins)) check(has(v1.quests, key) && integer(value), pp + '.questWins');
    }
    stringList(prog.bestiarySeen, pp + '.bestiarySeen', id => catalog(v1.species, id), true);
    arr(prog.loadouts, pp + '.loadouts').forEach((entry, j) => {
      const lp = pp + '.loadouts[' + j + ']';
      const loadout = obj(entry, lp);
      check(text(loadout.name), lp + '.name');
      gearSlots(loadout.gearIds, lp + '.gearIds');
      deck(loadout.deck, lp + '.deck');
    });
    const eggIds = new Set<unknown>();
    arr(prog.eggs, pp + '.eggs').forEach((entry, j) => {
      const ep = pp + '.eggs[' + j + ']';
      const egg = obj(entry, ep);
      check(identity(egg.id) && !eggIds.has(egg.id), ep + '.id', 'identity-mismatch');
      eggIds.add(egg.id);
      // Historical guest egg parents are nicknames, not pet foreign keys.
      check(text(egg.parentA) && text(egg.parentB), ep + '.parents');
      check(catalog(v1.species, egg.resultSpeciesId), ep + '.resultSpeciesId', 'unknown-reference');
      check(integer(egg.winsNeeded, 1) && integer(egg.winsDone) && egg.winsDone < egg.winsNeeded, ep + '.winsDone');
    });

    const id = identity(w.id) ? w.id : '';
    const pets = arr(Object.hasOwn(creatures, id) ? creatures[id] : undefined, path + '.creatures');
    const petIds = new Set<unknown>();
    pets.forEach((entry, j) => {
      const cp = path + '.creatures[' + j + ']';
      const pet = obj(entry, cp);
      check(identity(pet.id) && !globalPetIds.has(pet.id), cp + '.id', 'identity-mismatch');
      globalPetIds.add(pet.id); petIds.add(pet.id);
      check(pet.serverProgressionVersion === undefined, cp + '.serverProgressionVersion', 'unsupported-version');
      check(text(pet.nickname), cp + '.nickname');
      element(pet.elementId, cp + '.elementId');
      check(catalog(v1.species, pet.speciesId) && (v1.species as Record<string,string>)[pet.speciesId] === pet.elementId, cp + '.speciesId', 'unknown-reference');
      check(integer(pet.stage, 1, 3), cp + '.stage');
      check(has(['none','dawn','dusk'], pet.chromatic), cp + '.chromatic');
      check(has(['A','B'], pet.branchChoice), cp + '.branchChoice');
      count(pet, ['bondXp','wins'], cp);
      stringList(pet.talents, cp + '.talents', known(v1.talents), true);
    });
    check(identity(w.activeCreatureId) && petIds.has(w.activeCreatureId), path + '.activeCreatureId', 'identity-mismatch');
    const dp = path + '.sanctuary';
    const dorm = obj(Object.hasOwn(sanctuaries, id) ? sanctuaries[id] : undefined, dp);
    check(has(v1.themes, dorm.themeId), dp + '.themeId', 'unknown-reference');
    check(has(v1.weather, dorm.weatherId), dp + '.weatherId', 'unknown-reference');
    check(typeof dorm.isPublic === 'boolean', dp + '.isPublic');
    const itemIds = new Set<unknown>();
    arr(dorm.items, dp + '.items').forEach((entry, j) => {
      const ip = dp + '.items[' + j + ']';
      const item = obj(entry, ip);
      check(identity(item.uid) && !itemIds.has(item.uid), ip + '.uid', 'identity-mismatch');
      itemIds.add(item.uid);
      check(has(v1.dorm, item.catalogId), ip + '.catalogId', 'unknown-reference');
      check(text(item.name), ip + '.name');
      for (const field of ['x','y','z','rotY']) check(finite(item[field]), ip + '.' + field);
      check(within(item.scale, 0.5, 2), ip + '.scale');
      check(hex(item.colorHex), ip + '.colorHex');
      check(item.triggerKind === undefined || has(v1.triggers, item.triggerKind), ip + '.triggerKind');
    });
    const plots = new Set<unknown>();
    arr(dorm.gardens, dp + '.gardens').forEach((entry, j) => {
      const gp = dp + '.gardens[' + j + ']';
      const plot = obj(entry, gp);
      check(identity(plot.plotId) && !plots.has(plot.plotId), gp + '.plotId', 'identity-mismatch');
      plots.add(plot.plotId);
      if (plot.seedElement === null) check(plot.plantedAt === 0 && plot.readyAt === 0, gp + '.timestamps');
      else {
        element(plot.seedElement, gp + '.seedElement');
        check(integer(plot.plantedAt, 1) && integer(plot.readyAt, 1) && plot.readyAt >= plot.plantedAt, gp + '.timestamps');
      }
    });
  });
  if (envelope.gallery !== undefined) {
    const gallery = obj(envelope.gallery, 'gallery');
    for (const images of Object.values(gallery)) {
      const list = arr(images, 'gallery.images');
      check(list.length <= 9, 'gallery.images');
      list.forEach((image, i) => check(text(image) && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image), 'gallery.images[' + i + ']'));
    }
  }
  return diagnostics.length ? recover() : { kind: 'validated', raw, legacyAffinityPresent };
}
