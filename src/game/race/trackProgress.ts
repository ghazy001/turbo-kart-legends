import type { SampledTrack, TrackSample, Vec2 } from '../core/types';
import { raceConfig } from '../config/raceConfig';
import { nearestRoadPoint } from '../tracks/trackSampling';

export interface Checkpoint extends TrackSample { id: number; halfWidth: number }
export function wrapDistance(distance: number, length: number): number { return ((distance % length) + length) % length; }

/** Interpolate the same arc-length road samples used by visuals and collision. */
export function pointAtDistance(track: SampledTrack, distance: number): TrackSample {
  const along = wrapDistance(distance, track.length);
  const scaled = along / track.length * track.samples.length;
  const index = Math.floor(scaled);
  const a = track.samples[index]; const b = track.samples[(index + 1) % track.samples.length];
  const t = scaled - index;
  const tx = a.tx + (b.tx - a.tx) * t; const tz = a.tz + (b.tz - a.tz) * t;
  const magnitude = Math.hypot(tx, tz);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, tx: tx / magnitude, tz: tz / magnitude, distance: along };
}
export function createCheckpoints(track: SampledTrack): Checkpoint[] {
  return Array.from({ length: raceConfig.checkpoints }, (_, id) => ({
    ...pointAtDistance(track, (track.definition.startDistance ?? 0) + id / raceConfig.checkpoints * track.length),
    id, halfWidth: track.definition.roadWidth / 2,
  }));
}
export function relativeProgress(track: SampledTrack, point: Vec2): number {
  return wrapDistance(nearestRoadPoint(track, point).progress - (track.definition.startDistance ?? 0), track.length);
}

/** Swept forward crossing: stationary/reverse/outside-gate/teleport moves cannot score. */
export function crossingFraction(gate: Checkpoint, before: Vec2, after: Vec2): number | null {
  if (Math.hypot(after.x - before.x, after.z - before.z) > raceConfig.maxGateSweep) return null;
  const from = (before.x - gate.x) * gate.tx + (before.z - gate.z) * gate.tz;
  const to = (after.x - gate.x) * gate.tx + (after.z - gate.z) * gate.tz;
  if (!(from <= 0 && to > 0)) return null;
  const fraction = -from / (to - from);
  const x = before.x + (after.x - before.x) * fraction - gate.x;
  const z = before.z + (after.z - before.z) * fraction - gate.z;
  return Math.abs(x * gate.tz - z * gate.tx) <= gate.halfWidth ? fraction : null;
}
