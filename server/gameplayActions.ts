import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import {
  craftProgressionAfterGain, CRAFT_XP_PER_TRANSMUTE, RESOURCES,
  type ResourceId, type WizardDocument,
} from '../shared/economy.ts';
import { CREATURE_TALENTS, getBondStage, hasStratumHarmony, resolveFusionSpecies, SPECIES_BY_ID } from '../shared/creatures.ts';
import { STARTER_ELEMENTS } from '../shared/elements.ts';
import { gatherNode, runeCursorAt, type GameplayFeedback } from '../shared/gameplayActions.ts';
import { applySagaEvent } from '../shared/quests.ts';
import { REALMS, type RealmId } from '../shared/realms.ts';
import { getSpellShopLockReason, getSpellUseLockReason, SPELL_BY_ID } from '../shared/spells.ts';
import { GEAR_BY_ID, RACES, RUNESTONES, type RaceId } from '../shared/wardrobe.ts';
import { DORM_CATALOG, DORM_THEMES, DORM_WEATHERS, MOUNTS } from '../shared/world.ts';
import type { OwnedCreature, RealmAccountState, SanctuaryState } from '../src/lib/storage.ts';
import { cloudDb } from './cloud.ts';
import { gameplayPresence } from './gameplayPresence.ts';
import { isDocumentId, RequestError } from './market.ts';
import {
  legacyRealmRef, ownedProgressionWizard, PROGRESSION_VERSION, progressionRealm,
  readProgressionCreatures, trustedRealmRef, writeProgressionWizard,
} from './progressionState.ts';
import { readTermView } from './soloProgress.ts';
import { readSculpt } from './wizardEnrollment.ts';

type Payload = Record<string, unknown>;
type Cooldowns = Record<string, number>;
type Room = { startedAt: number; petId: string };
const slots = ['headgear', 'torso', 'back', 'footwear', 'staff'] as const;

function requireChoice(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RequestError(409, message);
}

function byId<T>(catalog: Record<string, T>, id: unknown): T | undefined {
  return typeof id === 'string' && Object.hasOwn(catalog, id) ? catalog[id] : undefined;
}

function numberIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

interface ActionState {
  wizard: WizardDocument;
  creatures: OwnedCreature[];
  account: RealmAccountState;
  dorm: SanctuaryState;
  gear: Record<string, number>;
  cooldowns: Cooldowns;
  rune?: Room;
}

