import React, { useState } from 'react';
import { BookOpen, Sparkles, Wand2 } from 'lucide-react';
import { SPELLS, SPELL_BY_ID } from '../../../shared/spells.ts';
import { RACES } from '../../../shared/wardrobe.ts';
import { ELEMENTS } from '../../../shared/elements.ts';
import type { WizardDocument } from '../../../shared/economy.ts';
import type { OwnedCreature } from '../../lib/storage.ts';
import { ElementCrest } from '../../lib/elementIcons.tsx';

interface DeckLecternPanelProps {
  wizard: WizardDocument;
  activeCreature: OwnedCreature | null;
  onUpdateWizard: (next: WizardDocument) => void;
  onClose: () => void;
}

export const DeckLecternPanel: React.FC<DeckLecternPanelProps> = ({
  wizard,
  activeCreature,
  onUpdateWizard,
  onClose,
}) => {
  const [tab, setTab] = useState<'deck' | 'wrighting' | 'lectern'>('deck');
  const [goal, setGoal] = useState('How should I combo my blades, prisms, and creature branch for Rank 4 Rare Trials?');
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const toggleDeckCard = (spellId: string, add: boolean) => {
    const nextDeck = [...wizard.progression.deck];
    if (add) {
      if (nextDeck.length >= 40) return;
      nextDeck.push(spellId);
    } else {
      if (nextDeck.length <= 24) return;
      const idx = nextDeck.lastIndexOf(spellId);
      if (idx >= 0) nextDeck.splice(idx, 1);
    }
    onUpdateWizard({ ...wizard, progression: { ...wizard.progression, deck: nextDeck } });
  };

  const applySpellwrighting = (spellId: string, branch: 'A' | 'B') => {
    if (wizard.currencies.spellShards < 2) return;
    onUpdateWizard({
      ...wizard,
      currencies: { ...wizard.currencies, spellShards: wizard.currencies.spellShards - 2 },
      progression: {
        ...wizard.progression,
        spellwrighting: { ...wizard.progression.spellwrighting, [spellId]: branch },
      },
    });
  };

  const askArchivist = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAi(true);
    try {
      const resp = await fetch('/api/academy/strategize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wizardName: wizard.name,
          raceName: RACES[wizard.raceId].name,
          elementName: ELEMENTS[wizard.elementId].name,
          level: wizard.level,
          rank: wizard.rank,
          activeCreatureName: activeCreature?.nickname ?? 'Starter Partner',
          goal,
        }),
      });
      const data = (await resp.json()) as { advice?: string };
      setAdvice(data.advice ?? 'Balance 2 Blades, 1 Prism, and 1 Heal in your 26-card opening cycle.');
    } catch {
      setAdvice('Unable to reach Archivist Lyra right now.');
    } finally {
      setLoadingAi(false);
    }
  };

  const counts = wizard.progression.deck.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#101522]/85 p-4">
      <div className="storybook-panel w-full max-w-5xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7c7a9] pb-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#241b16]">Spellbook, Spellwrighting &amp; Lectern</h2>
            <p className="text-xs text-[#615346]">
              Deck Size: {wizard.progression.deck.length}/40 (min 24) · {wizard.currencies.spellShards} Spell Shards
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-[#c9b796] px-3 py-1.5 text-xs font-bold hover:bg-[#efe4ce]">
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: 'deck', label: 'Deck Builder', icon: BookOpen },
            { id: 'wrighting', label: 'Branching Spellwrighting', icon: Wand2 },
            { id: 'lectern', label: "Archivist's Lectern", icon: Sparkles },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold border ${
                tab === t.id ? 'border-[#241b16] bg-[#241b16] text-[#f4c98b]' : 'border-[#d7c7a9] bg-white/80'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'deck' && (
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            {wizard.progression.ownedSpellIds.map((id) => {
              const sp = SPELL_BY_ID[id];
              if (!sp) return null;
              const qty = counts[id] ?? 0;
              return (
                <div key={id} className="rounded-xl border border-[#d7c7a9] bg-white/85 p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <ElementCrest elementId={sp.element} size={14} showLabel />
                      <span className="font-mono-num font-bold">{sp.pipCost} Pip</span>
                    </div>
                    <div className="mt-1 font-bold text-sm">{sp.name}</div>
                    <div className="text-[#615346]">{sp.description}</div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="font-mono-num font-bold">In Deck: {qty}</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => toggleDeckCard(id, false)} className="rounded-lg bg-[#efe4ce] px-2.5 py-1 font-bold">-</button>
                      <button onClick={() => toggleDeckCard(id, true)} className="rounded-lg bg-[#241b16] px-2.5 py-1 font-bold text-[#f4c98b]">+</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'wrighting' && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 text-xs">
            {SPELLS.filter((s) => wizard.progression.ownedSpellIds.includes(s.id) && (s.wrightA || s.wrightB)).map((sp) => {
              const chosen = wizard.progression.spellwrighting[sp.id];
              return (
                <div key={sp.id} className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-bold">{sp.name}</span>
                    <ElementCrest elementId={sp.element} showLabel />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sp.wrightA && (
                      <button
                        disabled={wizard.currencies.spellShards < 2 && chosen !== 'A'}
                        onClick={() => applySpellwrighting(sp.id, 'A')}
                        className={`rounded-xl px-3 py-1.5 font-bold border ${
                          chosen === 'A' ? 'border-[#2f8a73] bg-[#2f8a73] text-white' : 'border-[#d7c7a9] bg-[#fbf6ec]'
                        }`}
                      >
                        Path A: {sp.wrightA.label} (2 Shards)
                      </button>
                    )}
                    {sp.wrightB && (
                      <button
                        disabled={wizard.currencies.spellShards < 2 && chosen !== 'B'}
                        onClick={() => applySpellwrighting(sp.id, 'B')}
                        className={`rounded-xl px-3 py-1.5 font-bold border ${
                          chosen === 'B' ? 'border-[#8a52c7] bg-[#8a52c7] text-white' : 'border-[#d7c7a9] bg-[#fbf6ec]'
                        }`}
                      >
                        Path B: {sp.wrightB.label} (2 Shards)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'lectern' && (
          <form onSubmit={askArchivist} className="mt-4 rounded-2xl border border-[#d7c7a9] bg-white/85 p-5 space-y-3 text-xs">
            <div className="font-display text-lg font-bold">Archivist Lyra&apos;s Strategy Lectern</div>
            <p className="text-[#615346]">
              Optional strategy desk powered by free-tier Gemini 4 Hydrogen for deck ratios, School Pip combos, and Hybrid breeding tips.
            </p>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[#d7c7a9] bg-[#fbf6ec] p-3 text-sm"
            />
            <button
              type="submit"
              disabled={loadingAi}
              className="rounded-xl bg-[#241b16] px-5 py-2 font-bold text-[#f4c98b]"
            >
              {loadingAi ? 'Consulting Archives…' : 'Consult Archivist'}
            </button>
            {advice && (
              <div className="rounded-xl border border-[#d7c7a9] bg-[#efe4ce]/65 p-4 text-sm whitespace-pre-line leading-relaxed">
                {advice}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
