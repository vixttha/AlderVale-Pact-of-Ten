import { describe, expect, it } from 'vitest';
import { isWizardMuted } from '../shared/playerSocial.ts';

describe('wizard mutes', () => {
  const blocked = ['wizard-rowan', 'wizard-ash'];

  it('blocks only the muted wizard when display names collide', () => {
    expect(isWizardMuted(blocked, 'wizard-rowan')).toBe(true);
    expect(isWizardMuted(blocked, 'wizard-breeze')).toBe(false);
  });

  it('still mutes after a reconnect changes session id but keeps wizard id', () => {
    expect(isWizardMuted(blocked, 'wizard-ash')).toBe(true);
  });
});