function applyAction(state: ActionState, input: Payload, now: number): GameplayFeedback {
  const { wizard, creatures, account, dorm, gear, cooldowns } = state;
  const { type, id } = input;
  const progress = wizard.progression;
  const { currencies, wardrobe, resources } = wizard;
  const spend = (field: keyof typeof currencies, amount: number) => {
    requireChoice(Number.isInteger(amount) && amount >= 0 && currencies[field] >= amount, 'You do not have enough currency.');
    currencies[field] -= amount;
  };
  const ownsGear = (item: string) => wardrobe.ownedGearIds.includes(item) || (gear[item] ?? 0) > 0;
  const cooldown = (key: string, duration: number) => {
    requireChoice((cooldowns[key] ?? 0) <= now, 'That activity is recovering. Try again shortly.');
    cooldowns[key] = now + duration;
  };
  const pet = (petId: unknown) => {
    const result = creatures.find((entry) => entry.id === petId);
    requireChoice(result, 'Choose a creature from your enrolled roster.');
    return result;
  };
  let notice = '';
  switch (type) {
    case 'buyGear': {
      const item = byId(GEAR_BY_ID, id);
      requireChoice(item && item.priceFlorins > 0 && !wardrobe.ownedGearIds.includes(item.id), 'That gear is unavailable.');
      spend('florins', Math.round(item.priceFlorins * (RACES[wizard.raceId].passiveBonus.craftDiscountPct ? 0.88 : 1)));
      wardrobe.ownedGearIds.push(item.id);
      notice = 'Added to your wardrobe.';
      break;
    }
    case 'buySpell': {
      const spell = byId(SPELL_BY_ID, id);
      requireChoice(spell && spell.priceFlorins && !getSpellShopLockReason(spell, { rank: wizard.rank, unlockedElements: progress.unlockedElements, unlockedFusions: progress.unlockedFusions }) &&
        !progress.ownedSpellIds.includes(spell.id), 'That spell is unavailable.');
      spend('florins', spell.priceFlorins);
      progress.ownedSpellIds.push(spell.id);
      notice = 'Spell inscribed into your Spellbook!';
      break;
    }
    case 'buyMount': {
      const mount = MOUNTS.find((entry) => entry.id === id);
      requireChoice(mount && mount.priceFlorins > 0 && !progress.ownedMounts.includes(mount.id), 'That mount is unavailable.');
      spend('florins', mount.priceFlorins);
      progress.ownedMounts.push(mount.id);
      progress.equippedMountId = mount.id;
      notice = 'Mount unlocked!';
      break;
    }
    case 'mountToggle':
      progress.equippedMountId = progress.equippedMountId ? null : (progress.ownedMounts[0] ?? null);
      break;
    case 'transmute':
      requireChoice(resources.sunleaf >= 2 && resources.ember_ash >= 2, 'You need two Sunleaf and two Ember-Ash.');
      resources.sunleaf -= 2;
      resources.ember_ash -= 2;
      resources.starstone++;
      Object.assign(progress, craftProgressionAfterGain(progress.craftXp, CRAFT_XP_PER_TRANSMUTE));
      notice = 'Transmuted a Starstone Shard and earned 25 Craft XP.';
      break;
    case 'almanac': {
      const day = new Date(now).toISOString().slice(0, 10);
      requireChoice(progress.lastAlmanacClaim !== day, 'You already stamped today’s Almanac.');
      currencies.florins += 40 + progress.almanacDay * 15;
      currencies.spellShards += 2;
      progress.almanacDay = progress.almanacDay % 7 + 1;
      progress.lastAlmanacClaim = day;
      notice = 'Daily Almanac stamped!';
      break;
    }
    case 'deck':
    case 'wright': {
      const spell = byId(SPELL_BY_ID, id);
      const unlock = { rank: wizard.rank, unlockedElements: progress.unlockedElements, unlockedFusions: progress.unlockedFusions };
      requireChoice(spell && progress.ownedSpellIds.includes(spell.id) &&
        (type === 'deck' && input.add === false || !getSpellUseLockReason(spell, unlock)), 'That spell is unavailable.');
      if (type === 'deck') {
        requireChoice(typeof input.add === 'boolean', 'Choose a deck edit.');
        if (input.add) {
          requireChoice(progress.deck.length < 40, 'The deck is full.');
          progress.deck.push(spell.id);
        } else {
          const index = progress.deck.lastIndexOf(spell.id);
          requireChoice(index >= 0 && progress.deck.length > 24, 'Keep at least 24 cards in the deck.');
          progress.deck.splice(index, 1);
        }
      } else {
        const branch = input.branch;
        requireChoice((branch === 'A' && spell.wrightA || branch === 'B' && spell.wrightB) &&
          (branch === 'A' || branch === 'B') && progress.spellwrighting[spell.id] !== branch, 'That branch is unavailable.');
        spend('spellShards', 2);
        if (branch === 'A' || branch === 'B') progress.spellwrighting[spell.id] = branch;
      }
      break;
    }
    case 'equip': {
      const item = byId(GEAR_BY_ID, id);
      requireChoice(item && ownsGear(item.id), 'Choose owned gear.');
      wardrobe.equipped[item.slot] = item.id;
      break;
    }
    case 'stitch': {
      const slot = slots.find((key) => key === input.slot);
      requireChoice(slot, 'Invalid wardrobe slot.');
      if (input.item === null) wizard.stitching[slot] = null;
      else {
        const item = byId(GEAR_BY_ID, input.item);
        requireChoice(item && item.slot === slot && ownsGear(item.id), 'Choose owned gear for this slot.');
        wizard.stitching[slot] = item.id;
      }
      break;
    }
    case 'appearance': {
      requireChoice(input.patch && typeof input.patch === 'object' && !Array.isArray(input.patch), 'Invalid appearance choice.');
      wizard.sculpt = readSculpt({ ...wizard.sculpt, ...(input.patch as object) });
      break;
    }
    case 'socket': {
      const rune = RUNESTONES.find((entry) => entry.id === id);
      requireChoice(rune && wardrobe.socketedRunestones.length < 6, 'That runestone socket is unavailable.');
      spend('florins', rune.priceFlorins);
      wardrobe.socketedRunestones.push(rune.id);
      break;
    }
    case 'rebirth': {
      const race = byId(RACES, input.race);
      requireChoice(race && account.unlockedRaces.includes(race.id) && progress.rebirthSeals > 0, 'That lineage is unavailable.');
      progress.rebirthSeals--;
      wizard.raceId = race.id as RaceId;
      wizard.sculpt.skinHex = race.skinSwatches[0];
      break;
    }
    case 'vaultDeposit': {
      const item = byId(GEAR_BY_ID, id);
      requireChoice(item && wardrobe.ownedGearIds.length > 5 && wardrobe.ownedGearIds.includes(item.id)
        && account.sharedVault.length < 60, 'That item cannot be copied into the vault.');
      account.sharedVault.push(item.id);
      break;
    }
    case 'vaultWithdraw': {
      const index = input.index;
      requireChoice(numberIn(index, 0, account.sharedVault.length - 1) && Number.isInteger(index), 'That vault slot is unavailable.');
      const item = byId(GEAR_BY_ID, account.sharedVault[index]);
      requireChoice(item && item.id === id, 'The vault changed. Select the item again.');
      account.sharedVault.splice(index, 1);
      if (!wardrobe.ownedGearIds.includes(item.id)) wardrobe.ownedGearIds.push(item.id);
      break;
    }
    case 'lead':
      wizard.activeCreatureId = pet(id).id;
      break;
    case 'branch': {
      const branch = input.branch;
      requireChoice(branch === 'A' || branch === 'B', 'Invalid creature branch.');
      pet(id).branchChoice = branch;
      break;
    }
    case 'adopt': {
      const species = byId(SPECIES_BY_ID, id);
      requireChoice(species && !species.isFusionOnly && creatures.length + progress.eggs.length < 100, 'That species cannot be adopted.');
      spend('bondingSeals', species.bondSealCost);
      const roll = Math.random();
      const chromatic = roll < 0.1 ? 'dawn' : roll < 0.2 ? 'dusk' : 'none';
      creatures.push({
        id: randomUUID(), ownerId: wizard.ownerId, wizardId: wizard.id, realmId: wizard.realmId,
        speciesId: species.id, elementId: species.element, stage: 1, chromatic, branchChoice: 'A',
        nickname: chromatic === 'none' ? species.name : (chromatic === 'dawn' ? 'Dawn ' : 'Dusk ') + species.name,
        bondXp: 0, wins: 0, talents: ['tal_sturdy'], serverProgressionVersion: PROGRESSION_VERSION,
      });
      if (!progress.bestiarySeen.includes(species.id)) progress.bestiarySeen.push(species.id);
      notice = 'A new companion joined your roster.';
      break;
    }
    case 'egg': {
      const first = pet(input.first);
      const second = pet(input.second);
      requireChoice(first.id !== second.id && progress.eggs.length < 12 &&
        creatures.length + progress.eggs.length < 100, 'Choose two different creatures and leave room for the egg.');
      spend('florins', 80);
      const species = resolveFusionSpecies(first.elementId, second.elementId);
      progress.eggs.push({
        id: randomUUID(), parentA: first.nickname, parentB: second.nickname,
        resultSpeciesId: species?.id ?? (Math.random() < 0.5 ? first.speciesId : second.speciesId),
        winsDone: 0, winsNeeded: 2,
      });
      notice = 'Your egg is ready to charge in duels.';
      break;
    }
    case 'runeStart': {
      const lead = pet(wizard.activeCreatureId);
      if (!state.rune || state.rune.petId !== lead.id || now - state.rune.startedAt > 15_000) {
        state.rune = { startedAt: now + 400, petId: lead.id };
      }
      return { notice: '', rune: { startedAt: state.rune.startedAt, serverNow: now } };
    }
    case 'runeCatch': {
      const rune = state.rune;
      requireChoice(rune && rune.petId === wizard.activeCreatureId &&
        now >= rune.startedAt && now - rune.startedAt <= 15_000, 'Start a new Rune-Catch attempt.');
      const lead = pet(rune.petId);
      state.rune = undefined;
      const cursor = runeCursorAt(now - rune.startedAt);
      const bullseye = cursor >= 40 && cursor <= 62;
      const amount = Math.round((bullseye ? 45 : 18) *
        (hasStratumHarmony(RACES[wizard.raceId].stratum, lead.speciesId) ? 1.05 : 1));
      lead.bondXp += amount;
      lead.stage = getBondStage(lead.bondXp);
      if (bullseye && lead.talents.length < 3) {
        const talent = CREATURE_TALENTS.find((entry) => !lead.talents.includes(entry.id));
        if (talent) lead.talents.push(talent.id);
      }
      Object.assign(wizard, applySagaEvent(wizard, 'rune-catch'));
      notice = `${bullseye ? 'Bullseye!' : 'Good effort!'} +${amount} Bond XP. Stage ${lead.stage}.`;
      break;
    }
    case 'world': {
      const presence = gameplayPresence(wizard.ownerId, wizard.id, wizard.realmId);
      const node = presence && typeof id === 'string' && gatherNode(id, presence.zone, Object.keys(RESOURCES) as ResourceId[]);
      requireChoice(presence && node && Math.hypot(presence.x - node.x, presence.z - node.z) <= 12, 'Move closer to that activity.');
      if (node.kind === 'fountain' || node.kind === 'wisp') {
        cooldown('restore', 500);
        progress.mana = node.kind === 'fountain' ? progress.maxMana : Math.min(progress.maxMana, progress.mana + 30);
        if (node.kind === 'fountain') progress.flasks = progress.maxFlasks;
        notice = 'Mana restored.';
      } else if (node.kind === 'resource' && node.resource) {
        cooldown('gather', 2000);
        const amount = REALMS[wizard.realmId].dropMultiplier >= 2 ? 2 : 1;
        resources[node.resource] += amount;
        notice = `Harvested +${amount} ${RESOURCES[node.resource].name}!`;
      } else {
        cooldown('fish', 3500);
        const roll = Math.random();
        const amount = roll > 0.75 ? 48 : 22;
        currencies.florins += amount;
        if (roll > 0.8) progress.fishingRank++;
        notice = `Caught a ${roll > 0.75 ? 'Golden Cloud-Koi' : 'Silver Sky-Minnow'}! +${amount} Florins.`;
      }
      break;
    }
    case 'dormBuy': {
      const item = DORM_CATALOG.find((entry) => entry.id === id);
      requireChoice(item && dorm.items.length < 120, 'That furniture is unavailable.');
      spend('florins', item.priceFlorins);
      const angle = dorm.items.length * 0.9;
      dorm.items.push({
        uid: randomUUID(), catalogId: item.id, name: item.name, x: Number((Math.cos(angle) * 4.5).toFixed(1)),
        y: 0, z: Number((Math.sin(angle) * 4.5).toFixed(1)), rotY: 0, scale: 1, colorHex: item.colorHex,
        ...(item.triggerKind ? { triggerKind: item.triggerKind } : {}),
      });
      break;
    }
    case 'dormTheme': {
      const theme = DORM_THEMES.find((entry) => entry.id === id);
      requireChoice(theme, 'Invalid Dorm theme.');
      dorm.themeId = theme.id;
      break;
    }
    case 'dormWeather': {
      const weather = DORM_WEATHERS.find((entry) => entry === id);
      requireChoice(weather, 'Invalid Dorm weather.');
      dorm.weatherId = weather;
      break;
    }
    case 'dormMove': {
      const item = dorm.items.find((entry) => entry.uid === id);
      const patch = input.patch;
      requireChoice(item && patch && typeof patch === 'object' && !Array.isArray(patch), 'Choose a Dorm item.');
      for (const [key, value] of Object.entries(patch as Payload)) {
        if (key === 'x' || key === 'z' || key === 'rotY') {
          requireChoice(numberIn(value, -30, 30), 'Invalid furniture position.');
          item[key] = value;
        } else if (key === 'y') {
          requireChoice(numberIn(value, 0, 4), 'Invalid furniture height.');
          item[key] = value;
        } else if (key === 'scale') {
          requireChoice(numberIn(value, 0.5, 2), 'Invalid furniture scale.');
          item[key] = value;
        } else throw new RequestError(400, 'Invalid Dorm edit.');
      }
      break;
    }
    case 'gardenPlant':
    case 'gardenHarvest': {
      const index = input.index;
      requireChoice(numberIn(index, 0, 2) && Number.isInteger(index), 'Invalid garden plot.');
      while (dorm.gardens.length <= index) {
        dorm.gardens.push({ plotId: `plot_${dorm.gardens.length}`, seedElement: null, plantedAt: 0, readyAt: 0 });
      }
      const plot = dorm.gardens[index];
      if (type === 'gardenPlant') {
        const element = STARTER_ELEMENTS.find((entry) => entry.id === input.element);
        requireChoice(element && !plot.seedElement, 'Choose an empty plot and an available seed.');
        Object.assign(plot, { seedElement: element.id, plantedAt: now, readyAt: now + 20_000 });
      } else {
        requireChoice(plot.seedElement && plot.readyAt <= now, 'This crop is not ready.');
        Object.assign(plot, { seedElement: null, plantedAt: 0, readyAt: 0 });
        currencies.florins += 45;
        resources.sunleaf += 2;
        notice = 'Garden harvest collected.';
      }
      break;
    }
    default:
      throw new RequestError(400, 'Unknown gameplay action.');
  }
  return { notice };
}

