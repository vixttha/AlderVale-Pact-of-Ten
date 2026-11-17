import { SPECIES_BY_ID } from '../../../shared/creatures.ts';
import { grantFusionSpells, type MagmaPactTrail, type WizardDocument } from '../../../shared/economy.ts';
import type { OwnedCreature } from '../../lib/storage.ts';

export const CALDERA_NEWT = SPECIES_BY_ID.magma_salamander;

export type MagmaPactAction =
  | { type: 'open-vent'; fireId: string; forestId: string }
  | { type: 'anchor-path' }
  | { type: 'warm-egg' }
  | { type: 'hatch'; branch: OwnedCreature['branchChoice'] }
  | { type: 'follow-trail'; trail: MagmaPactTrail };

export function getMagmaPactCompanions(wizard: WizardDocument, creatures: OwnedCreature[]) {
  const owned = creatures.filter((pet) => pet.ownerId === wizard.ownerId
    && pet.wizardId === wizard.id && pet.realmId === wizard.realmId);
  return {
    fire: owned.filter((pet) => pet.elementId === 'ember' && SPECIES_BY_ID[pet.speciesId]?.element === 'ember'),
    forest: owned.filter((pet) => pet.elementId === 'bramble' && SPECIES_BY_ID[pet.speciesId]?.element === 'bramble'),
  };
}

export function advanceMagmaPact(wizard: WizardDocument, creatures: OwnedCreature[], action: MagmaPactAction) {
  const pact = wizard.progression.magmaPact;
  const withPact = (magmaPact: NonNullable<typeof pact>): WizardDocument => ({
    ...wizard,
    progression: { ...wizard.progression, magmaPact },
  });

  switch (action.type) {
    case 'open-vent': {
      if (pact || action.fireId === action.forestId) return null;
      const { fire, forest } = getMagmaPactCompanions(wizard, creatures);
      if (!fire.some((pet) => pet.id === action.fireId) || !forest.some((pet) => pet.id === action.forestId)) return null;
      return { wizard: withPact({ fireId: action.fireId, forestId: action.forestId, phase: 'vent-open' }), creatures };
    }
    case 'anchor-path':
      if (pact?.phase !== 'vent-open') return null;
      if (!getMagmaPactCompanions(wizard, creatures).forest.some((pet) => pet.id === pact.forestId)) return null;
      return { wizard: withPact({ ...pact, phase: 'egg' }), creatures };
    case 'warm-egg':
      if (pact?.phase !== 'egg') return null;
      return { wizard: withPact({ ...pact, phase: 'ready' }), creatures };
    case 'hatch': {
      if (pact?.phase !== 'ready') return null;
      const petId = `pet_magma_pact_${wizard.id}`;
      if (creatures.some((pet) => pet.id === petId)) return null;
      const pet: OwnedCreature = {
        id: petId,
        ownerId: wizard.ownerId,
        wizardId: wizard.id,
        realmId: wizard.realmId,
        speciesId: CALDERA_NEWT.id,
        nickname: CALDERA_NEWT.name,
        elementId: CALDERA_NEWT.element,
        stage: 1,
        chromatic: 'none',
        branchChoice: action.branch,
        bondXp: 25,
        wins: 0,
        talents: ['tal_spellproof', 'tal_may_blade'],
      };
      const hatched = withPact({ ...pact, phase: 'hatched' });
      hatched.progression.bestiarySeen = [...new Set([...hatched.progression.bestiarySeen, pet.speciesId])];
      return { wizard: grantFusionSpells(hatched, [pet]), creatures: [...creatures, pet] };
    }
    case 'follow-trail':
      if (pact?.phase !== 'hatched') return null;
      return { wizard: withPact({ ...pact, nextTrail: action.trail }), creatures };
  }
}
