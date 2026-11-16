import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadGuestSettings, saveGuestSettings } from '../../src/lib/storage.ts';

vi.mock('../../src/lib/firebase.ts', () => ({
  auth: {},
  db: {},
  handleFirestoreError: vi.fn(),
  OperationType: {},
}));

const settingsKey = 'aldervale_player_settings_v1';
const defaultSettings = {
  harpVolume: 0.25,
  sfxVolume: 0.55,
  cameraSensitivity: 1,
  solo2xDefault: false,
};

describe('Vault G28-006: guest settings storage (#22)', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    { harpVolume: 0, sfxVolume: 1, cameraSensitivity: 0.5, solo2xDefault: true },
    { harpVolume: 1, sfxVolume: 0, cameraSensitivity: 2, solo2xDefault: false },
  ])('round-trips valid settings at camera sensitivity $cameraSensitivity', (settings) => {
    expect(saveGuestSettings(settings)).toBe(true);
    expect(loadGuestSettings()).toEqual(settings);
  });

  it('recovers from broken JSON and can save again', () => {
    localStorage.setItem(settingsKey, '{"harpVolume":');
    expect(loadGuestSettings()).toEqual(defaultSettings);

    const updated = { ...defaultSettings, harpVolume: 0 };
    expect(saveGuestSettings(updated)).toBe(true);
    expect(loadGuestSettings()).toEqual(updated);
  });

  it('preserves a valid field when other persisted fields have invalid values', () => {
    localStorage.setItem(settingsKey, JSON.stringify({
      harpVolume: '0',
      sfxVolume: 0,
      cameraSensitivity: 2.01,
      solo2xDefault: 'true',
    }));

    expect(loadGuestSettings()).toEqual({ ...defaultSettings, sfxVolume: 0 });
  });

  it('reports a failed write and keeps the last good settings', () => {
    const saved = { ...defaultSettings, harpVolume: 0 };
    expect(saveGuestSettings(saved)).toBe(true);
    const write = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });

    expect(saveGuestSettings(defaultSettings)).toBe(false);
    expect(loadGuestSettings()).toEqual(saved);
    write.mockRestore();
    expect(saveGuestSettings(defaultSettings)).toBe(true);
    expect(loadGuestSettings()).toEqual(defaultSettings);
  });
});
