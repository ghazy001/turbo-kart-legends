import { raceConfig } from './raceConfig';

export const lapChoices = [1, 3, 5] as const;
export const aiDifficulties = [
  { id: 'easy', name: 'Easy', speedOffset: -3, description: 'A relaxed pace. More room to learn your line.' },
  { id: 'normal', name: 'Normal', speedOffset: 0, description: 'The original rivals. A familiar, balanced challenge.' },
  { id: 'hard', name: 'Hard', speedOffset: 1.5, description: 'A quicker field. Make your clean corners count.' },
] as const;
export type AIDifficulty = typeof aiDifficulties[number]['id'];
export interface RaceOptions { readonly laps: typeof lapChoices[number]; readonly difficulty: AIDifficulty }
export const defaultRaceOptions: Readonly<RaceOptions> = Object.freeze({ laps: raceConfig.laps, difficulty: 'normal' });
export const difficultyDefinition = (id: AIDifficulty) => aiDifficulties.find(entry => entry.id === id)!;

/** Storage and launch values are validated without coercing strings or accepting arbitrary numbers. */
export function normalizeRaceOptions(value: unknown): RaceOptions {
  const input = value && typeof value === 'object' ? value as Partial<RaceOptions> : {};
  return { laps: lapChoices.find(laps => laps === input.laps) ?? defaultRaceOptions.laps,
    difficulty: aiDifficulties.find(entry => entry.id === input.difficulty)?.id ?? defaultRaceOptions.difficulty };
}
export const lapLabel = (laps: number) => `${laps} ${laps === 1 ? 'lap' : 'laps'}`;
