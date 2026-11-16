import { describe, expect, it } from 'vitest';
import { createStarterWizard } from '../shared/economy.ts';
import { canWearGear, pruneEquippedWardrobe, visibleEquippedGearIds } from '../shared/economy.ts';

describe('Bazaar equipped gear ownership', () => {
  const base = createStarterWizard({
    id: 'rowan',
    ownerId: 'owner',
    realmId: 'breeze',
    name: 'Rowan',
    raceId: 'human',
    elementId: 'ember',
    sculpt: {} as Parameters<typeof createStarterWizard>[0]['sculpt'],
  });

  it('treats Bazaar wallet counts as wearable inventory', () => {
    const bazaar = { hat_pointed_brim: 1 };
    expect(canWearGear(base, bazaar, 'hat_pointed_brim')).toBe(true);
    expect(canWearGear(base, { hat_pointed_brim: 0 }, 'hat_pointed_brim')).toBe(false);
  });

  it('clears an equipped Bazaar-only item when escrow removes the wallet copy', () => {
    const wizard = {
      ...base,
      wardrobe: {
        ...base.wardrobe,
        equipped: { ...base.wardrobe.equipped, headgear: 'hat_pointed_brim' },
      },
    };
  const pruned = pruneEquippedWardrobe(wizard, { hat_pointed_brim: 0 });
    expect(pruned).not.toBeNull();
    expect(pruned!.wardrobe.equipped.headgear).toBe('hat_academy_cap');
    expect(visibleEquippedGearIds(pruned!, { hat_pointed_brim: 0 })).not.toContain('hat_pointed_brim');
  });

  it('keeps equipped gear while a Bazaar copy remains', () => {
    const wizard = {
      ...base,
      wardrobe: {
        ...base.wardrobe,
        equipped: { ...base.wardrobe.equipped, headgear: 'hat_pointed_brim' },
      },
    };
    expect(pruneEquippedWardrobe(wizard, { hat_pointed_brim: 1 })).toBeNull();
    expect(visibleEquippedGearIds(wizard, { hat_pointed_brim: 1 })).toContain('hat_pointed_brim');
  });
});