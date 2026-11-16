import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveFusionSpecies, SPECIES_BY_ID } from '../shared/creatures.ts';
import { createStarterWizard, grantFusionSpells, type WizardDocument } from '../shared/economy.ts';
import { applySagaEvent, applyWizardXp } from '../shared/quests.ts';
import { REALMS, rankFromLevel } from '../shared/realms.ts';
import { getSpellShopLockReason, getSpellUseLockReason, SPELL_BY_ID } from '../shared/spells.ts';
import { CAMPUS_QUESTS } from '../shared/world.ts';
import { loadGuestRealm, saveGuestRealm, type OwnedCreature, type GuestRealmBundle } from '../src/lib/storage.ts';

vi.mock('../src/lib/firebase.ts', () => ({}));

function loadCallback(path: string, name: string, bindings: Record<string, unknown>) {
  const sourcePath = new URL(path, import.meta.url);
  const source = ts.createSourceFile(path, readFileSync(sourcePath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) {
      initializer = node.initializer;
    } else {
      ts.forEachChild(node, visit);
    }
  }
  visit(source);
  if (!initializer) throw new Error(`Missing audit callback ${name} in ${path}`);
  const js = ts.transpileModule(`return (${initializer.getText(source)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(bindings), js)(...Object.values(bindings));
}

function wizardAtRank(rank: number): WizardDocument {
  const wizard = createStarterWizard({
    id: 'fusion-audit-wizard', ownerId: 'guest_local', realmId: 'breeze', name: 'Fusion Audit',
    raceId: 'human', elementId: 'ember',
    sculpt: {
      height: 1, build: 'balanced', skinHex: '#b58368', hairStyle: 'short', hairHex: '#453128',
      hairTipHex: '#453128', eyeShape: 'bright', eyeLeftHex: '#5b4d33', eyeRightHex: '#5b4d33',
      browStyle: 'soft', marking: 'none', primaryDye: '#534679', trimDye: '#ffffff',
      accentDye: '#b58e4b', castPose: 'scholar',
    },
  });
  const level = rank * 2 - 1;
  return { ...wizard, level, rank: rankFromLevel(level) };
}

const recipes = [
  ['cinder_kitsune', 'bramble_sprig', 'magma_salamander', 'magma_tectonic'],
  ['harbor_kelpie', 'spark_lynx_cub', 'tempest_serpent', 'tempest_maelstrom'],
  ['rime_stag', 'harbor_kelpie', 'glacier_bear', 'glacier_abyss'],
  ['dusk_moth', 'sun_gryphon', 'eclipse_lynx', 'eclipse_twilight'],
  ['chronos_owl', 'runic_golem', 'aetheris_dragonet', 'aetheris_astrolabe'],
] as const;

afterEach(() => vi.unstubAllGlobals());

describe('Fusion hatch and signature spell progression (#105)', () => {
  it.each(recipes)('%s + %s hatches %s and grants %s exactly once across guest reloads', (a, b, fusion, spellId) => {
    const local = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => local.set(key, value),
    });
    const spell = SPELL_BY_ID[spellId];
    const wizard = wizardAtRank(spell.unlockRank);
    function parent(id: string, speciesId: string): OwnedCreature {
      const species = SPECIES_BY_ID[speciesId];
      return {
        id, wizardId: wizard.id, ownerId: wizard.ownerId, realmId: wizard.realmId, speciesId,
        elementId: species.element, nickname: species.name, stage: 2, bondXp: 100,
        branchChoice: 'A', chromatic: 'none', wins: 0, talents: [],
      };
    }
    const parents = [parent('parent-a', a), parent('parent-b', b)];
    const bundle = loadGuestRealm(wizard.realmId);
    bundle.account.wizardIds = [wizard.id];
    bundle.wizards = [wizard];
    bundle.creatures[wizard.id] = parents;
    expect(saveGuestRealm(wizard.realmId, bundle)).toBe(true);

    function persist(next: WizardDocument, pets: OwnedCreature[] = [], account?: GuestRealmBundle['account']) {
      const persistWizard = loadCallback('../src/App.tsx', 'persistWizard', {
        useCallback: (callback: unknown) => callback,
        setActiveWizard: () => {},
        setWizards: () => {},
        fbUser: null,
        showToast: () => {},
        updateGuestProgress: (realm: WizardDocument['realmId'], update: (draft: GuestRealmBundle) => void) => {
          const draft = loadGuestRealm(realm);
          update(draft);
          expect(saveGuestRealm(realm, draft)).toBe(true);
        },
      });
      persistWizard(next, pets, account);
    }

    const forge = loadCallback('../src/features/creatures/CreaturesArborPanel.tsx', 'forgeHybridEgg', {
      wizard, creatures: parents, parentAId: parents[1].id, parentBId: parents[0].id,
      resolveFusionSpecies, onUpdateWizard: persist, academyAudio: { playChime: () => {} },
    });
    forge();
    const forged = loadGuestRealm(wizard.realmId).wizards[0];
    expect(forged.currencies.florins).toBe(wizard.currencies.florins - 80);
    expect(forged.progression.eggs).toEqual([expect.objectContaining({
      resultSpeciesId: fusion, winsNeeded: 2, winsDone: 0,
    })]);

    function finishDuel(mode: 'solo' | 'pvp' | 'coop', won = true) {
      const saved = loadGuestRealm(wizard.realmId);
      const finish = loadCallback('../src/App.tsx', 'handleDuelFinished', {
        activeWizard: saved.wizards[0], creatures: saved.creatures[wizard.id], realmAccount: saved.account,
        fbUser: null, spectating: false, REALMS, SPECIES_BY_ID, applySagaEvent, applyWizardXp, CAMPUS_QUESTS,
        setLiveDuelState: () => {}, showToast: () => {}, setRealmAccount: () => {}, setCreatures: () => {},
        persistWizard: persist, grantFusionSpells,
      });
      finish({ won, mode, completed: true });
      return loadGuestRealm(wizard.realmId);
    }
    expect(finishDuel('pvp').wizards[0].progression.eggs[0].winsDone).toBe(0);
    expect(finishDuel('coop').wizards[0].progression.eggs[0].winsDone).toBe(0);
    expect(finishDuel('solo', false).wizards[0].progression.eggs[0].winsDone).toBe(0);
    const afterFirstWin = finishDuel('solo').wizards[0];
    expect(afterFirstWin.progression.eggs[0].winsDone).toBe(1);
    expect(afterFirstWin.progression.unlockedFusions).toEqual([]);
    expect(afterFirstWin.progression.ownedSpellIds).not.toContain(spell.id);

    const reloaded = finishDuel('solo');
    const savedWizard = reloaded.wizards[0];
    const savedPets = reloaded.creatures[wizard.id];
    expect(savedWizard.progression.eggs).toEqual([]);
    expect(savedPets).toHaveLength(3);
    expect(savedPets).toEqual(expect.arrayContaining(parents));
    expect(savedPets.find((pet) => pet.speciesId === fusion)).toMatchObject({
      elementId: spell.element, stage: 1, bondXp: 25,
    });
    expect(savedWizard.progression.bestiarySeen).toContain(fusion);
    expect(savedWizard.rank).toBeGreaterThanOrEqual(spell.unlockRank);
    expect(savedWizard.progression.unlockedFusions).toEqual([spell.element]);
    expect(savedWizard.progression.ownedSpellIds.filter((id) => id === spellId)).toHaveLength(1);
    expect(savedWizard.progression.deck).not.toContain(spellId);
    const state = {
      rank: savedWizard.rank,
      unlockedElements: savedWizard.progression.unlockedElements,
      unlockedFusions: savedWizard.progression.unlockedFusions,
    };
    expect(getSpellUseLockReason(spell, state)).toBeNull();
    expect(getSpellShopLockReason(spell, state)).toBeNull();
    expect(getSpellUseLockReason(spell, { ...state, rank: spell.unlockRank - 1 }))
      .toBe(`Rank ${spell.unlockRank} required`);
    expect(getSpellUseLockReason(spell, { ...state, unlockedFusions: [] })).toMatch(/^Unlock .* Fusion$/);

    const afterAnotherWin = finishDuel('solo');
    expect(afterAnotherWin.creatures[wizard.id]).toHaveLength(3);
    expect(afterAnotherWin.wizards[0].progression.unlockedFusions).toEqual([spell.element]);
    expect(afterAnotherWin.wizards[0].progression.ownedSpellIds.filter((id) => id === spellId)).toHaveLength(1);

    const recovered = grantFusionSpells(wizard, [...savedPets, ...savedPets]);
    expect(recovered.progression.unlockedFusions).toEqual([spell.element]);
    expect(recovered.progression.ownedSpellIds.filter((id) => id === spellId)).toHaveLength(1);
    expect(grantFusionSpells(recovered, savedPets)).toBe(recovered);
  });

  it('ignores ordinary hatchlings and fusion creatures outside the wizard save', () => {
    const wizard = wizardAtRank(3);
    const owned = { ownerId: wizard.ownerId, wizardId: wizard.id, realmId: wizard.realmId, speciesId: 'magma_salamander' };
    const creatures = [
      { ...owned, speciesId: 'cinder_kitsune' },
      { ...owned, speciesId: 'not-in-the-catalog' },
      { ...owned, ownerId: 'another-owner' },
      { ...owned, wizardId: 'another-wizard' },
      { ...owned, realmId: 'horizon' as const },
    ];
    expect(grantFusionSpells(wizard, creatures)).toBe(wizard);
  });
});
