import { raceConfig } from './raceConfig';

export const lapChoices = [1, 3, 5] as const;
export const aiDifficulties = [
  { id: 'easy', name: 'Easy', speedOffset: -2.8, description: 'Earlier braking, gentler lines and patient passes. Learn the circuit.' },
  { id: 'normal', name: 'Medium', speedOffset: 0, description: 'Quick racing lines, committed passes and short drift turbos.' },
  { id: 'hard', name: 'Hard', speedOffset: 0.6, description: 'Later braking, assertive battles and longer drift charges. Earn every place.' },
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
