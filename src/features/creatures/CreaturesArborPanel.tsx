import React, { useEffect, useState } from 'react';
import { Heart, Sparkles, Egg, Target } from 'lucide-react';
import {
  CREATURE_SPECIES,
  CREATURE_TALENTS,
  SPECIES_BY_ID,
  getBondStage,
  hasStratumHarmony,
  resolveFusionSpecies,
} from '../../../shared/creatures.ts';
import { RACES } from '../../../shared/wardrobe.ts';
import type { WizardDocument } from '../../../shared/economy.ts';
import type { OwnedCreature } from '../../lib/storage.ts';
import { ElementCrest } from '../../lib/elementIcons.tsx';
import { academyAudio } from '../../engine/audioSynth.ts';

interface CreaturesArborPanelProps {
  wizard: WizardDocument;
  creatures: OwnedCreature[];
  onUpdateWizard: (next: WizardDocument) => void;
  onUpdateCreatures: (next: OwnedCreature[], newCreature?: OwnedCreature) => void;
  onClose: () => void;
}

export const CreaturesArborPanel: React.FC<CreaturesArborPanelProps> = ({
  wizard,
  creatures,
  onUpdateWizard,
  onUpdateCreatures,
  onClose,
}) => {
  const [tab, setTab] = useState<'kennel' | 'train' | 'adopt' | 'breed'>('kennel');
  const [runeCursor, setRuneCursor] = useState(10);
  const [runeDir, setRuneDir] = useState(1);
  const [runeStatus, setRuneStatus] = useState<string>('Time your catch inside the golden rune zone (40–62%)!');
  const [parentAId, setParentAId] = useState<string>(creatures[0]?.id ?? '');
  const [parentBId, setParentBId] = useState<string>(creatures[1]?.id ?? creatures[0]?.id ?? '');

  const wizardStratum = RACES[wizard.raceId].stratum;
  const activePet = creatures.find((c) => c.id === wizard.activeCreatureId) ?? creatures[0];

  useEffect(() => {
    if (tab !== 'train') return;
    const id = setInterval(() => {
      setRuneCursor((c) => {
        const next = c + runeDir * 4;
        if (next >= 96) {
          setRuneDir(-1);
          return 96;
        }
        if (next <= 4) {
          setRuneDir(1);
          return 4;
        }
        return next;
      });
    }, 45);
    return () => clearInterval(id);
  }, [tab, runeDir]);

  const setLeadCreature = (cid: string) => {
    onUpdateWizard({ ...wizard, activeCreatureId: cid });
  };

  const toggleBranch = (cid: string, branch: 'A' | 'B') => {
    onUpdateCreatures(creatures.map((c) => (c.id === cid ? { ...c, branchChoice: branch } : c)));
  };

  const handleCatchAttempt = () => {
    if (!activePet) return;
    const bullseye = runeCursor >= 40 && runeCursor <= 62;
    const harmony = hasStratumHarmony(wizardStratum, activePet.speciesId);
    const baseXp = bullseye ? 45 : 18;
    const gained = Math.round(baseXp * (harmony ? 1.05 : 1.0));
    const nextBond = activePet.bondXp + gained;
    const nextStage = getBondStage(nextBond);

    let nextTalents = [...activePet.talents];
    if (bullseye && nextTalents.length < 3) {
      const candidate = CREATURE_TALENTS.find((t) => !nextTalents.includes(t.id));
      if (candidate) nextTalents.push(candidate.id);
    }

    const updated = creatures.map((c) =>
      c.id === activePet.id ? { ...c, bondXp: nextBond, stage: nextStage, talents: nextTalents } : c,
    );
    onUpdateCreatures(updated);
    academyAudio.playChime(bullseye ? 'victory' : 'ui');
    setRuneStatus(
      bullseye
        ? `Bullseye! +${gained} Bond XP${harmony ? ' (+5% Stratum Harmony)' : ''}! Stage ${nextStage}.`
        : `Good effort! +${gained} Bond XP. Aim for 40–62% for Talent unlocks.`,
    );
  };

  const adoptWithSeal = (speciesId: string) => {
    const sp = SPECIES_BY_ID[speciesId];
    if (!sp || wizard.currencies.bondingSeals < sp.bondSealCost) return;
    const roll = Math.random();
    const chromatic = roll < 0.1 ? 'dawn' : roll < 0.2 ? 'dusk' : 'none';
    const created: OwnedCreature = {
      id: `pet_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ownerId: wizard.ownerId,
      wizardId: wizard.id,
      realmId: wizard.realmId,
      speciesId: sp.id,
      nickname: chromatic !== 'none' ? `${chromatic === 'dawn' ? 'Dawn' : 'Dusk'} ${sp.name}` : sp.name,
      elementId: sp.element,
      stage: 1,
      chromatic,
      branchChoice: 'A',
      bondXp: 0,
      wins: 0,
      talents: ['tal_sturdy'],
    };
    onUpdateWizard({
      ...wizard,
      currencies: { ...wizard.currencies, bondingSeals: wizard.currencies.bondingSeals - sp.bondSealCost },
      progression: {
        ...wizard.progression,
        bestiarySeen: Array.from(new Set([...wizard.progression.bestiarySeen, sp.id])),
      },
    });
    onUpdateCreatures([...creatures, created], created);
    academyAudio.playChime('victory');
  };

  const forgeHybridEgg = () => {
    const cA = creatures.find((c) => c.id === parentAId);
    const cB = creatures.find((c) => c.id === parentBId);
    if (!cA || !cB || cA.id === cB.id) return;
    if (wizard.currencies.florins < 80) return;

    const fusion = resolveFusionSpecies(cA.elementId, cB.elementId);
    const resultSpeciesId = fusion ? fusion.id : Math.random() < 0.5 ? cA.speciesId : cB.speciesId;
    const newEgg = {
      id: `egg_${Date.now()}`,
      parentA: cA.nickname,
      parentB: cB.nickname,
      resultSpeciesId,
      winsNeeded: 2,
      winsDone: 0,
    };
    onUpdateWizard({
      ...wizard,
      currencies: { ...wizard.currencies, florins: wizard.currencies.florins - 80 },
      progression: {
        ...wizard.progression,
        eggs: [...wizard.progression.eggs, newEgg],
      },
    });
    academyAudio.playChime('cast');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#101522]/85 p-4">
      <div className="storybook-panel w-full max-w-5xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7c7a9] pb-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#241b16]">Hatchery &amp; Training Arbor</h2>
            <p className="text-xs text-[#615346]">
              Active Lead Creature trails behind you in the 3D hub. Matching-stratum creatures gain +5% Bond XP!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-[#241b16] px-3 py-1.5 text-xs font-bold text-[#f4c98b] font-mono-num">
              {wizard.currencies.bondingSeals} Bonding Seals
            </span>
            <button onClick={onClose} className="rounded-xl border border-[#c9b796] px-3 py-1.5 text-xs font-bold hover:bg-[#efe4ce]">
              Close
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: 'kennel', label: `My Creatures (${creatures.length})`, icon: Heart },
            { id: 'train', label: 'Rune-Catch Training', icon: Target },
            { id: 'adopt', label: 'Bonding Adoption', icon: Sparkles },
            { id: 'breed', label: `Hybrid Nest (${wizard.progression.eggs.length} Eggs)`, icon: Egg },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold border ${
                tab === t.id ? 'border-[#241b16] bg-[#241b16] text-[#f4c98b]' : 'border-[#d7c7a9] bg-white/80 text-[#241b16]'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'kennel' && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {creatures.map((c) => {
              const sp = SPECIES_BY_ID[c.speciesId];
              if (!sp) return null;
              const isLead = c.id === wizard.activeCreatureId;
              const harmony = hasStratumHarmony(wizardStratum, sp.id);
              return (
                <div key={c.id} className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base font-bold text-[#241b16]">{c.nickname}</span>
                        {c.chromatic !== 'none' && (
                          <span className="rounded-md bg-amber-100 border border-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                            {c.chromatic} Chromatic
                          </span>
                        )}
                      </div>
                      <div className="text-[#615346]">
                        Stage {c.stage} ({sp.stageNames[c.stage - 1]}) · {c.bondXp} Bond XP {harmony && '· Stratum Harmony +5%'}
                      </div>
                    </div>
                    <ElementCrest elementId={c.elementId} showLabel />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {c.talents.map((tid) => {
                      const tal = CREATURE_TALENTS.find((t) => t.id === tid);
                      return (
                        <span key={tid} className="rounded-md bg-[#efe4ce] px-2 py-0.5 text-[11px] font-semibold">
                          {tal?.name ?? tid}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => toggleBranch(c.id, 'A')}
                        className={`rounded-lg px-2.5 py-1 font-bold border ${
                          c.branchChoice === 'A' ? 'border-[#241b16] bg-[#241b16] text-white' : 'border-[#d7c7a9] bg-white'
                        }`}
                      >
                        Branch A: {sp.branchA.name}
                      </button>
                      <button
                        onClick={() => toggleBranch(c.id, 'B')}
                        className={`rounded-lg px-2.5 py-1 font-bold border ${
                          c.branchChoice === 'B' ? 'border-[#241b16] bg-[#241b16] text-white' : 'border-[#d7c7a9] bg-white'
                        }`}
                      >
                        Branch B: {sp.branchB.name}
                      </button>
                    </div>
                    <button
                      onClick={() => setLeadCreature(c.id)}
                      className={`rounded-lg px-3 py-1 font-bold ${isLead ? 'bg-[#2f8a73] text-white' : 'bg-[#38a3a5] text-white'}`}
                    >
                      {isLead ? 'Active Lead' : 'Set Lead'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'train' && activePet && (
          <div className="mt-5 rounded-2xl border border-[#d7c7a9] bg-white/85 p-6 text-center space-y-4">
            <div className="font-display text-xl font-bold">Rune-Catch Training: {activePet.nickname}</div>
            <p className="text-xs text-[#615346]">{runeStatus}</p>

            <div className="relative mx-auto h-8 w-full max-w-md rounded-full border-2 border-[#241b16] bg-[#efe4ce] overflow-hidden">
              <div className="absolute top-0 bottom-0 left-[40%] w-[22%] bg-amber-300/80 border-x border-amber-600" />
              <div
                className="absolute top-0 bottom-0 w-3 -ml-1.5 rounded-full bg-[#241b16]"
                style={{ left: `${runeCursor}%` }}
              />
            </div>

            <button
              onClick={handleCatchAttempt}
              className="rounded-xl bg-[#241b16] px-6 py-2.5 text-sm font-bold text-[#f4c98b] hover:bg-[#3a2d25]"
            >
              Catch Rune Now!
            </button>
          </div>
        )}

        {tab === 'adopt' && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CREATURE_SPECIES.filter((s) => !s.isFusionOnly).map((sp) => (
              <div key={sp.id} className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-bold">{sp.name}</span>
                    <ElementCrest elementId={sp.element} showLabel />
                  </div>
                  <p className="mt-1.5 text-[#615346]">{sp.lore}</p>
                </div>
                <button
                  disabled={wizard.currencies.bondingSeals < sp.bondSealCost}
                  onClick={() => adoptWithSeal(sp.id)}
                  className="mt-3 w-full rounded-xl bg-[#38a3a5] py-2 font-bold text-white disabled:opacity-45"
                >
                  Bond ({sp.bondSealCost} Seal{sp.bondSealCost > 1 ? 's' : ''})
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'breed' && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 text-xs">
            <div className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 space-y-3">
              <div className="font-display text-lg font-bold">Pair Two Creatures (80 Florins)</div>
              <p className="text-[#615346]">
                Pairs like Ember+Bramble (Magma), Tide+Spark (Tempest), Frost+Tide (Glacier), Umbra+Sol (Eclipse), or Chronos+Verdigris (Aetheris) forge Secret Fusion Eggs!
              </p>
              <select value={parentAId} onChange={(e) => setParentAId(e.target.value)} className="w-full rounded-lg border border-[#d7c7a9] p-2">
                {creatures.map((c) => (
                  <option key={c.id} value={c.id}>{c.nickname} ({c.elementId})</option>
                ))}
              </select>
              <select value={parentBId} onChange={(e) => setParentBId(e.target.value)} className="w-full rounded-lg border border-[#d7c7a9] p-2">
                {creatures.map((c) => (
                  <option key={c.id} value={c.id}>{c.nickname} ({c.elementId})</option>
                ))}
              </select>
              <button
                onClick={forgeHybridEgg}
                disabled={creatures.length < 2 || wizard.currencies.florins < 80}
                className="w-full rounded-xl bg-[#241b16] py-2.5 font-bold text-[#f4c98b] disabled:opacity-45"
              >
                Forge 2-Win Hybrid Egg (80F)
              </button>
            </div>

            <div className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 space-y-2">
              <div className="font-display text-lg font-bold">Incubating Battle-Charged Eggs</div>
              {wizard.progression.eggs.length === 0 ? (
                <p className="text-[#615346]">No eggs incubating. Pair two creatures to begin—win 2 duels to hatch!</p>
              ) : (
                wizard.progression.eggs.map((egg) => (
                  <div key={egg.id} className="rounded-xl bg-[#efe4ce] p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold">{SPECIES_BY_ID[egg.resultSpeciesId]?.name ?? egg.resultSpeciesId} Egg</div>
                      <div className="text-[#615346]">{egg.parentA} × {egg.parentB}</div>
                    </div>
                    <span className="font-mono-num font-bold">{egg.winsDone}/{egg.winsNeeded} Wins</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
