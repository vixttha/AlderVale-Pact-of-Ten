import React, { useEffect, useState } from 'react';
import { Home, Sprout, Camera, Globe, Move } from 'lucide-react';
import { DORM_CATALOG, DORM_THEMES, DORM_WEATHERS } from '../../../shared/world.ts';
import { STARTER_ELEMENTS } from '../../../shared/elements.ts';
import type { WizardDocument } from '../../../shared/economy.ts';
import type { SanctuaryState } from '../../lib/storage.ts';

interface SanctuaryPanelProps {
  wizard: WizardDocument;
  sanctuary: SanctuaryState;
  galleryImages: string[];
  onUpdateWizard: (next: WizardDocument) => void;
  onUpdateSanctuary: (next: SanctuaryState) => void;
  onCaptureSkyLens: () => void;
  onClose: () => void;
}

export const SanctuaryPanel: React.FC<SanctuaryPanelProps> = ({
  wizard,
  sanctuary,
  galleryImages,
  onUpdateWizard,
  onUpdateSanctuary,
  onCaptureSkyLens,
  onClose,
}) => {
  const [tab, setTab] = useState<'build' | 'garden' | 'tours' | 'skylens'>('build');
  const [tours, setTours] = useState<{ wizardId: string; wizardName: string; themeId: string; ratingAvg: number; ratingCount: number }[]>([]);

  useEffect(() => {
    if (tab !== 'tours') return;
    fetch(`/api/tours/${wizard.realmId}`)
      .then((r) => r.json())
      .then((d) => setTours(d.tours ?? []))
      .catch(() => {});
  }, [tab, wizard.realmId]);

  const placeItem = (catalogId: string) => {
    const def = DORM_CATALOG.find((i) => i.id === catalogId);
    if (!def || wizard.currencies.florins < def.priceFlorins) return;
    const angle = sanctuary.items.length * 0.9;
    const placed = {
      uid: `dorm_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      catalogId: def.id,
      name: def.name,
      x: Number((Math.cos(angle) * 4.5).toFixed(1)),
      y: 0,
      z: Number((Math.sin(angle) * 4.5).toFixed(1)),
      rotY: 0,
      scale: 1.0,
      colorHex: def.colorHex,
      triggerKind: def.triggerKind,
    };
    onUpdateWizard({
      ...wizard,
      currencies: { ...wizard.currencies, florins: wizard.currencies.florins - def.priceFlorins },
    });
    onUpdateSanctuary({ ...sanctuary, items: [...sanctuary.items, placed] });
  };

  const adjustPlaced = (uid: string, patch: Partial<{ x: number; y: number; z: number; scale: number; rotY: number }>) => {
    onUpdateSanctuary({
      ...sanctuary,
      items: sanctuary.items.map((it) => (it.uid === uid ? { ...it, ...patch } : it)),
    });
  };

  const plantGarden = (plotIdx: number, elId: typeof STARTER_ELEMENTS[number]['id']) => {
    const now = Date.now();
    const gardens = [...sanctuary.gardens];
    while (gardens.length <= plotIdx) {
      gardens.push({ plotId: `plot_${gardens.length}`, seedElement: null, plantedAt: 0, readyAt: 0 });
    }
    gardens[plotIdx] = { plotId: `plot_${plotIdx}`, seedElement: elId, plantedAt: now, readyAt: now + 20_000 };
    onUpdateSanctuary({ ...sanctuary, gardens });
  };

  const harvestGarden = (plotIdx: number) => {
    const g = sanctuary.gardens[plotIdx];
    if (!g || !g.seedElement || Date.now() < g.readyAt) return;
    const gardens = sanctuary.gardens.map((p, i) => (i === plotIdx ? { ...p, seedElement: null, plantedAt: 0, readyAt: 0 } : p));
    onUpdateSanctuary({ ...sanctuary, gardens });
    onUpdateWizard({
      ...wizard,
      currencies: { ...wizard.currencies, florins: wizard.currencies.florins + 45 },
      resources: { ...wizard.resources, sunleaf: wizard.resources.sunleaf + 2 },
    });
  };

  const publishDormTour = async () => {
    onUpdateSanctuary({ ...sanctuary, isPublic: true });
    await fetch(`/api/tours/${wizard.realmId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wizardId: wizard.id, wizardName: `${wizard.name}'s Loft`, themeId: sanctuary.themeId }),
    }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#101522]/85 p-4">
      <div className="storybook-panel w-full max-w-5xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7c7a9] pb-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#241b16]">Personal Sanctuary Dorm &amp; Sky-Lens</h2>
            <p className="text-xs text-[#615346]">Customize loft theme, weather, 0.5×–2.0× furniture scale, garden plots, and public tours.</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-[#c9b796] px-3 py-1.5 text-xs font-bold hover:bg-[#efe4ce]">
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: 'build', label: 'Furniture & Themes', icon: Home },
            { id: 'garden', label: 'Sky-Soil Gardens', icon: Sprout },
            { id: 'skylens', label: `Sky-Lens Paintings (${galleryImages.length})`, icon: Camera },
            { id: 'tours', label: 'Public Dorm Tours', icon: Globe },
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

        {tab === 'build' && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 text-xs">
            <div className="space-y-3 rounded-2xl border border-[#d7c7a9] bg-white/80 p-4">
              <div className="font-bold text-sm">Loft Theme &amp; Atmosphere</div>
              <div className="flex flex-wrap gap-2">
                {DORM_THEMES.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => onUpdateSanctuary({ ...sanctuary, themeId: th.id })}
                    className={`rounded-xl px-3 py-1.5 font-bold border ${
                      sanctuary.themeId === th.id ? 'border-[#241b16] bg-[#241b16] text-white' : 'border-[#d7c7a9] bg-[#fbf6ec]'
                    }`}
                  >
                    {th.name}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DORM_WEATHERS.map((w) => (
                  <button
                    key={w}
                    onClick={() => onUpdateSanctuary({ ...sanctuary, weatherId: w })}
                    className={`rounded-lg px-2.5 py-1 capitalize border ${
                      sanctuary.weatherId === w ? 'border-[#38a3a5] bg-[#38a3a5] text-white' : 'border-[#d7c7a9]'
                    }`}
                  >
                    {w.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="font-bold text-sm pt-2">Dorm Carpenter Catalog</div>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {DORM_CATALOG.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-[#fbf6ec] border border-[#d7c7a9] px-3 py-2">
                    <span className="font-semibold">{item.name}</span>
                    <button
                      onClick={() => placeItem(item.id)}
                      className="rounded-lg bg-[#241b16] px-2.5 py-1 font-bold text-[#f4c98b]"
                    >
                      Place ({item.priceFlorins}F)
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-[#d7c7a9] bg-white/80 p-4">
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <Move className="h-4 w-4" /> Advanced Move &amp; Scale ({sanctuary.items.length} placed)
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {sanctuary.items.map((it) => (
                  <div key={it.uid} className="rounded-xl border border-[#d7c7a9] bg-[#fbf6ec] p-2.5 space-y-1.5">
                    <div className="font-bold">{it.name}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label>X <input type="number" step={0.5} value={it.x} onChange={(e) => adjustPlaced(it.uid, { x: Number(e.target.value) })} className="w-14 rounded border px-1" /></label>
                      <label>Y <input type="number" step={0.25} min={0} max={4} value={it.y} onChange={(e) => adjustPlaced(it.uid, { y: Number(e.target.value) })} className="w-14 rounded border px-1" /></label>
                      <label>Z <input type="number" step={0.5} value={it.z} onChange={(e) => adjustPlaced(it.uid, { z: Number(e.target.value) })} className="w-14 rounded border px-1" /></label>
                      <label>Scale ({it.scale.toFixed(1)}×)
                        <input type="range" min={0.5} max={2.0} step={0.1} value={it.scale} onChange={(e) => adjustPlaced(it.uid, { scale: Number(e.target.value) })} className="w-20 ml-1" />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'garden' && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
            {[0, 1, 2].map((idx) => {
              const plot = sanctuary.gardens[idx];
              const ready = plot?.seedElement && Date.now() >= plot.readyAt;
              return (
                <div key={idx} className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 space-y-2">
                  <div className="font-display text-base font-bold">Sky-Soil Plot #{idx + 1}</div>
                  {plot?.seedElement ? (
                    <>
                      <div>Growing: <strong className="capitalize">{plot.seedElement}</strong> Bloom</div>
                      <button
                        onClick={() => harvestGarden(idx)}
                        disabled={!ready}
                        className="w-full rounded-xl bg-[#4b8f44] py-2 font-bold text-white disabled:opacity-50"
                      >
                        {ready ? 'Harvest (+45F, +2 Sunleaf)' : 'Growing (20s)…'}
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {STARTER_ELEMENTS.map((el) => (
                        <button
                          key={el.id}
                          onClick={() => plantGarden(idx, el.id)}
                          className="rounded-lg border border-[#d7c7a9] bg-[#fbf6ec] px-2 py-1 font-semibold"
                        >
                          Plant {el.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'skylens' && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <p className="text-[#615346]">Capture live 3D sky-island snapshots directly from the viewport into wall paintings.</p>
              <button onClick={onCaptureSkyLens} className="rounded-xl bg-[#241b16] px-4 py-2 font-bold text-[#f4c98b]">
                Snap 3D Painting Now
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {galleryImages.map((src, i) => (
                <div key={i} className="rounded-2xl border-4 border-[#c89b3c] bg-[#241b16] p-1 shadow-md overflow-hidden">
                  <img src={src} alt={`Sky-Lens Painting ${i + 1}`} className="h-36 w-full object-cover rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'tours' && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span>Showcase your Dorm publicly inside the {wizard.realmId.toUpperCase()} Realm.</span>
              <button onClick={publishDormTour} className="rounded-xl bg-[#38a3a5] px-4 py-2 font-bold text-white">
                {sanctuary.isPublic ? 'Published to Tours' : 'Publish My Dorm'}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {tours.map((t) => (
                <div key={t.wizardId} className="rounded-xl border border-[#d7c7a9] bg-white/85 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm">{t.wizardName}</div>
                    <div className="text-[#615346]">Theme: {t.themeId.replace('_', ' ')}</div>
                  </div>
                  <span className="font-mono-num font-bold text-amber-700">★ {t.ratingAvg} ({t.ratingCount})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
