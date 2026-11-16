import { describe, expect, it } from 'vitest';
import { SPELL_BY_ID, getStarterDeckForElement } from '../shared/spells.ts';
import type { ElementId } from '../shared/elements.ts';

const rareElements: ElementId[] = ['umbra', 'sol', 'verdigris', 'chronos'];
const damageKinds = new Set(['attack', 'aoe', 'drain']);

describe('rare-element starter decks', () => {
  it('includes a native damage spell for every rare element', () => {
    for (const element of rareElements) {
      const deck = getStarterDeckForElement(element);
      expect(
        deck.some((id) => {
          const spell = SPELL_BY_ID[id];
          return spell?.element === element && damageKinds.has(spell.kind);
        }),
        element,
      ).toBe(true);
    }
  });

  it('does not fill starter decks with enchant or reshuffle cards', () => {
    for (const element of rareElements) {
      const deck = getStarterDeckForElement(element);
      expect(
        deck.some((id) => ['enchant', 'reshuffle'].includes(SPELL_BY_ID[id]?.kind ?? '')),
        element,
      ).toBe(false);
    }
  });
});
