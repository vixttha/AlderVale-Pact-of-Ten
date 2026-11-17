import { useState } from 'react';
import { Compass, Egg, Flame, Sprout } from 'lucide-react';
import type { MagmaPactTrail, WizardDocument } from '../../../shared/economy.ts';
import type { OwnedCreature } from '../../lib/storage.ts';
import { CALDERA_NEWT, getMagmaPactCompanions, type MagmaPactAction } from './magmaPact.ts';

const trails: { id: MagmaPactTrail; name: string; clue: string }[] = [
  { id: 'tempest', name: 'Tempest', clue: 'Lightning skips across the stones of a storm-fed river.' },
  { id: 'glacier', name: 'Glacier', clue: 'Tracks cross a meltwater channel where the ice should be too thin.' },
  { id: 'eclipse', name: 'Eclipse', clue: 'At twilight, pawprints appear between the shadow and the last beam of light.' },
];

const buttonStyle = 'rounded-xl bg-[#241b16] px-4 py-2.5 text-sm font-semibold text-[#fff1c9] hover:bg-[#3d2b24] disabled:opacity-45';

interface Props {
  wizard: WizardDocument;
  creatures: OwnedCreature[];
  onAction: (action: MagmaPactAction) => boolean;
  onAdopt: () => void;
}

export function MagmaPactPanel({ wizard, creatures, onAction, onAdopt }: Props) {
  const pact = wizard.progression.magmaPact;
  const { fire, forest } = getMagmaPactCompanions(wizard, creatures);
  const [fireChoice, setFireChoice] = useState('');
  const [forestChoice, setForestChoice] = useState('');
  const [error, setError] = useState(false);
  const fireId = fire.find((pet) => pet.id === fireChoice)?.id ?? fire[0]?.id ?? '';
  const forestId = forest.find((pet) => pet.id === forestChoice)?.id ?? forest[0]?.id ?? '';
  const forestCompanion = forest.find((pet) => pet.id === pact?.forestId);

  function act(action: MagmaPactAction) {
    setError(!onAction(action));
  }

  return (
    <section aria-labelledby="magma-pact-heading" className="mt-4 overflow-hidden rounded-2xl border border-[#c9b796] bg-[#fbf2dd] text-[#241b16]">
      <header className="bg-gradient-to-br from-[#281b1a] via-[#4c2a22] to-[#6e3725] p-5 text-[#fff0ce] sm:p-6">
        <h3 id="magma-pact-heading" className="font-display text-2xl font-bold">The Caldera Pact</h3>
        <p className="mt-1 max-w-lg text-sm text-[#fff0ce]">Warm stone meets living roots beneath the Training Arbor.</p>
      </header>

      <div className="grid gap-4 p-5 sm:p-6">
        {error && <p role="alert" className="rounded-xl border border-[#9e3528] bg-[#fff3e7] p-3 text-sm">The pact could not be saved. Check your companions and try again.</p>}

        {!pact && (
          <>
            <p className="text-sm">Bring one Fire and one Forest companion to form a Caldera Newt egg. Both companions stay with you.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">
                <span className="flex items-center gap-2"><Flame size={16} aria-hidden="true" /> Fire companion</span>
                <select value={fireId} onChange={(event) => setFireChoice(event.target.value)} className="rounded-lg border border-[#c9b796] bg-white p-2 font-normal">
                  {fire.length === 0 && <option value="">No Fire companion</option>}
                  {fire.map((pet) => <option key={pet.id} value={pet.id}>{pet.nickname}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                <span className="flex items-center gap-2"><Sprout size={16} aria-hidden="true" /> Forest companion</span>
                <select value={forestId} onChange={(event) => setForestChoice(event.target.value)} className="rounded-lg border border-[#c9b796] bg-white p-2 font-normal">
                  {forest.length === 0 && <option value="">No Forest companion</option>}
                  {forest.map((pet) => <option key={pet.id} value={pet.id}>{pet.nickname}</option>)}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonStyle} disabled={!fireId || !forestId} onClick={() => act({ type: 'open-vent', fireId, forestId })}>Open the vent</button>
              {(!fireId || !forestId) && <button type="button" className="rounded-xl border border-[#c9b796] px-4 py-2 text-sm font-semibold" onClick={onAdopt}>Find companions in Bonding Adoption</button>}
            </div>
          </>
        )}

        {pact?.phase === 'vent-open' && (
          <div className="space-y-3">
            <p role="status" className="text-sm">The Fire companion opened the vent. Heat loosens the stone beneath the path.</p>
            <p className="text-sm">Guide {forestCompanion?.nickname ?? 'your Forest companion'} to thread roots through the cracks.</p>
            <button type="button" className={buttonStyle} onClick={() => act({ type: 'anchor-path' })}>Anchor the path</button>
          </div>
        )}

        {pact?.phase === 'egg' && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-display text-lg font-bold"><Egg size={20} aria-hidden="true" /> Caldera Newt Egg</h4>
            <p role="status" className="text-sm">The roots have closed the shell. Move the egg onto the warm stone shelf to incubate it.</p>
            <button type="button" className={buttonStyle} onClick={() => act({ type: 'warm-egg' })}>Warm the egg</button>
          </div>
        )}

        {pact?.phase === 'ready' && (
          <div className="space-y-3">
            <h4 className="font-display text-lg font-bold">Choose your Newt’s first move</h4>
            <p className="text-sm">The shell is cracking. You can switch moves later in the Training Arbor.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([['A', CALDERA_NEWT.branchA, `${CALDERA_NEWT.branchA.value} base damage to one target.`],
                ['B', CALDERA_NEWT.branchB, `Gives your wizard a ${CALDERA_NEWT.branchB.value}% ward.`]] as const).map(([branch, move, detail]) => (
                <div key={branch} className="grid gap-2 rounded-xl border border-[#c9b796] bg-white/75 p-3">
                  <p className="text-sm">{detail}</p>
                  <button type="button" className={buttonStyle} onClick={() => act({ type: 'hatch', branch })}>Hatch with {move.name}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pact?.phase === 'hatched' && (
          <div className="space-y-3">
            <h4 className="font-display text-lg font-bold">Caldera Newt joined your roster</h4>
            <p className="text-sm">You can make the Newt your lead from My Creatures.</p>
            <fieldset className="space-y-2">
              <legend className="font-display text-lg font-bold">Which trail would you follow next?</legend>
              <p className="text-sm">Save a clue for a future expedition.</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {trails.map((trail) => (
                  <button key={trail.id} type="button" aria-pressed={pact.nextTrail === trail.id} onClick={() => act({ type: 'follow-trail', trail: trail.id })}
                    className="grid gap-1 rounded-xl border border-[#c9b796] bg-white/75 p-3 text-left hover:bg-white aria-pressed:border-[#87452e] aria-pressed:bg-[#f4dfbf]">
                    <span className="flex items-center gap-2 text-sm font-bold"><Compass size={15} aria-hidden="true" /> {trail.name}</span>
                    <span className="text-xs text-[#574337]">{trail.clue}</span>
                  </button>
                ))}
              </div>
              <p role="status" className="text-sm">{pact.nextTrail ? `${trails.find((trail) => trail.id === pact.nextTrail)?.name} clue saved.` : 'You can leave the trails unexplored.'}</p>
            </fieldset>
          </div>
        )}
      </div>
    </section>
  );
}
