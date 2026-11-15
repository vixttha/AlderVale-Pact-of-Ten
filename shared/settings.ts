export const DEFAULT_PLAYER_SETTINGS = {
  harpVolume: 0.25,
  sfxVolume: 0.55,
  cameraSensitivity: 1,
  solo2xDefault: false,
};

export type PlayerSettings = typeof DEFAULT_PLAYER_SETTINGS;

export function normalizePlayerSettings(value: unknown): PlayerSettings {
  const settings = value && typeof value === 'object' ? value as Partial<PlayerSettings> : {};
  const bounded = (candidate: unknown, fallback: number, min: number, max: number) =>
    typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= min && candidate <= max ? candidate : fallback;
  return {
    harpVolume: bounded(settings.harpVolume, DEFAULT_PLAYER_SETTINGS.harpVolume, 0, 1),
    sfxVolume: bounded(settings.sfxVolume, DEFAULT_PLAYER_SETTINGS.sfxVolume, 0, 1),
    cameraSensitivity: bounded(settings.cameraSensitivity, DEFAULT_PLAYER_SETTINGS.cameraSensitivity, 0.5, 2),
    solo2xDefault: settings.solo2xDefault === true,
  };
}
