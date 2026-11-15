import React, { useState } from 'react';
import { Scissors, Gem, RefreshCcw, Archive } from 'lucide-react';
import { MODULAR_GEAR, GEAR_BY_ID, RUNESTONES, RACES, type RaceId } from '../../../shared/wardrobe.ts';
import type { WizardDocument } from '../../../shared/economy.ts';
import type { RealmAccountState } from '../../lib/storage.ts';
import { usesRowanModel, type RowanModelKind } from '../../engine/rowanModel.ts';
import { AvatarPreview3D } from '../../engine/avatarPreview3d.tsx';

interface TailorStudioPanelProps {
  wizard: WizardDocument;
  bazaarGear?: Record<string, number>;
  realmAccount: RealmAccountState;
  onUpdateWizard: (next: WizardDocument) => void;
  onUpdateRealmAccount: (next: RealmAccountState) => void;
  onClose: () => void;
}

export const TailorStudioPanel: React.FC<TailorStudioPanelProps> = ({
  wizard,
  bazaarGear,
  realmAccount,
  onUpdateWizard,
  onUpdateRealmAccount,
  onClose,
}) => {
  const [previewModel, setPreviewModel] = useState<RowanModelKind | 'procedural'>('procedural');
  const canPreviewRowan = usesRowanModel(wizard);
  const rowanPreview = canPreviewRowan && previewModel !== 'procedural' ? previewModel : undefined;
  const [tab, setTab] = useState<'wardrobe' | 'stitching' | 'sockets' | 'lineage' | 'vault'>('wardrobe');
  const [slotFilter, setSlotFilter] = useState<'headgear' | 'torso' | 'back' | 'footwear' | 'staff'>('torso');

  const ownedGear = MODULAR_GEAR.filter((g) => wizard.wardrobe.ownedGearIds.includes(g.id) || (bazaarGear?.[g.id] ?? 0) > 0);
  const slotOwned = ownedGear.filter((g) => g.slot === slotFilter);

  const equipGear = (itemId: string) => {
    const item = GEAR_BY_ID[itemId];
    if (!item || !ownedGear.some((gear) => gear.id === itemId)) return;
    onUpdateWizard({
      ...wizard,
      wardrobe: {
        ...wizard.wardrobe,
        equipped: { ...wizard.wardrobe.equipped, [item.slot]: item.id },
      },
    });
  };

  const applyStitch = (slot: typeof slotFilter, visualGearId: string | null) => {
    onUpdateWizard({
      ...wizard,
      stitching: { ...wizard.stitching, [slot]: visualGearId },
    });
  };

  const socketRunestone = (runeId: string) => {
    const rune = RUNESTONES.find((r) => r.id === runeId);
    if (!rune || wizard.currencies.florins < rune.priceFlorins) return;
    if (wizard.wardrobe.socketedRunestones.length >= 6) return;
    onUpdateWizard({
      ...wizard,
      currencies: { ...wizard.currencies, florins: wizard.currencies.florins - rune.priceFlorins },
      wardrobe: {
        ...wizard.wardrobe,
        socketedRunestones: [...wizard.wardrobe.socketedRunestones, rune.id],
      },
    });
  };

  const applyRebirthSeal = (newRaceId: RaceId) => {
    if (wizard.progression.rebirthSeals < 1) return;
    const r = RACES[newRaceId];
    onUpdateWizard({
      ...wizard,
      raceId: newRaceId,
      sculpt: { ...wizard.sculpt, skinHex: r.skinSwatches[0] },
      progression: { ...wizard.progression, rebirthSeals: wizard.progression.rebirthSeals - 1 },
    });
  };

  const depositToVault = (gearId: string) => {
    if (wizard.wardrobe.ownedGearIds.length <= 5 || !wizard.wardrobe.ownedGearIds.includes(gearId)) return;
    onUpdateRealmAccount({ ...realmAccount, sharedVault: [...realmAccount.sharedVault, gearId] });
  };

  const withdrawFromVault = (idx: number) => {
    const itemId = realmAccount.sharedVault[idx];
    if (!itemId) return;
    const nextVault = [...realmAccount.sharedVault];
    nextVault.splice(idx, 1);
    onUpdateRealmAccount({ ...realmAccount, sharedVault: nextVault });
    if (!wizard.wardrobe.ownedGearIds.includes(itemId)) {
      onUpdateWizard({
        ...wizard,
        wardrobe: { ...wizard.wardrobe, ownedGearIds: [...wizard.wardrobe.ownedGearIds, itemId] },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#101522]/85 p-4">
      <div className="storybook-panel grid w-full max-w-5xl gap-5 rounded-3xl p-6 md:grid-cols-[0.9fr_1.3fr] max-h-[90vh] overflow-y-auto">
        {/* Live 3D Turntable */}
        <div className="flex flex-col justify-between rounded-2xl bg-[#182033] p-4 text-[#f7f0e2]">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-bold">{wizard.name}</span>
              <span className="text-xs text-[#f4c98b] font-mono-num">{wizard.currencies.florins} Florins</span>
            </div>
            <div className="mt-2 h-80 rounded-xl bg-[radial-gradient(circle_at_center,#273657_0%,#111626_100%)] overflow-hidden">
              <AvatarPreview3D
                rowanModel={rowanPreview}
                config={{
                  raceId: wizard.raceId,
                  beastClan: wizard.beastClan,
                  elementId: wizard.elementId,
                  sculpt: wizard.sculpt,
                  equipped: wizard.wardrobe.equipped,
                  stitching: wizard.stitching,
                }}
              />
            </div>
          </div>

          {canPreviewRowan && (
            <label className="mt-3 flex items-center gap-2 text-xs">
              Model preview
              <select
                value={previewModel}
                onChange={(event) => setPreviewModel(event.target.value as typeof previewModel)}
                className="rounded-md bg-[#273657] p-1"
              >
                <option value="procedural">Wardrobe preview</option>
                <option value="rigged">Rowan (animated)</option>
                <option value="prototype">Rowan (static prototype)</option>
              </select>
            </label>
          )}
          {rowanPreview && <p className="mt-2 text-xs">This model uses its own outfit and colors.</p>}
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              <span>Primary</span>
              <input type="color" value={wizard.sculpt.primaryDye} onChange={(e) => onUpdateWizard({ ...wizard, sculpt: { ...wizard.sculpt, primaryDye: e.target.value } })} />
            </label>
            <label className="flex items-center gap-1.5">
              <span>Trim</span>
              <input type="color" value={wizard.sculpt.trimDye} onChange={(e) => onUpdateWizard({ ...wizard, sculpt: { ...wizard.sculpt, trimDye: e.target.value } })} />
            </label>
            <label className="flex items-center gap-1.5">
              <span>Accent</span>
              <input type="color" value={wizard.sculpt.accentDye} onChange={(e) => onUpdateWizard({ ...wizard, sculpt: { ...wizard.sculpt, accentDye: e.target.value } })} />
            </label>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-[#d7c7a9] pb-3">
            <h2 className="font-display text-2xl font-bold text-[#241b16]">Velvet Thimble &amp; Wardrobe</h2>
            <button onClick={onClose} className="rounded-xl border border-[#c9b796] px-3 py-1 text-xs font-bold hover:bg-[#efe4ce]">
              Close
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { id: 'wardrobe', label: 'Equip Gear' },
              { id: 'stitching', label: 'Free Stitching', icon: Scissors },
              { id: 'sockets', label: 'Runestone Sockets', icon: Gem },
              { id: 'lineage', label: 'Lineage Rite', icon: RefreshCcw },
              { id: 'vault', label: 'Realm Vault', icon: Archive },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold border ${
                  tab === t.id ? 'border-[#241b16] bg-[#241b16] text-[#f4c98b]' : 'border-[#d7c7a9] bg-white/70 text-[#241b16]'
                }`}
              >
                {t.icon && <t.icon className="h-3.5 w-3.5" />}
                {t.label}
              </button>
            ))}
          </div>

          {(tab === 'wardrobe' || tab === 'stitching') && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-1.5">
                {(['headgear', 'torso', 'back', 'footwear', 'staff'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlotFilter(s)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize ${
                      slotFilter === s ? 'bg-[#38a3a5] text-white' : 'bg-[#efe4ce] text-[#241b16]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {slotOwned.map((item) => {
                  const isEquipped = wizard.wardrobe.equipped[slotFilter] === item.id;
                  const isStitched = wizard.stitching[slotFilter] === item.id;
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#d7c7a9] bg-white/80 p-3 text-xs">
                      <div>
                        <div className="font-bold text-[#241b16]">{item.name}</div>
                        <div className="text-[#615346]">
                          +{item.stats.hp} HP · +{item.stats.powerPct}% Power · +{item.stats.accuracyPct}% Acc
                        </div>
                      </div>
                      {tab === 'wardrobe' ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => equipGear(item.id)}
                            className={`rounded-lg px-3 py-1 font-bold ${isEquipped ? 'bg-[#2f8a73] text-white' : 'bg-[#241b16] text-[#f4c98b]'}`}
                          >
                            {isEquipped ? 'Equipped' : 'Equip'}
                          </button>
                          <button
                            onClick={() => depositToVault(item.id)}
                            className="rounded-lg border border-[#d7c7a9] px-2 py-1 font-semibold"
                            title="Copy to Shared Realm Vault"
                          >
                            Vault
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => applyStitch(slotFilter, isStitched ? null : item.id)}
                          className={`rounded-lg px-3 py-1 font-bold ${isStitched ? 'bg-[#8a52c7] text-white' : 'bg-[#efe4ce] text-[#241b16]'}`}
                        >
                          {isStitched ? 'Stitched Look' : 'Apply Look (Free)'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'sockets' && (
            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl bg-[#efe4ce] p-3">
                <strong>Active Socketed Runestones ({wizard.wardrobe.socketedRunestones.length}/6):</strong>{' '}
                {wizard.wardrobe.socketedRunestones.length === 0
                  ? 'None yet'
                  : wizard.wardrobe.socketedRunestones.map((id) => RUNESTONES.find((r) => r.id === id)?.name).join(', ')}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {RUNESTONES.map((r) => (
                  <div key={r.id} className="rounded-xl border border-[#d7c7a9] bg-white/80 p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold">{r.name}</div>
                      <div className="text-[#615346]">
                        {r.bonusHp ? `+${r.bonusHp} HP ` : ''}
                        {r.bonusPowerPct ? `+${r.bonusPowerPct}% Pwr ` : ''}
                        {r.bonusAccuracyPct ? `+${r.bonusAccuracyPct}% Acc ` : ''}
                        {r.bonusPiercePct ? `+${r.bonusPiercePct}% Pierce` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => socketRunestone(r.id)}
                      className="rounded-lg bg-[#241b16] px-3 py-1.5 font-bold text-[#f4c98b]"
                    >
                      {r.priceFlorins}F
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'lineage' && (
            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl bg-[#efe4ce] p-3">
                <strong>Lineage Rite Rebirth Seals:</strong> {wizard.progression.rebirthSeals} available (earned free from Term Track &amp; Quests).
              </div>
              <div className="flex flex-wrap gap-2">
                {realmAccount.unlockedRaces.map((rid) => (
                  <button
                    key={rid}
                    disabled={wizard.progression.rebirthSeals < 1 || wizard.raceId === rid}
                    onClick={() => applyRebirthSeal(rid)}
                    className="rounded-xl border border-[#d7c7a9] bg-white px-3 py-2 font-bold disabled:opacity-45"
                  >
                    Rebirth as {RACES[rid].name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'vault' && (
            <div className="mt-4 space-y-2 text-xs">
              <p className="text-[#615346]">Shared across your 3 Wizard Slots in the {wizard.realmId.toUpperCase()} Realm only.</p>
              {realmAccount.sharedVault.length === 0 ? (
                <div className="rounded-xl bg-[#efe4ce] p-4">Vault is empty.</div>
              ) : (
                realmAccount.sharedVault.map((gid, i) => (
                  <div key={`${gid}_${i}`} className="flex items-center justify-between rounded-xl border border-[#d7c7a9] bg-white p-2.5">
                    <span className="font-bold">{GEAR_BY_ID[gid]?.name ?? gid}</span>
                    <button onClick={() => withdrawFromVault(i)} className="rounded-lg bg-[#38a3a5] px-3 py-1 font-bold text-white">
                      Claim to Wizard
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
