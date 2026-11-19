import React, { useEffect, useRef, useState } from 'react';
import { Compass, Sparkles, Shield, Users, LogIn, Plus, ArrowRight, Lock } from 'lucide-react';
import { REALM_LIST, REALMS, type RealmId } from '../../../shared/realms.ts';
import { STARTER_ELEMENTS, ELEMENTS, type ElementId } from '../../../shared/elements.ts';
import {
  BEAST_CLANS,
  HAIR_STYLES,
  RACE_LIST,
  RACES,
  type BeastClanId,
  type RaceId,
  type StratumId,
  type WizardSculpt,
} from '../../../shared/wardrobe.ts';
import { createStarterWizard, type WizardDocument } from '../../../shared/economy.ts';
import type { RealmAccountState } from '../../lib/storage.ts';
import { ElementCrest } from '../../lib/elementIcons.tsx';
import { AvatarPreview3D } from '../../engine/avatarPreview3d.tsx';
import { HumanAppearanceChoice } from './HumanAppearanceChoice.tsx';

interface TitleWizardStudioProps {
  userEmail: string | null;
  isSignedIn: boolean;
  selectedRealm: RealmId;
  realmAccount: RealmAccountState;
  wizards: WizardDocument[];
  legacyWizards: WizardDocument[];
  onCopyLegacy: (wizard: WizardDocument) => void;
  onSignInGoogle: () => void;
  onSelectRealm: (realmId: RealmId) => void;
  onEnterWorld: (wizard: WizardDocument) => void;
  onCreateWizard: (wizard: WizardDocument) => Promise<boolean>;
  onSignOut: () => void;
  notice: string | null;
  enrollmentError: string | null;
  realmReady: boolean;
}

const STRATA_ORDER: { id: StratumId; label: string }[] = [
  { id: 'bridging', label: 'Core & Bridging Folk' },
  { id: 'canopy', label: 'Canopy & High Winds' },
  { id: 'waters', label: 'Waters & Hearth Valleys' },
  { id: 'deeproot', label: 'Deep Root & Astral Core' },
];

