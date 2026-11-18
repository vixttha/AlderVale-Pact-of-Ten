import { SPECIES_BY_ID } from './creatures.ts';
import type { ElementId } from './elements.ts';
import { grantFusionSpells, type WizardDocument } from './economy.ts';
import { applySagaEvent, applyWizardXp } from './quests.ts';
import { REALMS } from './realms.ts';
import { CAMPUS_QUESTS } from './world.ts';
import type { SoloDuelMode } from './soloDuel.ts';
import type { OwnedCreature, RealmAccountState } from '../src/lib/storage.ts';

export function soloVictoryRewards(
  activeWizard: WizardDocument,
  creatures: OwnedCreature[],
  realmAccount: RealmAccountState,
  res: { mode: SoloDuelMode; trialElement?: ElementId; spireFloor?: number; leadCreatureWinEligible: boolean },
  hatchId: (eggId: string) => string,
  random = Math.random,
) {
  const rCfg = REALMS[activeWizard.realmId];
  const gainedXp = Math.round((res.mode === 'trial' ? 180 : 85) * rCfg.xpMultiplier);
  const nextStats = applyWizardXp(activeWizard, gainedXp);
  const lead = creatures.find((pet) => pet.id === activeWizard.activeCreatureId) ?? creatures[0];

  // Charge 2-win Hybrid Eggs
  const hatchedPets: OwnedCreature[] = [];
  const nextEggs: typeof activeWizard.progression.eggs = [];
  for (const egg of activeWizard.progression.eggs) {
    const done = egg.winsDone + 1;
    if (done >= egg.winsNeeded) {
      const sp = SPECIES_BY_ID[egg.resultSpeciesId];
      if (sp) {
        hatchedPets.push({
          id: hatchId(egg.id),
          ownerId: activeWizard.ownerId,
          wizardId: activeWizard.id,
          realmId: activeWizard.realmId,
          speciesId: sp.id,
          nickname: sp.stageNames[0],
          elementId: sp.element,
          stage: 1,
          chromatic: random() < 0.25 ? 'dawn' : 'none',
          branchChoice: 'A',
          bondXp: 25,
          wins: 0,
          talents: ['tal_spellproof', 'tal_may_blade'],
        });
      }
    } else {
      nextEggs.push({ ...egg, winsDone: done });
    }
  }

  const nextUnlockedElements = [...activeWizard.progression.unlockedElements];
  if (res.trialElement && !nextUnlockedElements.includes(res.trialElement)) {
    nextUnlockedElements.push(res.trialElement);
  }

  const florinWin = Math.round(
    (res.mode === 'trial' ? 140 : 65) * rCfg.dropMultiplier,
  );
  let updatedWiz: WizardDocument = {
    ...activeWizard,
    ...nextStats,
    currencies: {
      florins: activeWizard.currencies.florins + florinWin,
      honorMarks: activeWizard.currencies.honorMarks + 4,
      bondingSeals: activeWizard.currencies.bondingSeals + (res.mode === 'trial' ? 1 : 0),
      spellShards: activeWizard.currencies.spellShards + 2,
    },
    progression: {
      ...activeWizard.progression,
      unlockedElements: nextUnlockedElements,
      spireBestFloor: res.spireFloor ? Math.max(activeWizard.progression.spireBestFloor, res.spireFloor) : activeWizard.progression.spireBestFloor,
      eggs: nextEggs,
      bestiarySeen: Array.from(new Set([...activeWizard.progression.bestiarySeen, ...hatchedPets.map((p) => p.speciesId)])),
    },
  };

  updatedWiz = grantFusionSpells(updatedWiz, hatchedPets);
  if (res.mode === 'solo') updatedWiz = applySagaEvent(updatedWiz, 'solo-win');
  if (res.mode === 'trial') updatedWiz = applySagaEvent(updatedWiz, 'rare-trial-win');
  const leadWon = lead && res.leadCreatureWinEligible === true;
  if (leadWon) updatedWiz = applySagaEvent(updatedWiz, 'lead-creature-win');
  const updatedLead = leadWon ? { ...lead, wins: (lead.wins ?? 0) + 1 } : null;

  const nextCreatures = [...creatures.map((pet) => pet.id === updatedLead?.id ? updatedLead : pet), ...hatchedPets];
  const nextUnlockedRaces = new Set(realmAccount.unlockedRaces);
  if (updatedWiz.rank >= 4 && res.mode === 'trial') {
    nextUnlockedRaces.add('cloud_sylph');
    nextUnlockedRaces.add('dwarf');
    nextUnlockedRaces.add('high_elf');
    nextUnlockedRaces.add('dark_elf');
  }
  if (updatedWiz.rank >= 5 && nextCreatures.some((pet) => SPECIES_BY_ID[pet.speciesId]?.isDrake && pet.stage === 3)) {
    nextUnlockedRaces.add('draconic_kin');
  }
  if (updatedWiz.rank >= 7 && nextCreatures.some((pet) => SPECIES_BY_ID[pet.speciesId]?.isFusionOnly)) {
    nextUnlockedRaces.add('astral_kin');
  }
  const nextAccount = {
    ...realmAccount,
    unlockedRaces: [...nextUnlockedRaces],
    termXp: realmAccount.termXp + Math.round(65 * rCfg.xpMultiplier),
  };
  const completed = CAMPUS_QUESTS.filter((quest) =>
    !activeWizard.progression.completedQuests.includes(quest.id) && updatedWiz.progression.completedQuests.includes(quest.id),
  );
  const totalXp = gainedXp + completed.reduce((sum, quest) => sum + quest.rewardXp, 0);
  const totalFlorins = updatedWiz.currencies.florins - activeWizard.currencies.florins;
  const totalShards = updatedWiz.currencies.spellShards - activeWizard.currencies.spellShards;
  const questNotice = completed.length ? ` Quest completed: ${completed.map((quest) => quest.title).join(', ')}.` : '';
  const hatchNotice = hatchedPets.length ? ` Hatched ${hatchedPets.map((pet) => pet.nickname).join(', ')}!` : '';
  const learnedFusionCard = updatedWiz.progression.ownedSpellIds.some((id) =>
    !activeWizard.progression.ownedSpellIds.includes(id),
  );
  const fusionNotice = learnedFusionCard ? ' Fusion spell added to your collection. See Deck & Lectern.' : '';
  const notice = `Victory! +${totalXp} XP, +${totalFlorins} Florins, +${totalShards} Spell Shards!${questNotice}${hatchNotice}${fusionNotice}`;
  return { wizard: updatedWiz, account: nextAccount, creatures: nextCreatures, hatchedPets, updatedLead, notice };
}