export async function applyGameplayAction(uid: string, realm: RealmId, body: Payload) {
  const { wizardId, actionId, action } = body;
  if (!isDocumentId(wizardId) || typeof actionId !== 'string' || !/^[a-f\d-]{36}$/.test(actionId)
      || !action || typeof action !== 'object' || Array.isArray(action)) {
    throw new RequestError(400, 'Invalid gameplay action.');
  }
  const realmRef = trustedRealmRef(uid, realm);
  const ref = cloudDb.collection('wizards').doc(wizardId);
  const controls = progressionRealm(realm).collection('gameplayControls').doc(wizardId);
  const receipt = controls.collection('actions').doc(actionId);
  const dormRef = ref.collection('sanctuary').doc('layout');
  const termRef = progressionRealm(realm).collection('termProgress').doc(uid);
  const now = Date.now();
  return cloudDb.runTransaction(async (tx) => {
    const [wizard, accountSnap, dormSnap, wallet, controlSnap, prior, term, legacy] = await Promise.all([
      ownedProgressionWizard(uid, wizardId, realm, tx), tx.get(realmRef), tx.get(dormRef),
      tx.get(progressionRealm(realm).collection('wallets').doc(uid)), tx.get(controls), tx.get(receipt),
      tx.get(termRef), tx.get(legacyRealmRef(uid, realm)),
    ]);
    const account = accountSnap.data() as RealmAccountState | undefined;
    const dorm = dormSnap.data() as SanctuaryState | undefined;
    if (!account?.wizardIds.includes(wizardId) || !dorm || dorm.ownerId !== uid) {
      throw new RequestError(409, 'Reopen this realm and try again.');
    }
    const creatures = await readProgressionCreatures(tx, wizard);
    const previousPets = new Map(creatures.map((pet) => [pet.id, JSON.stringify(pet)]));
    const result = (feedback: GameplayFeedback) => ({
      wizard, creatures, sanctuary: dorm, feedback, account: { ...account, ...readTermView(term.data(), legacy.get('claimedTermTiers')) },
    });
    if (prior.exists) return result(prior.get('feedback') as GameplayFeedback);

    const state: ActionState = {
      wizard, creatures, account, dorm, gear: wallet.get('gear') ?? {},
      cooldowns: controlSnap.get('cooldowns') ?? {}, rune: controlSnap.get('rune') ?? undefined,
    };
    const beforeWizard = JSON.stringify(wizard);
    const beforeAccount = JSON.stringify(account);
    const beforeDorm = JSON.stringify(dorm);
    const feedback = applyAction(state, action as Payload, now);
    if (beforeWizard !== JSON.stringify(wizard)) writeProgressionWizard(tx, wizard);
    if (beforeAccount !== JSON.stringify(account)) tx.update(realmRef, { sharedVault: account.sharedVault });
    if (beforeDorm !== JSON.stringify(dorm)) {
      const { themeId, weatherId, items, gardens } = dorm;
      tx.update(dormRef, { themeId, weatherId, items, gardens, updatedAt: FieldValue.serverTimestamp() });
    }
    for (const { id, ...pet } of creatures) {
      if (previousPets.get(id) === JSON.stringify({ ...pet, id })) continue;
      const petRef = ref.collection('creatures').doc(id);
      const stamp = FieldValue.serverTimestamp();
      if (!previousPets.has(id)) tx.create(petRef, { ...pet, createdAt: stamp, updatedAt: stamp });
      else tx.update(petRef, { branchChoice: pet.branchChoice, bondXp: pet.bondXp, stage: pet.stage, talents: pet.talents, updatedAt: stamp });
    }
    tx.set(controls, { cooldowns: state.cooldowns, rune: state.rune ?? null });
    tx.create(receipt, { feedback, createdAt: FieldValue.serverTimestamp() });
    return result(feedback);
  });
}
