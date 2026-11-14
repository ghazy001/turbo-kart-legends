import { kartConfig, sceneConfig } from '../config/kartConfig';
import { itemConfig } from '../config/itemConfig';
import type { KartState, SampledTrack, Vec2 } from '../core/types';
import { capsuleHalfSegment } from '../kart/kartFootprint';
import { nearestRoadPoint } from '../tracks/trackSampling';
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function sweepCircle(a: Vec2, b: Vec2, center: Vec2, radius: number): number | null {
  const x = a.x - center.x, z = a.z - center.z, dx = b.x - a.x, dz = b.z - a.z;
  const c = x * x + z * z - radius * radius;
  if (c <= 0) return 0;
  const length = dx * dx + dz * dz, dot = x * dx + z * dz, discriminant = dot * dot - length * c;
  if (length < 1e-12 || discriminant < 0) return null;
  const t = (-dot - Math.sqrt(discriminant)) / length;
  return t >= 0 && t <= 1 ? t : null;
}
/** Relative swept point versus the existing longitudinal capsule, including moving targets. */
export function sweepKart(a: Vec2, b: Vec2, previous: KartState, current: KartState, radius: number): number | null {
  const sin = Math.sin(current.heading), cos = Math.cos(current.heading);
  const local = (point: Vec2, kart: Vec2) => ({ x: (point.x - kart.x) * sin + (point.z - kart.z) * cos,
    z: (point.x - kart.x) * cos - (point.z - kart.z) * sin });
  const start = local(a, previous), end = local(b, current), r = kartConfig.collisionHalfWidth + radius;
  let enter = 0, exit = 1;
  for (const [from, to, half] of [[start.x, end.x, capsuleHalfSegment], [start.z, end.z, r]]) {
    const delta = to - from;
    if (Math.abs(delta) < 1e-10) { if (Math.abs(from) > half) { exit = -1; break; } }
    else { const t1 = (-half - from) / delta, t2 = (half - from) / delta; enter = Math.max(enter, Math.min(t1, t2)); exit = Math.min(exit, Math.max(t1, t2)); }
  }
  const hits = [enter <= exit && exit >= 0 && enter <= 1 ? clamp(enter) : null,
    sweepCircle(start, end, { x: -capsuleHalfSegment, z: 0 }, r), sweepCircle(start, end, { x: capsuleHalfSegment, z: 0 }, r)].filter((t): t is number => t !== null);
  return hits.length ? Math.min(...hits) : null;
}
/** Subdivided sweep against the very same road/visible rail face as kart contacts. */
export function sweepRail(track: SampledTrack, a: Vec2, b: Vec2, radius: number): number | null {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / itemConfig.wallSweepSpacing));
  const limit = track.definition.roadWidth / 2 + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2 - radius;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, point = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    if (nearestRoadPoint(track, point).distance > limit) return t;
  }
  return null;
}
