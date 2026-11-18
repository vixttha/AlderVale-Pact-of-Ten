import { SPECIES_BY_ID } from './creatures.ts';
import type { ElementId } from './elements.ts';
import type { WizardDocument } from './economy.ts';
import type { OwnedCreature, SanctuaryState } from '../src/lib/storage.ts';

export function wizardStarter(wizard: WizardDocument): { pet: OwnedCreature; dorm: SanctuaryState } {
  const byElement: Partial<Record<ElementId, string>> = {
    ember: 'cinder_kitsune', frost: 'rime_stag', gale: 'zephyr_owl',
    bramble: 'bramble_sprig', tide: 'harbor_kelpie', spark: 'spark_lynx_cub',
  };
  const species = SPECIES_BY_ID[byElement[wizard.elementId] ?? 'cinder_kitsune'];
  const owner = { ownerId: wizard.ownerId, wizardId: wizard.id, realmId: wizard.realmId };
  return {
    pet: {
      ...owner, id: wizard.activeCreatureId, speciesId: species.id, nickname: species.stageNames[0],
      elementId: species.element, stage: 1, chromatic: 'none', branchChoice: 'A',
      bondXp: 0, wins: 0, talents: ['tal_sturdy'],
    },
    dorm: { ...owner, themeId: 'sunlit_loft', weatherId: 'clear_breeze', isPublic: false, items: [], gardens: [] },
  };
}
