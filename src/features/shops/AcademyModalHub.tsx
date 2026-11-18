import type { RunGameplayAction } from '../../../shared/gameplayActions.ts';
import type { PlayerSettings } from '../../../shared/settings.ts';
import React, { useEffect, useState } from 'react';
import { ShoppingBag, ScrollText, Shield, Sliders, Map, Store, Sparkles } from 'lucide-react';
import { MODULAR_GEAR, RACES } from '../../../shared/wardrobe.ts';
import { SPELLS, getSpellShopLockReason } from '../../../shared/spells.ts';
import { MOUNTS, CAMPUS_QUESTS, ZONES, type ZoneId } from '../../../shared/world.ts';
import { CRAFT_XP_PER_TRANSMUTE, RESOURCES, TERM_REWARD_TRACK, craftProgressionAfterGain, type ResourceId, type WizardDocument } from '../../../shared/economy.ts';
import { CREATURE_SPECIES } from '../../../shared/creatures.ts';
import type { RealmAccountState } from '../../lib/storage.ts';
import { ElementCrest } from '../../lib/elementIcons.tsx';
import type { AcademyHouse } from '../../../shared/houses.ts';
import { isBazaarPrice, type BazaarListing, type MarketAccount } from '../../../shared/market.ts';
import { auth } from '../../lib/firebase.ts';

export type HubModalTab = 'shops' | 'bazaar' | 'quests' | 'social' | 'map' | 'settings';

interface AcademyModalHubProps {
  initialTab: HubModalTab;
  wizard: WizardDocument;
  onCloudAction?: RunGameplayAction;
  realmAccount: RealmAccountState;
  isSignedIn: boolean;
  wallet: MarketAccount | null;
  onWallet: (wallet: MarketAccount) => void;
  settings: PlayerSettings;
  onUpdateSettings: (patch: Partial<PlayerSettings>) => void;
  onUpdateWizard: (next: WizardDocument) => void;
  onClaimTermTier: (tier: number) => Promise<boolean>;
  onTravelZone: (z: ZoneId) => void;
  onSwitchWizardOrRealm: () => void;
  onLinkGoogle: () => void;
  onClose: () => void;
}

