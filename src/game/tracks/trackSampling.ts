import type { SampledTrack, TrackDefinition, TrackSample, Vec2 } from '../core/types';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function catmull(a: number, b: number, c: number, d: number, t: number): number {
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t
    + (-a + 3 * b - 3 * c + d) * t * t * t);
}

/** Closed, arc-length-resampled Catmull-Rom spline; no rendering dependency. */
export function sampleTrack(definition: TrackDefinition, spacing = 1.5): SampledTrack {
  const { points } = definition;
  const dense: Vec2[] = [];
  for (let segment = 0; segment < points.length; segment++) {
    const a = points[(segment + points.length - 1) % points.length];
    const b = points[segment];
    const c = points[(segment + 1) % points.length];
    const d = points[(segment + 2) % points.length];
    for (let j = 0; j < 100; j++) {
      const t = j / 100;
      dense.push({ x: catmull(a.x, b.x, c.x, d.x, t), z: catmull(a.z, b.z, c.z, d.z, t) });
    }
  }
  dense.push({ ...dense[0] });
  const distances = [0];
  for (let i = 1; i < dense.length; i++) {
    distances.push(distances[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].z - dense[i - 1].z));
  }
  const length = distances[distances.length - 1];
  const count = Math.ceil(length / spacing);
  const samples: TrackSample[] = [];
  let cursor = 1;
  for (let i = 0; i < count; i++) {
    const distance = i / count * length;
    while (distances[cursor] < distance) cursor++;
    const t = (distance - distances[cursor - 1]) / (distances[cursor] - distances[cursor - 1]);
    samples.push({
      x: lerp(dense[cursor - 1].x, dense[cursor].x, t),
      z: lerp(dense[cursor - 1].z, dense[cursor].z, t), tx: 0, tz: 0, distance,
    });
  }
  samples.forEach((sample, i) => {
    const before = samples[(i + count - 1) % count];
    const after = samples[(i + 1) % count];
    const magnitude = Math.hypot(after.x - before.x, after.z - before.z);
    sample.tx = (after.x - before.x) / magnitude;
    sample.tz = (after.z - before.z) / magnitude;
  });
  const start = samples[0];
  return { definition, samples, length, spawn: { x: start.x, z: start.z, heading: Math.atan2(start.tx, start.tz) } };
}

export function offsetSample(sample: TrackSample, offset: number): Vec2 {
  return { x: sample.x + sample.tz * offset, z: sample.z - sample.tx * offset };
}

/** Projection to actual road segments, including the closing segment. */
export function nearestRoadPoint(track: SampledTrack, point: Vec2) {
  let distanceSquared = Infinity;
  let x = 0;
  let z = 0;
  let tx = 0;
  let tz = 1;
  let index = 0;
  let progress = 0;
  track.samples.forEach((a, i) => {
    const b = track.samples[(i + 1) % track.samples.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSquared = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSquared));
    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    const distance = (point.x - px) ** 2 + (point.z - pz) ** 2;
    if (distance < distanceSquared) {
      const length = Math.sqrt(lengthSquared);
      distanceSquared = distance;
      x = px; z = pz; tx = dx / length; tz = dz / length; index = i;
      progress = a.distance + length * t;
    }
  });
  return { x, z, tx, tz, distance: Math.sqrt(distanceSquared), index, progress };
}
