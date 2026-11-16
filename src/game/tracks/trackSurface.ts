import { boostTiers } from '../config/driftConfig';
import type { KartInput, KartState, SampledTrack, Vec2 } from '../core/types';
import { pointAtDistance, wrapDistance } from '../race/trackProgress';
import { nearestRoadPoint } from './trackSampling';

export interface RoadRise { start: number; length: number; height: number; crest: number }
export const trackFeatureConfig = { turboKick: 4, maxSweep: 2, contactClearance: 0.3 } as const;
export interface TrackFeature { id: string; kind: 'turbo' | 'jump'; fraction: number; width: number; length: number; minSpeed: number; strength: number }
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Fractions of the shared centerline: renderer, recovery and physics use one surface. */
export function roadHeight(track: SampledTrack, distance: number): number {
  let height = 0;
  for (const rise of track.definition.rises ?? []) {
    const t = wrapDistance(distance - rise.start * track.length, track.length) / rise.length;
    if (t >= 1) continue;
    height = Math.max(height, rise.height * smooth(t < rise.crest ? t / rise.crest : (1 - t) / (1 - rise.crest)));
  }
  return height;
}
export function surfaceHeightAt(track: SampledTrack, point: Vec2): number {
  return track.definition.rises?.length ? roadHeight(track, nearestRoadPoint(track, point).progress) : 0;
}
/** Directional swept entry, not an overlap timer: parking/reversing cannot farm boosts. */
export function crossedFeature(track: SampledTrack, feature: TrackFeature, before: KartState, after: KartState): boolean {
  const gate = pointAtDistance(track, feature.fraction * track.length);
  const from = (before.x - gate.x) * gate.tx + (before.z - gate.z) * gate.tz;
  const to = (after.x - gate.x) * gate.tx + (after.z - gate.z) * gate.tz;
  if (!(from <= 0 && to > 0) || Math.hypot(after.x - before.x, after.z - before.z) > trackFeatureConfig.maxSweep) return false;
  const t = -from / (to - from);
  const x = before.x + (after.x - before.x) * t - gate.x;
  const z = before.z + (after.z - before.z) * t - gate.z;
  const y = before.y + (after.y - before.y) * t;
  return Math.abs(x * gate.tz - z * gate.tx) <= feature.width / 2
    && y <= roadHeight(track, gate.distance) + trackFeatureConfig.contactClearance;
}
export function applyTrackFeatures(track: SampledTrack, before: KartState, after: KartState, input: KartInput): KartState {
  let next = after;
  for (const feature of track.definition.features ?? []) {
    if (after.forwardSpeed < feature.minSpeed || input.brake > 0 || !crossedFeature(track, feature, before, after)) continue;
    if (feature.kind === 'turbo') {
      // Reuse Surge's existing tuning. Never weaken a charged Flare or accumulate duration.
      if (next.boostRemaining > 0) continue;
      next = { ...next, forwardSpeed: Math.max(next.forwardSpeed, Math.min(boostTiers[1].maxSpeed, next.forwardSpeed + trackFeatureConfig.turboKick)), boostTier: 2, boostRemaining: feature.strength, boostSerial: next.boostSerial + 1 };
    } else if (before.verticalSpeed === 0 && before.y <= surfaceHeightAt(track, before) + 0.01) {
      next = { ...next, verticalSpeed: feature.strength, jumpSerial: next.jumpSerial + 1 };
    }
  }
  return next;
}

/** Visual pitch only. Colliders and steering remain planar. */
export function surfacePitch(track: SampledTrack, state: KartState): number {
  if (!track.definition.rises?.length) return 0;
  const ground = surfaceHeightAt(track, state);
  if (state.y > ground + 0.08) return -Math.max(-0.12, Math.min(0.12, state.verticalSpeed * 0.018));
  const dx = Math.sin(state.heading) * 1.8, dz = Math.cos(state.heading) * 1.8;
  return -Math.atan2(surfaceHeightAt(track, { x: state.x + dx, z: state.z + dz }) - surfaceHeightAt(track, { x: state.x - dx, z: state.z - dz }), 3.6);
}
