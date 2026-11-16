import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => console.error(`[browser pageerror] ${error.message}`));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost'
      ? route.continue()
      : route.abort();
  });
});

test('muting one player does not hide a different player with the same display name (issue #78)', async ({ page }) => {
  test.setTimeout(90_000);
  let serverSocket;
  let suppliedWorld = false;

  await page.routeWebSocket('**/ws', (socket) => {
    serverSocket = socket;
    socket.send(JSON.stringify({ type: 'welcome', sessionId: 'local-mute-test-session' }));
    socket.onMessage((raw) => {
      let message;
      try { message = JSON.parse(String(raw)); } catch { return; }
      if (message.type !== 'join_world' || suppliedWorld) return;
      suppliedWorld = true;
      const realmId = message.presence?.realmId ?? 'breeze';
      const zone = message.presence?.zone ?? 'hub';
      const twin = (sessionId, wizardId, x) => ({
        sessionId,
        wizardId,
        ownerId: `guest_${wizardId}`,
        name: 'Twin',
        realmId,
        zone,
        raceId: 'human',
        elementId: 'ember',
        level: 1,
        rank: 1,
        titleBadge: '',
        x,
        y: 0,
        z: 1,
        rotY: 0,
        mountId: null,
        activeCreatureSpeciesId: 'cinder_kitsune',
        activeCreatureStage: 1,
        activeCreatureChromatic: 'none',
        inDuel: false,
      });
      socket.send(JSON.stringify({ type: 'world_joined' }));
      socket.send(JSON.stringify({
        type: 'zone_snapshot',
        players: [
          twin('twin-session-a', 'twin-a', -1),
          twin('twin-session-b', 'twin-b', 1),
        ],
        activeDuels: [],
      }));
    });
  });

  await page.goto('/');
  await page.getByRole('textbox').first().fill('Mute Test Rowan');
  await page.getByRole('button', { name: 'Begin Academy Journey' }).click();
  await expect(page.getByText('3 Online', { exact: true })).toBeVisible();

  const twins = page.getByRole('button', { name: 'Twin Lv.1', exact: true });
  await expect(twins).toHaveCount(2, { timeout: 20_000 });
  await twins.first().click();
  await expect(page.getByRole('button', { name: 'Mute', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mute', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mute', exact: true })).toHaveCount(0);

  expect(serverSocket).toBeTruthy();
  serverSocket.send(JSON.stringify({
    type: 'chat_message',
    senderSessionId: 'twin-session-a',
    senderWizardId: 'twin-a',
    senderName: 'Twin',
    elementId: 'ember',
    text: 'message-from-muted-twin',
    at: Date.now(),
  }));
  serverSocket.send(JSON.stringify({
    type: 'chat_message',
    senderSessionId: 'twin-session-b',
    senderWizardId: 'twin-b',
    senderName: 'Twin',
    elementId: 'ember',
    text: 'message-from-unmuted-twin',
    at: Date.now() + 1,
  }));
  serverSocket.send(JSON.stringify({
    type: 'chat_message',
    senderSessionId: 'control-session',
    senderWizardId: 'control',
    senderName: 'Control',
    elementId: 'ember',
    text: 'message-from-control-sender',
    at: Date.now() + 2,
  }));

  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByText('message-from-control-sender', { exact: true })).toBeVisible();
  await expect(page.getByText('message-from-muted-twin', { exact: true })).toHaveCount(0);
  // This should remain visible because only one Twin identity was muted. On the
  // current build it is also hidden because the mute key is the shared name.
  await expect(page.getByText('message-from-unmuted-twin', { exact: true })).toBeVisible();
});
