import { test, expect } from '@playwright/test';

const saveKey = 'aldervale_guest_breeze_v1';
const wizardName = 'Campus Quest Rowan';
const arborId = 'q_bond_arbor';
const trialId = 'q_rare_trial';

async function readQuestProgress(page) {
  return page.evaluate(({ saveKey, wizardName }) => {
    const save = JSON.parse(localStorage.getItem(saveKey) ?? 'null');
    const wizard = save?.wizards.find((entry) => entry.name === wizardName);
    if (!wizard) return null;
    return {
      completed: wizard.progression.completedQuests,
      xp: wizard.xp,
      florins: wizard.currencies.florins,
      shards: wizard.currencies.spellShards,
    };
  }, { saveKey, wizardName });
}

async function catchRune(page) {
  await page.getByRole('button', { name: 'Creatures', exact: true }).click();
  await page.getByRole('button', { name: 'Rune-Catch Training', exact: true }).click();
  const button = page.getByRole('button', { name: 'Catch Rune Now!', exact: true });
  await expect(button).toBeVisible();
  // Click when the rendered cursor reaches the bullseye. A catch can qualify
  // under either proposed eligibility rule, so the test needn't rely on a miss.
  await button.evaluate((control) => new Promise((resolve, reject) => {
    const cursor = control.parentElement.querySelector('div[style*="left"]');
    if (!cursor) {
      reject(new Error('Rune-Catch cursor is missing'));
      return;
    }
    const observer = new MutationObserver(catchAtBullseye);
    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error('Rune-Catch cursor never reached the target'));
    }, 10_000);

    function catchAtBullseye() {
      const position = Number.parseFloat(cursor.style.left);
      if (position < 40 || position > 62) return;
      observer.disconnect();
      clearTimeout(timeout);
      control.click();
      resolve();
    }

    observer.observe(cursor, { attributes: true, attributeFilter: ['style'] });
    catchAtBullseye();
  }));
  await expect(page.getByText(/^Bullseye!/)).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
}

async function winRareTrial(page) {
  await page.getByRole('button', { name: 'Duel', exact: true }).click();
  await page.evaluate(() => { Math.random = () => 0.05; });
  await page.getByRole('button', { name: /Verdigris.*Challenge/i }).click();
  const cast = page.getByRole('button', { name: 'Cast Turn', exact: true });
  const pass = page.getByRole('button', { name: 'Pass (+Gain Pip)', exact: true });
  const victory = page.getByRole('button', { name: 'Claim Rewards & Return', exact: true });
  const defeat = page.getByRole('button', { name: 'Return to Campus', exact: true });

  for (let round = 1; round <= 8; round++) {
    const card = page.getByRole('button', { name: /Caldera Roar/ }).first();
    if (await card.isVisible()) await card.click();
    if (await cast.isEnabled()) await cast.click();
    else await pass.click();
    const next = page.getByText('Round ' + (round + 1), { exact: true });
    await expect(victory.or(defeat).or(next).first()).toBeVisible();
    if (await victory.isVisible()) break;
    await expect(defeat).not.toBeVisible();
    await expect(pass).toBeEnabled();
  }

  await expect(victory).toBeVisible();
  await victory.click();
}

test('Arbor and Rare Trial pay once and stay completed after guest reload (#13)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.getByRole('textbox').first().fill(wizardName);
  await page.getByRole('button', { name: 'Begin Academy Journey' }).click();
  const duel = page.getByRole('button', { name: 'Duel', exact: true });
  await expect(duel).toBeVisible();

  // Use a late-game guest fixture so the test exercises reward delivery
  // without first playing through academy progression and buying a deck.
  await page.evaluate(({ saveKey, wizardName }) => {
    const save = JSON.parse(localStorage.getItem(saveKey));
    const wizard = save.wizards.find((entry) => entry.name === wizardName);
    Object.assign(wizard, { level: 39, rank: 20, xp: 0 });
    const card = 'ember_meteor_roar';
    wizard.progression.ownedSpellIds.push(card);
    wizard.progression.deck = Array.from({ length: 24 }, () => card);
    localStorage.setItem(saveKey, JSON.stringify(save));
  }, { saveKey, wizardName });

  const reenter = async () => {
    await page.reload();
    await page.getByRole('button', { name: 'Enter Aldervale', exact: true }).click();
    await expect(duel).toBeVisible();
  };
  await reenter();
  const start = await readQuestProgress(page);
  expect(start).toMatchObject({ completed: [], xp: 0 });

  await catchRune(page);
  const arborReward = { completed: [arborId], xp: 140, florins: start.florins + 160, shards: start.shards + 4 };
  await expect.poll(() => readQuestProgress(page)).toEqual(arborReward);
  await winRareTrial(page);
  const bothRewards = {
    completed: [arborId, trialId],
    xp: arborReward.xp + 630 + 260,
    florins: arborReward.florins + 350 + 320,
    shards: arborReward.shards + 2 + 8,
  };
  await expect.poll(() => readQuestProgress(page)).toEqual(bothRewards);
  await expect(page.getByText('Victory! +890 XP, +670 Florins, +10 Spell Shards! Quest completed: Trial of the Hidden Crown.', { exact: true })).toBeVisible();

  await reenter();
  expect(await readQuestProgress(page)).toEqual(bothRewards);
  await page.getByRole('button', { name: 'Campus', exact: true }).click();
  await page.getByRole('button', { name: 'Quests, Term & Codex', exact: true }).click();
  for (const title of ['Harmony of the Arbor', 'Trial of the Hidden Crown']) {
    const quest = page.getByText(title, { exact: true }).locator('..');
    await expect(quest.getByText('Completed', { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await catchRune(page);
  await expect.poll(() => readQuestProgress(page)).toEqual(bothRewards);
  await winRareTrial(page);
  await expect.poll(() => readQuestProgress(page)).toEqual({
    completed: bothRewards.completed,
    xp: bothRewards.xp + 630,
    florins: bothRewards.florins + 350,
    shards: bothRewards.shards + 2,
  });
  expect(errors).toEqual([]);
});
