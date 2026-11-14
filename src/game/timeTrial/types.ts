/** Compact visual sample: seconds, x, height, z, heading, steer, wheel angle, furthest validated progress. */
export type GhostFrame = readonly [number, number, number, number, number, number, number, number];
export interface TrialRecord {
  version: 1; rules: string; laps: number; bestRace: number; bestLap: number;
  lapTimes: readonly number[]; ghost: readonly GhostFrame[] | null;
}
export interface TrialAttempt { duration: number; lapTimes: readonly number[]; frames: readonly GhostFrame[] }
export type TrialInvalidReason = 'recovery' | 'discontinuity' | 'limit';
export interface TrialOutcome {
  eligible: boolean; reason?: TrialInvalidReason; first: boolean; newRace: boolean; newLap: boolean;
  previousRace: number | null; previousLap: number | null;
  record: TrialRecord | null; storage: 'saved' | 'times-only' | 'memory-only';
}
export interface GhostPose { x: number; y: number; z: number; heading: number; steering: number; wheelSpin: number }
