import type { RealmId } from './realms.ts';

// Historical serialized IDs only. No display names, new school mappings or gameplay rules.
const compatibleCandidates = new Set(['ember', 'frost', 'gale', 'bramble', 'tide', 'spark', 'umbra', 'sol', 'verdigris']);
const retiredIds = new Set(['chronos', 'magma', 'tempest', 'glacier', 'eclipse', 'aetheris']);
type RecordValue = Record<string, unknown>;
type Diagnostic = { path: string; code: 'invalid-shape' | 'unsupported-version' | 'identity-mismatch' | 'retired-element' | 'unknown-element' };
export type LegacyGuestRead =
  | { kind: 'missing' }
  | { kind: 'recognized'; raw: string; envelope: RecordValue }
  | { kind: 'recovery-required'; raw: string; diagnostics: Diagnostic[] };

function record(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
function identity(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Inspect the unversioned guest v1 envelope from the realm-specific v1 storage key.
 * This is NOT a full WizardDocument validator or permission to load, migrate or write.
 * Preserve raw bytes for every non-missing outcome. No side effects or conversions.
 */
export function readLegacyGuestSave(raw: string | null, realm: RealmId): LegacyGuestRead {
  if (raw === null) return { kind: 'missing' };
  const diagnostics: Diagnostic[] = [];
  const add = (path: string, code: Diagnostic['code']) => { diagnostics.push({ path, code }); };
  const recover = (): LegacyGuestRead => ({ kind: 'recovery-required', raw, diagnostics });
  let envelope: unknown;
  try { envelope = JSON.parse(raw); } catch { add('$', 'invalid-shape'); return recover(); }
  if (!record(envelope)) { add('$', 'invalid-shape'); return recover(); }
  // The shipped v1 format has no embedded version discriminator. Never guess the meaning of a tagged format.
  for (const key of ['version', 'schemaVersion', 'saveVersion']) {
    if (Object.hasOwn(envelope, key)) add(key, 'unsupported-version');
  }
  if (diagnostics.length) return recover();
  const element = (value: unknown, path: string) => {
    if (!identity(value)) add(path, 'invalid-shape');
    else if (retiredIds.has(value)) add(path, 'retired-element');
    else if (!compatibleCandidates.has(value)) add(path, 'unknown-element');
  };
  const { account, wizards, creatures, sanctuaries, gallery } = envelope;
  if (!record(account) || !Array.isArray(wizards) || !record(creatures) || !record(sanctuaries)
    || (gallery !== undefined && !record(gallery))) {
    add('$', 'invalid-shape'); return recover();
  }
  if (account.uid !== 'guest_local' || account.realmId !== realm) add('account', 'identity-mismatch');
  const accountIds = account.wizardIds;
  if (!strings(accountIds) || !accountIds.every(identity) || new Set(accountIds).size !== accountIds.length) {
    add('account.wizardIds', 'invalid-shape');
  }
  const ids = new Set<string>();
  for (const [i, wizard] of wizards.entries()) {
    const path = 'wizards[' + i + ']';
    if (!record(wizard) || !identity(wizard.id)) { add(path, 'invalid-shape'); continue; }
    if (ids.has(wizard.id) || wizard.ownerId !== 'guest_local' || wizard.realmId !== realm) add(path, 'identity-mismatch');
    ids.add(wizard.id);
    element(wizard.elementId, path + '.elementId');
    const progression = wizard.progression;
    if (!record(progression) || !record(wizard.currencies) || !record(wizard.wardrobe)
      || !record(wizard.sculpt) || !record(wizard.resources) || !record(wizard.stitching)) {
      add(path, 'invalid-shape'); continue;
    }
    for (const key of ['unlockedElements', 'unlockedFusions']) {
      const values = progression[key];
      // Earlier saves may omit fusion entitlements; never synthesize them during reading.
      if (key === 'unlockedFusions' && values === undefined) continue;
      if (!strings(values)) add(path + '.progression.' + key, 'invalid-shape');
      else values.forEach((value, index) => element(value, path + '.progression.' + key + '[' + index + ']'));
    }
    for (const key of ['deck', 'sideboard', 'ownedSpellIds']) {
      if (!strings(progression[key])) add(path + '.progression.' + key, 'invalid-shape');
    }
    if (!Array.isArray(progression.eggs) || !Array.isArray(progression.loadouts)) add(path + '.progression', 'invalid-shape');
  }
  if (strings(accountIds) && (accountIds.length !== ids.size || accountIds.some(id => !ids.has(id)))) {
    add('account.wizardIds', 'identity-mismatch');
  }
  const belongs = (entry: RecordValue, wizardId: string) =>
    entry.ownerId === 'guest_local' && entry.wizardId === wizardId && entry.realmId === realm;
  for (const [wizardId, pets] of Object.entries(creatures)) {
    if (!ids.has(wizardId)) add('creatures', 'identity-mismatch');
    if (!Array.isArray(pets)) { add('creatures', 'invalid-shape'); continue; }
    const petIds = new Set<string>();
    for (const pet of pets) {
      if (!record(pet) || !identity(pet.id) || !identity(pet.speciesId)) { add('creatures', 'invalid-shape'); continue; }
      if (!belongs(pet, wizardId) || petIds.has(pet.id)) add('creatures', 'identity-mismatch');
      petIds.add(pet.id);
      element(pet.elementId, 'creatures.elementId');
    }
  }
  for (const [wizardId, sanctuary] of Object.entries(sanctuaries)) {
    if (!record(sanctuary) || !Array.isArray(sanctuary.gardens) || !Array.isArray(sanctuary.items)) {
      add('sanctuaries', 'invalid-shape'); continue;
    }
    if (!ids.has(wizardId) || !belongs(sanctuary, wizardId)) add('sanctuaries', 'identity-mismatch');
    for (const plot of sanctuary.gardens) {
      if (!record(plot)) add('sanctuaries.gardens', 'invalid-shape');
      else if (plot.seedElement !== null) element(plot.seedElement, 'sanctuaries.gardens.seedElement');
    }
  }
  if (record(gallery)) {
    for (const [wizardId, images] of Object.entries(gallery)) {
      if (!ids.has(wizardId)) add('gallery', 'identity-mismatch');
      if (!strings(images)) add('gallery', 'invalid-shape');
    }
  }
  return diagnostics.length ? recover() : { kind: 'recognized', raw, envelope };
}
