import { defaultRaceOptions, normalizeRaceOptions, type RaceOptions } from './raceOptions';

const key = 'turbo-kart-legends.vs-options.v1';
export function loadVSOptions(storage?: Pick<Storage, 'getItem'>): RaceOptions {
  try {
    const value: unknown = JSON.parse((storage ?? localStorage).getItem(key) ?? 'null');
    if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1) return { ...defaultRaceOptions };
    return normalizeRaceOptions(value);
  } catch { return { ...defaultRaceOptions }; }
}
export function saveVSOptions(options: RaceOptions, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? localStorage).setItem(key, JSON.stringify({ version: 1, ...normalizeRaceOptions(options) })); return true; }
  catch { return false; }
}