export const TitleWizardStudio: React.FC<TitleWizardStudioProps> = ({
  userEmail,
  isSignedIn,
  selectedRealm,
  realmAccount,
  wizards,
  legacyWizards,
  onCopyLegacy,
  onSignInGoogle,
  onSelectRealm,
  onEnterWorld,
  onCreateWizard,
  onSignOut,
  notice,
  enrollmentError,
  realmReady,
}) => {
  const pendingEnrollment = useRef<{ scope: string; id: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(wizards.length === 0);
  // The signed-in wizard list arrives asynchronously after Auth restores.
  // Reveal existing slots when the list hydrates, but preserve an intentional
  // "Enroll New Wizard" selection while slots are already populated.
  const awaitingWizardsRef = useRef(wizards.length === 0);
  useEffect(() => {
    if (wizards.length === 0) {
      awaitingWizardsRef.current = true;
      setCreating(true);
    } else if (awaitingWizardsRef.current) {
      awaitingWizardsRef.current = false;
      setCreating(false);
    }
  }, [wizards.length]);
  const [name, setName] = useState('Rowan Skyweaver');
  const [raceId, setRaceId] = useState<RaceId>('human');
  const [beastClan, setBeastClan] = useState<BeastClanId>('ember_fox');
  const [elementId, setElementId] = useState<ElementId>('ember');
  const [sculpt, setSculpt] = useState<WizardSculpt>({
    height: 1.0,
    build: 'balanced',
    skinHex: RACES.human.skinSwatches[1],
    hairStyle: HAIR_STYLES[0],
    hairHex: '#332822',
    hairTipHex: '#ff8a4c',
    eyeShape: 'bright',
    eyeLeftHex: '#3b82c4',
    eyeRightHex: '#3b82c4',
    browStyle: 'arched',
    marking: 'none',
    primaryDye: '#2f4569',
    trimDye: '#d4a13e',
    accentDye: '#d9532f',
    castPose: 'duelist',
  });

  const activeRace = RACES[raceId];
  const rowanHuman = raceId === 'human' && sculpt.humanModel !== 'classic';
  const unlockedSet = new Set(realmAccount.unlockedRaces);

  const handleRacePick = (nextRace: RaceId) => {
    if (!unlockedSet.has(nextRace)) return;
    setRaceId(nextRace);
    const r = RACES[nextRace];
    setSculpt((s) => ({ ...s, skinHex: r.skinSwatches[0] }));
    if (r.affinityElements.length > 0 && !r.affinityElements.includes(elementId)) {
      const nextEl = r.affinityElements[0];
      setElementId(nextEl);
      setSculpt((s) => ({
        ...s,
        skinHex: r.skinSwatches[0],
        hairTipHex: ELEMENTS[nextEl].glowHex,
        accentDye: ELEMENTS[nextEl].primaryHex,
      }));
    }
  };

  const handleElementPick = (el: ElementId) => {
    setElementId(el);
    setSculpt((s) => ({
      ...s,
      hairTipHex: ELEMENTS[el].glowHex,
      accentDye: ELEMENTS[el].primaryHex,
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !realmReady) return;
    const trimmedName = name.trim().slice(0, 24);
    const cleanName = trimmedName.length >= 2 ? trimmedName : 'Alder Initiate';
    const scope = `${realmAccount.uid}:${selectedRealm}`;
    const id = isSignedIn && pendingEnrollment.current?.scope === scope ? pendingEnrollment.current.id
      : `wiz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (isSignedIn) pendingEnrollment.current = { scope, id };
    const wiz = createStarterWizard({
      id,
      ownerId: realmAccount.uid,
      realmId: selectedRealm,
      name: cleanName,
      raceId,
      beastClan: raceId === 'beastfolk' ? beastClan : undefined,
      elementId,
      sculpt,
    });
    setSubmitting(true);
    try {
      if (await onCreateWizard(wiz)) {
        pendingEnrollment.current = null;
        setCreating(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[radial-gradient(circle_at_top,#2a3b5c_0%,#182033_65%,#111624_100%)] text-[#f7f0e2] p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        {notice && <p role="status" className="rounded-xl bg-[#202942] p-3">{notice}</p>}
        {isSignedIn && <button onClick={onSignOut} className="text-sm underline">Sign out</button>}
        {isSignedIn && legacyWizards.length > 0 && (
          <section className="space-y-2 rounded-xl border border-[#d7c7a9]/25 bg-[#202942] p-4">
            <h2 className="font-display text-lg">Earlier cloud saves</h2>
            <p className="text-sm">Copy an earlier wizard to this device, then sign out to play it as a guest.</p>
            {legacyWizards.map((wizard) => (
              <button key={wizard.id} onClick={() => onCopyLegacy(wizard)}
                className="mr-3 rounded-lg border border-[#d7c7a9]/25 px-3 py-1.5 text-sm">
                Copy {wizard.name} to guest saves
              </button>
            ))}
          </section>
        )}
        {/* Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d7c7a9]/25 bg-[#202942]/95 px-6 py-4 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#f4c98b]">
              <Sparkles className="h-3.5 w-3.5" /> Free-to-Play Storybook Sky-Island RPG
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-[#fffaf0]">
              Aldervale: Pact of Ten
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isSignedIn ? (
              <div className="rounded-xl border border-[#7de2d1]/30 bg-[#1a2238] px-3.5 py-2 text-xs">
                <span className="text-[#9fb3c8]">Cloud Save Active:</span>{' '}
                <strong className="text-[#fffaf0]">{userEmail || 'Google Wizard'}</strong>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignInGoogle}
                className="inline-flex items-center gap-2 rounded-xl bg-[#f4c98b] px-4 py-2 text-xs font-bold text-[#241b16] shadow hover:bg-[#ffd89e] transition"
              >
                <LogIn className="h-4 w-4" /> Sign in with Google (Cloud Sync)
              </button>
            )}
          </div>
        </header>

        {/* Realm Speed Server Picker */}
        <section className="grid gap-3 md:grid-cols-3">
          {REALM_LIST.map((r) => {
            const active = selectedRealm === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRealm(r.id)}
                className={`text-left rounded-2xl border p-4 transition ${
                  active
                    ? 'border-[#f4c98b] bg-[#2a3554] shadow-lg ring-2 ring-[#f4c98b]/30'
                    : 'border-[#d7c7a9]/20 bg-[#1d253b]/85 hover:border-[#d7c7a9]/45'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-[#fffaf0]">{r.name} Realm</span>
                  <span
                    className="rounded-lg px-2 py-0.5 text-[11px] font-bold text-white"
                    style={{ backgroundColor: r.accentHex }}
                  >
                    {r.tagline}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[#c7d0e0] leading-relaxed">{r.description}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] font-mono-num text-[#f4c98b]">
                  <span>XP {r.xpMultiplier}×</span>
                  <span>Drops {r.dropMultiplier}×</span>
                  <span>Isolated Economy</span>
                </div>
              </button>
            );
          })}
        </section>

        {/* Wizard Slots or Avatar Studio */}
        {!creating && wizards.length > 0 ? (
          <section className="rounded-2xl border border-[#d7c7a9]/25 bg-[#202942]/95 p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[#fffaf0]">
                  Your Wizards in {REALMS[selectedRealm].name} ({wizards.length}/3 Slots)
                </h2>
                <p className="text-xs text-[#b8c2d6]">
                  Unlocked Lineages ({realmAccount.unlockedRaces.length}/13) &amp; Shared Realm Vault apply across all slots here.
                </p>
              </div>
              {wizards.length < 3 && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#38a3a5] px-4 py-2 text-xs font-bold text-white hover:bg-[#44b8ba]"
                >
                  <Plus className="h-4 w-4" /> Enroll New Wizard
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {wizards.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#d7c7a9]/25 bg-[#182033] p-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-bold text-[#fffaf0]">{w.name}</span>
                      <ElementCrest elementId={w.elementId} showLabel />
                    </div>
                    <div className="mt-1 text-xs text-[#c7d0e0]">
                      {RACES[w.raceId].name} · Level {w.level} · Rank {w.rank}
                    </div>
                    <div className="mt-3 h-48 rounded-xl bg-[#111726]/70 overflow-hidden">
                      <AvatarPreview3D
                        config={{
                          raceId: w.raceId,
                          beastClan: w.beastClan,
                          elementId: w.elementId,
                          sculpt: w.sculpt,
                          equipped: w.wardrobe.equipped,
                          stitching: w.stitching,
                        }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEnterWorld(w)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f4c98b] px-4 py-2.5 text-sm font-bold text-[#241b16] hover:bg-[#ffd9a3]"
                  >
                    Enter Aldervale <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <form
            onSubmit={handleCreateSubmit}
            className="grid gap-5 lg:grid-cols-[1.35fr_0.95fr] rounded-2xl border border-[#d7c7a9]/25 bg-[#202942]/95 p-5 shadow-xl"
          >
            {/* Left Column: Three-Strata Race & Sculpt Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[#fffaf0]">
                  Enroll Wizard in {REALMS[selectedRealm].name}
                </h2>
                {wizards.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="text-xs font-semibold text-[#f4c98b] underline"
                  >
                    Back to Slots
                  </button>
                )}
              </div>

              {enrollmentError && <p role="alert" className="rounded-xl bg-[#502d39] p-3 text-sm">{enrollmentError}</p>}

              {/* Three-Strata Race Ecology Picker */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#f4c98b]">
                  1. Sky-Island Lineage (Three-Strata Ecology)
                </div>
                {STRATA_ORDER.map((stratum) => {
                  const stratumRaces = RACE_LIST.filter((r) => r.stratum === stratum.id);
                  return (
                    <div key={stratum.id} className="rounded-xl border border-[#d7c7a9]/15 bg-[#171f33] p-2.5">
                      <div className="mb-1.5 text-[11px] font-semibold text-[#9fb3c8]">{stratum.label}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {stratumRaces.map((r) => {
                          const unlocked = unlockedSet.has(r.id);
                          const selected = raceId === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleRacePick(r.id)}
                              title={unlocked ? r.silhouetteNotes : r.unlockRequirementLabel}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition ${
                                selected
                                  ? 'border-[#f4c98b] bg-[#36446b] text-[#fffaf0]'
                                  : unlocked
                                    ? 'border-[#d7c7a9]/20 bg-[#212b45] text-[#dce3f0] hover:border-[#f4c98b]/60'
                                    : 'border-white/10 bg-[#131928] text-[#768299] cursor-not-allowed'
                              }`}
                            >
                              {!unlocked && <Lock className="h-3 w-3 text-[#d97706]" />}
                              <span>{r.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-xl bg-[#161e30] px-3 py-2 text-xs text-[#c7d0e0]">
                  <strong className="text-[#f4c98b]">{activeRace.name}:</strong> {activeRace.silhouetteNotes}{' '}
                  <span className="text-[#7de2d1]">({activeRace.passiveName})</span>
                </div>
              </div>

              {/* Beastfolk Clan Selector */}
              {activeRace.hasBeastClans && (
                <div className="rounded-xl border border-[#f4c98b]/30 bg-[#171f33] p-3">
                  <div className="text-xs font-bold text-[#f4c98b] mb-2">Beastfolk Sub-Clan</div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(BEAST_CLANS) as BeastClanId[]).map((cid) => {
                      const clan = BEAST_CLANS[cid];
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => {
                            setBeastClan(cid);
                            handleElementPick(clan.element);
                          }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                            beastClan === cid ? 'border-[#f4c98b] bg-[#354369] text-white' : 'border-white/15 bg-[#1e2740]'
                          }`}
                        >
                          {clan.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Element Affinity Picker */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#f4c98b] mb-2">
                  2. Element Affinity {activeRace.usesElementMoltenChest && '(Lights Stoneborn Chest Cracks)'}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {STARTER_ELEMENTS.map((el) => {
                    const active = elementId === el.id;
                    return (
                      <button
                        key={el.id}
                        type="button"
                        onClick={() => handleElementPick(el.id)}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition ${
                          active
                            ? 'border-[#f4c98b] bg-[#2f3c5e] ring-2 ring-[#f4c98b]/35'
                            : 'border-white/10 bg-[#171f33] hover:border-white/30'
                        }`}
                      >
                        <ElementCrest elementId={el.id} size={18} />
                        <span className="font-semibold">{el.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Anime-Storybook Facial, Proportion & Streetwear Dye Sculpting */}
              <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-[#d7c7a9]/15 bg-[#171f33] p-3 text-xs">
                {raceId === 'human' && (
                  <div className="sm:col-span-2 text-[#c7d0e0]">
                    <HumanAppearanceChoice value={sculpt.humanModel} onChange={(humanModel) => setSculpt((s) => ({ ...s, humanModel }))} />
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-[#c7d0e0] mb-1">Wizard Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={24}
                    className="w-full rounded-lg border border-white/15 bg-[#101626] px-3 py-1.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#c7d0e0] mb-1">Hair Style</label>
                  <select
                    value={sculpt.hairStyle}
                    disabled={rowanHuman}
                    onChange={(e) => setSculpt((s) => ({ ...s, hairStyle: e.target.value }))}
                    className="w-full rounded-lg border border-white/15 bg-[#101626] px-2.5 py-1.5 text-white"
                  >
                    {HAIR_STYLES.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#c7d0e0] mb-1">
                    {activeRace.usesElementMoltenChest ? 'Carved Stone Tone' : 'Skin Tone'}
                  </label>
                  <div className="flex gap-2">
                    {activeRace.skinSwatches.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        disabled={rowanHuman}
                        onClick={() => setSculpt((s) => ({ ...s, skinHex: hex }))}
                        className={`h-6 w-6 rounded-full border-2 ${sculpt.skinHex === hex ? 'border-[#f4c98b] scale-110' : 'border-white/25'}`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#c7d0e0] mb-1">
                    Height ({sculpt.height.toFixed(2)}×) · Build
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      aria-label="Wizard height"
                      min={0.88}
                      max={1.12}
                      step={0.02}
                      value={sculpt.height}
                      onChange={(e) => setSculpt((s) => ({ ...s, height: Number(e.target.value) }))}
                      className="w-24 accent-[#f4c98b]"
                    />
                    <select
                      value={sculpt.build}
                      aria-label="Wizard build"
                      onChange={(e) => setSculpt((s) => ({ ...s, build: e.target.value as WizardSculpt['build'] }))}
                      className="rounded-lg border border-white/15 bg-[#101626] px-2 py-1 text-white"
                    >
                      <option value="slender">Slender</option>
                      <option value="balanced">Balanced</option>
                      <option value="athletic">Athletic</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#c7d0e0] mb-1">Eyes · Brows</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={sculpt.eyeShape}
                      disabled={rowanHuman}
                      onChange={(e) => setSculpt((s) => ({ ...s, eyeShape: e.target.value as WizardSculpt['eyeShape'] }))}
                      className="flex-1 rounded-lg border border-white/15 bg-[#101626] px-2 py-1 text-white"
                    >
                      <option value="bright">Bright</option>
                      <option value="sharp">Sharp</option>
                      <option value="gentle">Gentle</option>
                    </select>
                    <select
                      value={sculpt.browStyle}
                      disabled={rowanHuman}
                      onChange={(e) => setSculpt((s) => ({ ...s, browStyle: e.target.value as WizardSculpt['browStyle'] }))}
                      className="flex-1 rounded-lg border border-white/15 bg-[#101626] px-2 py-1 text-white"
                    >
                      <option value="arched">Arched</option>
                      <option value="bold">Bold</option>
                      <option value="soft">Soft</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#c7d0e0] mb-1">Marking · Stance</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={sculpt.marking}
                      disabled={rowanHuman}
                      onChange={(e) => setSculpt((s) => ({ ...s, marking: e.target.value as WizardSculpt['marking'] }))}
                      className="flex-1 rounded-lg border border-white/15 bg-[#101626] px-2 py-1 text-white"
                    >
                      <option value="none">None</option>
                      <option value="star_freckle">Star Freckles</option>
                      <option value="cheek_rune">Cheek Rune</option>
                      <option value="brow_scar">Brow Scar</option>
                      <option value="crescent">Crescent</option>
                    </select>
                    <select
                      value={sculpt.castPose}
                      disabled={rowanHuman}
                      onChange={(e) => setSculpt((s) => ({ ...s, castPose: e.target.value as WizardSculpt['castPose'] }))}
                      className="flex-1 rounded-lg border border-white/15 bg-[#101626] px-2 py-1 text-white"
                    >
                      <option value="duelist">Duelist</option>
                      <option value="scholar">Scholar</option>
                      <option value="drifter">Drifter</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5">
                    <span>Jacket</span>
                    <input disabled={rowanHuman} type="color" value={sculpt.primaryDye} onChange={(e) => setSculpt((s) => ({ ...s, primaryDye: e.target.value }))} className="h-6 w-8 rounded bg-transparent" />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span>Trim</span>
                    <input disabled={rowanHuman} type="color" value={sculpt.trimDye} onChange={(e) => setSculpt((s) => ({ ...s, trimDye: e.target.value }))} className="h-6 w-8 rounded bg-transparent" />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span>Hair</span>
                    <input disabled={rowanHuman} type="color" value={sculpt.hairHex} onChange={(e) => setSculpt((s) => ({ ...s, hairHex: e.target.value }))} className="h-6 w-8 rounded bg-transparent" />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span>L-Eye</span>
                    <input disabled={rowanHuman} type="color" value={sculpt.eyeLeftHex} onChange={(e) => setSculpt((s) => ({ ...s, eyeLeftHex: e.target.value }))} className="h-6 w-8 rounded bg-transparent" />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span>R-Eye</span>
                    <input disabled={rowanHuman} type="color" value={sculpt.eyeRightHex} onChange={(e) => setSculpt((s) => ({ ...s, eyeRightHex: e.target.value }))} className="h-6 w-8 rounded bg-transparent" />
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Live 3D Avatar Preview & Submit */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#d7c7a9]/20 bg-[#151c2e] p-4">
              <div>
                <div className="flex items-center justify-between text-xs text-[#c7d0e0] mb-1">
                  <span className="font-bold text-[#fffaf0]">{activeRace.name}</span>
                  <ElementCrest elementId={elementId} showLabel />
                </div>
                <div className="h-80 w-full rounded-xl bg-[radial-gradient(circle_at_center,#273657_0%,#111626_100%)] overflow-hidden">
                  <AvatarPreview3D
                    config={{
                      raceId,
                      beastClan: raceId === 'beastfolk' ? beastClan : undefined,
                      elementId,
                      sculpt,
                      equipped: {
                        headgear: 'hat_academy_cap',
                        torso: 'torso_bomber',
                        back: 'back_satchel',
                        footwear: 'boots_sneakers',
                        staff: 'staff_oak_wand',
                      },
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[#9fb3c8] px-1">
                  <span className="inline-flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Zero Paywalls</span>
                  <span className="inline-flex items-center gap-1"><Compass className="h-3.5 w-3.5" /> {REALMS[selectedRealm].name} Realm</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Live Multiplayer</span>
                </div>
                <button
                  type="submit" disabled={submitting || !realmReady}
                  className="w-full rounded-xl bg-[#f4c98b] py-3 font-display text-base font-bold text-[#241b16] shadow-lg hover:bg-[#ffd9a3] transition"
                >
                  {submitting ? 'Saving wizard…' : 'Begin Academy Journey'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
