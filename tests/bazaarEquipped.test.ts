import { describe, expect, it } from 'vitest';
import { computeWizardDerivedStats } from '../shared/combat.ts';
import { createStarterWizard, wearableEquipment } from '../shared/economy.ts';

const wizard = createStarterWizard({
  id: 'rowan',
  ownerId: 'owner',
  realmId: 'breeze',
  name: 'Rowan',
  raceId: 'human',
  elementId: 'ember',
  sculpt: {} as Parameters<typeof createStarterWizard>[0]['sculpt'],
});
const hat = 'hat_pointed_brim';
const wardrobe = { ...wizard.wardrobe, equipped: { ...wizard.wardrobe.equipped, headgear: hat } };

function stats(gear: typeof wardrobe.equipped) {
  return computeWizardDerivedStats({
    level: wizard.level,
    raceId: wizard.raceId,
    element: wizard.elementId,
    equippedGearIds: Object.values(gear),
    socketedRunestoneIds: [],
    creatureTalents: [],
  });
}

describe('Bazaar equipment and escrow (#28)', () => {
  it('immediately uses owned replacement gear and its stats when the wallet copy is no longer available', () => {
    const equipped = wearableEquipment(wardrobe, { [hat]: 1 });
    expect(equipped).toBe(wardrobe.equipped);
    const reconciled = wearableEquipment(wardrobe, { [hat]: 0 });
    expect(reconciled.headgear).toBe('hat_academy_cap');
    expect(stats(reconciled)).toEqual(stats(wizard.wardrobe.equipped));
    expect(stats(reconciled)).not.toEqual(stats(equipped));
  });

  it('keeps an independent wardrobe copy even after the last wallet copy goes to escrow', () => {
    const owned = { ...wardrobe, ownedGearIds: [...wardrobe.ownedGearIds, hat] };
    expect(wearableEquipment(owned, { [hat]: 0 })).toBe(owned.equipped);
  });

  it('clears an unavailable slot when the wizard has no valid replacement', () => {
    const noOwnedHats = { ...wardrobe, ownedGearIds: wardrobe.ownedGearIds.filter((id) => id !== 'hat_academy_cap') };
    expect(wearableEquipment(noOwnedHats, {}).headgear).toBe('');
  });
});