export const AcademyModalHub: React.FC<AcademyModalHubProps> = ({
  initialTab,
  wizard,
  onCloudAction,
  realmAccount,
  isSignedIn,
  wallet,
  onWallet,
  settings,
  onUpdateSettings,
  onUpdateWizard,
  onClaimTermTier,
  onTravelZone,
  onSwitchWizardOrRealm,
  onLinkGoogle,
  onClose,
}) => {
  const [tab, setTab] = useState<HubModalTab>(initialTab);
  const [bazaarListings, setBazaarListings] = useState<BazaarListing[]>([]);
  const [houses, setHouses] = useState<AcademyHouse[]>([]);
  const [currentHouseId, setCurrentHouseId] = useState<string | null>(null);
  const [houseName, setHouseName] = useState('');
  const [listItemId, setListItemId] = useState('');
  const [marketBusy, setMarketBusy] = useState(false);
  const [listPrice, setListPrice] = useState(85);
  const [termBusy, setTermBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const dwarfDiscount = RACES[wizard.raceId].passiveBonus.craftDiscountPct ? 0.88 : 1.0;
  const spellUnlockState = {
    rank: wizard.rank,
    unlockedElements: wizard.progression.unlockedElements,
    unlockedFusions: wizard.progression.unlockedFusions,
  };

  useEffect(() => {
    if (tab !== 'bazaar' && tab !== 'social') return;
    const controller = new AbortController();
    const load = async () => {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/${tab === 'bazaar' ? 'bazaar' : 'houses'}/${wizard.realmId}`, {
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Realm service unavailable');
      if (controller.signal.aborted) return;
      if (tab === 'bazaar') {
        setBazaarListings(data.listings ?? []);
        if (data.wallet) onWallet(data.wallet);
      } else {
        setHouses(data.houses ?? []);
        setCurrentHouseId(data.currentHouseId ?? null);
      }
    };
    void load().catch((error) => {
      if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : 'Realm service unavailable');
    });
    return () => controller.abort();
  }, [tab, wizard.realmId, isSignedIn, onWallet]);

  const buyGear = (gearId: string, price: number) => {
    if (onCloudAction) {
      void onCloudAction({ type: 'buyGear', id: gearId });
      return;
    }
    const finalPrice = Math.round(price * dwarfDiscount);
    if (wizard.currencies.florins < finalPrice || wizard.wardrobe.ownedGearIds.includes(gearId)) return;
    onUpdateWizard({
      ...wizard,
      currencies: { ...wizard.currencies, florins: wizard.currencies.florins - finalPrice },
      wardrobe: { ...wizard.wardrobe, ownedGearIds: [...wizard.wardrobe.ownedGearIds, gearId] },
    });
    setNotice('Purchased and added to your Velvet Thimble Wardrobe!');
  };

  const buySpell = (spellId: string, price: number) => {
    if (onCloudAction) {
      void onCloudAction({ type: 'buySpell', id: spellId });
      return;
    }
    const spell = SPELLS.find((entry) => entry.id === spellId);
    if (!spell || getSpellShopLockReason(spell, spellUnlockState)) return;
    if (wizard.currencies.florins < price || wizard.progression.ownedSpellIds.includes(spellId)) return;
    onUpdateWizard({
      ...wizard,
      currencies: { ...wizard.currencies, florins: wizard.currencies.florins - price },
      progression: { ...wizard.progression, ownedSpellIds: [...wizard.progression.ownedSpellIds, spellId] },
    });
    setNotice('Spell inscribed into your Spellbook!');
  };

  const buyMount = (mountId: string, price: number) => {
    if (onCloudAction) {
      void onCloudAction({ type: 'buyMount', id: mountId });
      return;
    }
    if (wizard.currencies.florins < price || wizard.progression.ownedMounts.includes(mountId)) return;
    onUpdateWizard({
      ...wizard,
      currencies: { ...wizard.currencies, florins: wizard.currencies.florins - price },
      progression: {
        ...wizard.progression,
        ownedMounts: [...wizard.progression.ownedMounts, mountId],
        equippedMountId: mountId,
      },
    });
    setNotice('Mount unlocked! Press M anytime in 3D to ride.');
  };

  const transmuteStarstone = () => {
    if (onCloudAction) {
      void onCloudAction({ type: 'transmute' });
      return;
    }
    if (wizard.resources.sunleaf < 2 || wizard.resources.ember_ash < 2) return;
    onUpdateWizard({
      ...wizard,
      resources: {
        ...wizard.resources,
        sunleaf: wizard.resources.sunleaf - 2,
        ember_ash: wizard.resources.ember_ash - 2,
        starstone: wizard.resources.starstone + 1,
      },
      progression: {
        ...wizard.progression,
        ...craftProgressionAfterGain(wizard.progression.craftXp, CRAFT_XP_PER_TRANSMUTE),
      },
    });
    setNotice('Transmuted 2 Sunleaf + 2 Ember-Ash -> 1 Starstone Shard (+25 Craft XP)!');
  };

  const claimAlmanac = () => {
    if (onCloudAction) {
      void onCloudAction({ type: 'almanac' });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (wizard.progression.lastAlmanacClaim === today) return;
    const nextDay = (wizard.progression.almanacDay % 7) + 1;
    onUpdateWizard({
      ...wizard,
      currencies: {
        ...wizard.currencies,
        florins: wizard.currencies.florins + 40 + wizard.progression.almanacDay * 15,
        spellShards: wizard.currencies.spellShards + 2,
      },
      progression: {
        ...wizard.progression,
        almanacDay: nextDay,
        lastAlmanacClaim: today,
      },
    });
    setNotice('Daily Almanac stamped! +Florins & +2 Spell Shards.');
  };

  const claimTermTier = async (tier: number) => {
    const reward = TERM_REWARD_TRACK.find((entry) => entry.tier === tier);
    if (termBusy || !reward) return;
    setTermBusy(true);
    try {
      const claimed = await onClaimTermTier(tier);
      setNotice(claimed ? `Claimed Free Term Tier ${tier}: ${reward.label}!` : 'This Term reward has already been claimed.');
    } catch {
      setNotice('The Term reward could not be saved. Please try again.');
    } finally {
      setTermBusy(false);
    }
  };

  async function marketRequest(path: string, body: Record<string, unknown>) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sign in with Google to use the shared Bazaar and Academy Houses.');
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'The realm service is unavailable.');
    return data;
  }

  const postBazaarListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (marketBusy) return;
    if (Object.values(wizard.wardrobe.equipped).includes(listItemId)) {
      setNotice('Unequip that gear before listing it.');
      return;
    }
    if (!isBazaarPrice(listPrice)) {
      setNotice('Enter a whole-number price between 1 and 1,000,000 Florins.');
      return;
    }
    setMarketBusy(true);
    try {
      const data = await marketRequest(`/api/bazaar/${wizard.realmId}/list`, {
        wizardId: wizard.id, itemId: listItemId, priceFlorins: listPrice,
      });
      onWallet(data.wallet);
      setListItemId('');
      setBazaarListings((prev) => [data.listing, ...prev]);
      setNotice('Gear placed in escrow and listed in the Bazaar.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not post the listing.');
    } finally {
      setMarketBusy(false);
    }
  };

  const settleBazaarListing = async (listingId: string, action: 'buy' | 'cancel') => {
    if (marketBusy) return;
    setMarketBusy(true);
    try {
      const data = await marketRequest(`/api/bazaar/${wizard.realmId}/${action}/${listingId}`, { wizardId: wizard.id });
      onWallet(data.wallet);
      setBazaarListings((prev) => prev.filter((listing) => listing.id !== listingId));
      setNotice(action === 'buy' ? 'Purchase completed. Your gear is available in Tailor.' : 'Listing cancelled. Your gear is back in Tailor.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update the listing.');
    } finally {
      setMarketBusy(false);
    }
  };

  const createHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (marketBusy) return;
    setMarketBusy(true);
    try {
      const data = await marketRequest(`/api/houses/${wizard.realmId}`, { name: houseName, crestElement: wizard.elementId });
      setHouses((prev) => [data.house, ...prev]);
      setCurrentHouseId(data.house.id);
      setHouseName('');
      setNotice('Academy House founded!');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not found the House.');
    } finally {
      setMarketBusy(false);
    }
  };

  const updateHouseMembership = async (house: AcademyHouse, action: 'join' | 'leave') => {
    if (marketBusy) return;
    setMarketBusy(true);
    try {
      const data = await marketRequest(`/api/houses/${wizard.realmId}/${house.id}/${action}`, {});
      setHouses(data.houses);
      setCurrentHouseId(data.currentHouseId);
      setNotice(action === 'join' ? `Joined ${house.name}.` : `Left ${house.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not change House membership.');
    } finally {
      setMarketBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#101522]/85 p-4">
      <div className="storybook-panel w-full max-w-5xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7c7a9] pb-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'shops', label: 'Shops & Craft', icon: ShoppingBag },
              { id: 'bazaar', label: 'Courtyard Bazaar', icon: Store },
              { id: 'quests', label: 'Quests, Term & Codex', icon: ScrollText },
              { id: 'social', label: 'Academy Houses', icon: Shield },
              { id: 'map', label: 'Waystone Map', icon: Map },
              { id: 'settings', label: 'Settings', icon: Sliders },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as HubModalTab)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold border ${
                  tab === t.id ? 'border-[#241b16] bg-[#241b16] text-[#f4c98b]' : 'border-[#d7c7a9] bg-white/80'
                }`}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="rounded-xl border border-[#c9b796] px-3 py-1.5 font-bold hover:bg-[#efe4ce]">
            Close
          </button>
        </div>

        {notice && (
          <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-100 px-3 py-2 font-semibold text-emerald-900">
            {notice}
          </div>
        )}

        {tab === 'shops' && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 space-y-2">
              <div className="font-display text-base font-bold">Velvet Thimble &amp; Quartermaster Gear</div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {MODULAR_GEAR.filter((g) => g.priceFlorins > 0).map((g) => {
                  const owned = wizard.wardrobe.ownedGearIds.includes(g.id);
                  const cost = Math.round(g.priceFlorins * dwarfDiscount);
                  return (
                    <div key={g.id} className="flex items-center justify-between rounded-xl bg-[#fbf6ec] border border-[#d7c7a9] p-2">
                      <div>
                        <div className="font-bold">{g.name}</div>
                        <div className="text-[#615346]">+{g.stats.hp} HP · +{g.stats.powerPct}% Power</div>
                      </div>
                      <button
                        disabled={owned || wizard.currencies.florins < cost}
                        onClick={() => buyGear(g.id, g.priceFlorins)}
                        className="rounded-lg bg-[#241b16] px-3 py-1 font-bold text-[#f4c98b] disabled:opacity-45"
                      >
                        {owned ? 'Owned' : `${cost}F`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 space-y-2">
              <div className="font-display text-base font-bold">Spire Scriptorium Spells &amp; Mounts</div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {SPELLS.filter((s) => s.priceFlorins).map((s) => {
                  const owned = wizard.progression.ownedSpellIds.includes(s.id);
                  const lockReason = getSpellShopLockReason(s, spellUnlockState);
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-xl bg-[#fbf6ec] border border-[#d7c7a9] p-2">
                      <span className="inline-flex items-center gap-1.5 font-bold">
                        <ElementCrest elementId={s.element} size={13} /> {s.name}
                      </span>
                      <button
                        disabled={owned || Boolean(lockReason) || wizard.currencies.florins < (s.priceFlorins ?? 0)}
                        onClick={() => buySpell(s.id, s.priceFlorins ?? 100)}
                        className="rounded-lg bg-[#38a3a5] px-2.5 py-1 font-bold text-white disabled:opacity-45"
                      >
                        {owned ? 'Learned' : lockReason ?? `${s.priceFlorins}F`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="font-display text-sm font-bold pt-2">3D Mounts (Press M)</div>
              <div className="space-y-1">
                {MOUNTS.filter((m) => m.priceFlorins > 0).map((m) => {
                  const owned = wizard.progression.ownedMounts.includes(m.id);
                  return (
                    <div key={m.id} className="flex items-center justify-between rounded-xl bg-[#fbf6ec] border border-[#d7c7a9] p-2">
                      <span className="font-bold">{m.name}</span>
                      <button
                        disabled={owned || wizard.currencies.florins < m.priceFlorins}
                        onClick={() => buyMount(m.id, m.priceFlorins)}
                        className="rounded-lg bg-[#241b16] px-2.5 py-1 font-bold text-[#f4c98b] disabled:opacity-45"
                      >
                        {owned ? 'Owned' : `${m.priceFlorins}F`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display text-base font-bold">Crafting Rank {wizard.progression.craftRank} · Resource Pouch</div>
                <div className="text-[#615346]">
                  {(Object.keys(RESOURCES) as ResourceId[]).map((rk) => `${RESOURCES[rk].name}: ${wizard.resources[rk]}`).join(' · ')}
                </div>
              </div>
              <button
                onClick={transmuteStarstone}
                disabled={wizard.resources.sunleaf < 2 || wizard.resources.ember_ash < 2}
                className="rounded-xl bg-[#2f8a73] px-4 py-2 font-bold text-white disabled:opacity-45"
              >
                Transmute 2 Sunleaf + 2 Ember-Ash → Starstone
              </button>
            </div>
          </div>
        )}

        {tab === 'bazaar' && (
          <div className="mt-4 space-y-4">
            <p className="rounded-xl bg-[#efe4ce] p-3">
              Bazaar wallet: {wallet?.florins ?? '—'} Florins · {wallet?.honorMarks ?? 0} Honor Marks · {wallet?.bondingSeals ?? 0} Bonding Seals.
              Bazaar transactions and live duel rewards use this realm wallet. Academy shops use wizard Florins.
            </p>
            <form onSubmit={postBazaarListing} className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#d7c7a9] bg-white/85 p-3">
              <span className="font-bold">Post Listing ({wizard.realmId.toUpperCase()} Realm):</span>
              <select aria-label="Bazaar gear to list" value={listItemId} onChange={(e) => setListItemId(e.target.value)} className="rounded-lg border px-2.5 py-1">
                <option value="">Select Bazaar gear</option>
                {MODULAR_GEAR.filter((gear) => (wallet?.gear[gear.id] ?? 0) > 0 && wizard.wardrobe.equipped[gear.slot] !== gear.id).map((gear) => (
                  <option key={gear.id} value={gear.id}>{gear.name}</option>
                ))}
              </select>
              <input aria-label="Listing price in Bazaar Florins" type="number" min={1} max={1000000} value={listPrice} onChange={(e) => setListPrice(Number(e.target.value))} className="w-24 rounded-lg border px-2 py-1" />
              <button type="submit" disabled={!isSignedIn || marketBusy || !listItemId} className="rounded-xl bg-[#241b16] px-4 py-1.5 font-bold text-[#f4c98b] disabled:opacity-50">List for Florins</button>
            </form>

            <div className="grid gap-2 sm:grid-cols-2">
              {bazaarListings.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl border border-[#d7c7a9] bg-white/85 p-3">
                  <div>
                    <div className="font-bold text-sm">{l.itemName}</div>
                    <div className="text-[#615346]">Seller: {l.sellerName}</div>
                  </div>
                  {l.canCancel ? (
                    <button onClick={() => void settleBazaarListing(l.id, 'cancel')} disabled={marketBusy}
                      className="rounded-xl border border-[#d7c7a9] px-3 py-1.5 font-bold">
                      Cancel listing
                    </button>
                  ) : (
                    <button onClick={() => void settleBazaarListing(l.id, 'buy')}
                      disabled={!isSignedIn || marketBusy || (wallet?.florins ?? 0) < l.priceFlorins}
                      className="rounded-xl bg-[#38a3a5] px-3 py-1.5 font-bold text-white disabled:opacity-50">
                      Buy {l.priceFlorins}F
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'quests' && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d7c7a9] bg-white/85 p-4">
              <div>
                <div className="font-display text-base font-bold">7-Day Sky-Almanac (Day {wizard.progression.almanacDay}/7)</div>
                <div className="text-[#615346]">Free daily Florins &amp; Spell Shards on check-in.</div>
              </div>
              <button onClick={claimAlmanac} className="rounded-xl bg-[#d97706] px-4 py-2 font-bold text-white">
                Stamp Almanac Today
              </button>
            </div>

            <div className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold">100% Free Term Reward Track</span>
                <span className="font-mono-num font-bold text-[#2f8a73]">{realmAccount.termXp} Term XP</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                {TERM_REWARD_TRACK.map((t) => {
                  const claimed = realmAccount.claimedTermTiers.includes(t.tier);
                  const ready = realmAccount.termXp >= t.xpRequired && !claimed;
                  return (
                    <div key={t.tier} className="rounded-xl border border-[#d7c7a9] bg-[#fbf6ec] p-2.5 flex flex-col justify-between">
                      <div>
                        <div className="font-bold">Tier {t.tier}: {t.label}</div>
                        <div className="text-[#615346] font-mono-num">{t.xpRequired} XP</div>
                      </div>
                      <button
                        disabled={!ready || termBusy}
                        onClick={() => void claimTermTier(t.tier)}
                        className="mt-2 rounded-lg bg-[#241b16] py-1 font-bold text-[#f4c98b] disabled:opacity-40"
                      >
                        {claimed ? 'Claimed' : ready ? 'Claim Free' : 'Locked'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {CAMPUS_QUESTS.map((q) => {
                const done = wizard.progression.completedQuests.includes(q.id);
                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-3 ${
                      done ? 'border-emerald-500/60 bg-emerald-50/90' : 'border-[#d7c7a9] bg-white/85'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{q.title}</span>
                      {done && (
                        <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          Completed
                        </span>
                      )}
                    </div>
                    <div className="text-[#615346] mt-1">{q.description}</div>
                    <div className="mt-2 font-mono-num text-[11px] font-bold text-[#2f8a73]">
                      Reward: {q.rewardFlorins}F · {q.rewardXp} XP · {q.rewardShards} Shards
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-3">
              <div className="font-bold mb-1">Bestiary Codex ({wizard.progression.bestiarySeen.length}/{CREATURE_SPECIES.length} Discovered)</div>
              <div className="flex flex-wrap gap-1.5">
                {CREATURE_SPECIES.map((s) => (
                  <span
                    key={s.id}
                    className={`rounded-lg px-2 py-0.5 border ${
                      wizard.progression.bestiarySeen.includes(s.id) ? 'border-[#2f8a73] bg-emerald-50 font-bold' : 'border-black/10 opacity-45'
                    }`}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'social' && (
          <div className="mt-4 space-y-4">
            {!isSignedIn && <p>Sign in with Google to found or join an Academy House.</p>}
            <form onSubmit={createHouse} className="flex flex-wrap gap-2 rounded-2xl border border-[#d7c7a9] bg-white/85 p-3">
              <input
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                placeholder="New Academy House Name..."
                disabled={!isSignedIn || Boolean(currentHouseId) || marketBusy}
                required minLength={2} maxLength={32}
                className="flex-1 rounded-lg border px-3 py-1.5"
              />
              <button type="submit" disabled={!isSignedIn || Boolean(currentHouseId) || marketBusy} className="rounded-xl bg-[#241b16] px-4 py-1.5 font-bold text-[#f4c98b] disabled:opacity-50">
                Found House
              </button>
            </form>
            <div className="grid gap-3 sm:grid-cols-2">
              {houses.map((h) => (
                <div key={h.id} className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-bold">{h.name}</span>
                    <ElementCrest elementId={h.crestElement} showLabel />
                  </div>
                  <p className="mt-1 text-[#615346]">{h.motto}</p>
                  {!h.academy && (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span>{h.memberCount} {h.memberCount === 1 ? 'member' : 'members'}</span>
                      {isSignedIn && (!currentHouseId || currentHouseId === h.id) && (
                        <button
                          disabled={marketBusy}
                          onClick={() => void updateHouseMembership(h, currentHouseId === h.id ? 'leave' : 'join')}
                          className="rounded-lg border border-[#d7c7a9] px-3 py-1.5 font-bold disabled:opacity-50"
                        >
                          {currentHouseId === h.id ? 'Leave House' : 'Join House'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'map' && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(Object.keys(ZONES) as ZoneId[]).map((zid) => {
              const z = ZONES[zid];
              return (
                <button
                  key={zid}
                  onClick={() => {
                    onTravelZone(zid);
                    onClose();
                  }}
                  className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 text-left hover:border-[#241b16]"
                >
                  <div className="font-display text-lg font-bold">{z.name}</div>
                  <div className="text-[#615346] mt-1">{z.subtitle}</div>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'settings' && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 space-y-3">
              <div className="font-display text-base font-bold">Audio, Camera &amp; Combat Preferences</div>
              <label className="flex items-center justify-between">
                <span>Acoustic Harp Ambience ({Math.round(settings.harpVolume * 100)}%)</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.harpVolume}
                  onChange={(e) => onUpdateSettings({ harpVolume: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center justify-between">
                <span>Spell &amp; UI Chimes ({Math.round(settings.sfxVolume * 100)}%)</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.sfxVolume}
                  onChange={(e) => onUpdateSettings({ sfxVolume: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center justify-between">
                <span>Camera Orbit Sensitivity ({settings.cameraSensitivity.toFixed(1)}×)</span>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={settings.cameraSensitivity}
                  onChange={(e) => onUpdateSettings({ cameraSensitivity: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center justify-between">
                <span>Default 2× Speed in Solo Duels</span>
                <input
                  type="checkbox"
                  checked={settings.solo2xDefault}
                  onChange={(e) => onUpdateSettings({ solo2xDefault: e.target.checked })}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-[#d7c7a9] bg-white/85 p-4 space-y-3">
              <div className="font-display text-base font-bold">Account, Keybinds &amp; Realm Switcher</div>
              <div className="text-[#615346] space-y-1">
                <div><strong>Move:</strong> WASD / Arrows · <strong>Orbit:</strong> Drag · <strong>Zoom:</strong> Scroll</div>
                <div><strong>Interact:</strong> E or Click · <strong>Mount:</strong> M · <strong>Emotes:</strong> 1–4</div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {!isSignedIn && (
                  <button onClick={onLinkGoogle} className="rounded-xl bg-[#f4c98b] px-4 py-2 font-bold text-[#241b16]">
                    Link Google Account (Save Cloud)
                  </button>
                )}
                <button
                  onClick={() => {
                    onSwitchWizardOrRealm();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#241b16] px-4 py-2 font-bold text-[#f4c98b]"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Switch Wizard or Realm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
