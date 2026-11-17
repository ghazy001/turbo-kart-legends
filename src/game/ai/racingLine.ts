import { aiConfig } from '../config/aiConfig';
import { kartConfig } from '../config/kartConfig';
import type { SampledTrack } from '../core/types';
import { wrapAngle } from '../kart/kartController';
import { pointAtDistance } from '../race/trackProgress';

const lines = new WeakMap<SampledTrack, readonly number[]>();
const curvatures = new WeakMap<SampledTrack, readonly number[]>();
const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));

function measureCurvature(track: SampledTrack, distance: number): number {
  const a = pointAtDistance(track, distance - 5), b = pointAtDistance(track, distance + 5);
  return wrapAngle(Math.atan2(b.tx, b.tz) - Math.atan2(a.tx, a.tz)) / 10;
}

function interpolate(track: SampledTrack, values: readonly number[], distance: number): number {
  const scaled = ((distance % track.length + track.length) % track.length) / track.length * values.length;
  const i = Math.floor(scaled), t = scaled - i;
  return values[i] * (1 - t) + values[(i + 1) % values.length] * t;
}

export function roadCurvature(track: SampledTrack, distance: number): number {
  let values = curvatures.get(track);
  if (!values) { values = track.samples.map(point => measureCurvature(track, point.distance)); curvatures.set(track, values); }
  return interpolate(track, values, distance);
}

/** Outside entry, inside apex, open exit. Cached once per immutable sampled course. */
export function racingLane(track: SampledTrack, distance: number): number {
  let line = lines.get(track);
  if (!line) {
    let offsets = track.samples.map(p => clamp(roadCurvature(track, p.distance) * 70
      - roadCurvature(track, p.distance + 22) * 35 - roadCurvature(track, p.distance - 22) * 10, aiConfig.lineLimit));
    for (let pass = 0; pass < 4; pass++) offsets = offsets.map((v, i) => (offsets[(i + offsets.length - 1) % offsets.length] + v * 2 + offsets[(i + 1) % offsets.length]) / 4);
    line = offsets; lines.set(track, line);
  }
  return interpolate(track, line, distance);
}

/** Inverse of the existing high-speed bicycle steering; no hidden grip/speed bonus. */
export function cornerSpeed(curvature: number, margin: number): number {
  const angle = Math.atan(kartConfig.wheelBase * Math.abs(curvature));
  if (angle < 0.0001) return Infinity;
  return Math.max(7, kartConfig.maxForwardSpeed / kartConfig.highSpeedSteerReduction * (kartConfig.maxSteerAngle * margin / angle - 1));
}

export function plannedSpeed(track: SampledTrack, distance: number, ceiling: number, margin: number, braking: number, lane = 0): number {
  let speed = ceiling;
  for (let ahead = 0; ahead <= aiConfig.planningDistance; ahead += aiConfig.planningStep) {
    const curvature = roadCurvature(track, distance + ahead);
    const corner = cornerSpeed(curvature / Math.max(0.5, 1 - curvature * lane), margin);
    speed = Math.min(speed, Math.sqrt(corner * corner + 2 * braking * Math.max(0, ahead - 5)));
  }
  return speed;
}
