import { BufferGeometry, Float32BufferAttribute } from 'three';
import { sceneConfig } from '../config/kartConfig';
import type { SampledTrack } from '../core/types';
import { wrapDistance } from '../race/trackProgress';
import { offsetSample } from '../tracks/trackSampling';
import { roadHeight } from '../tracks/trackSurface';

/** Interpolate the rendered ribbon edges, including its sampled slope, instead of rotating decals. */
export function roadPaintPoint(track: SampledTrack, distance: number, offset: number, lift = 0.014): [number, number, number] {
  const scaled = wrapDistance(distance, track.length) / track.length * track.samples.length;
  const index = Math.floor(scaled), t = scaled - index;
  const a = track.samples[index], b = track.samples[(index + 1) % track.samples.length];
  const p = offsetSample(a, offset), q = offsetSample(b, offset);
  return [p.x + (q.x - p.x) * t,
    roadHeight(track, a.distance) * (1 - t) + roadHeight(track, b.distance) * t + sceneConfig.roadY + lift,
    p.z + (q.z - p.z) * t];
}

/** Static paint batched by material. Coordinates are [course distance, lateral offset]. */
export class SurfacePaint {
  private positions: number[] = [];
  private indices: number[] = [];
  constructor(private track: SampledTrack) {}

  private quad(a: [number, number], b: [number, number], c: [number, number], d: [number, number], lift: number) {
    const base = this.positions.length / 3;
    for (const [distance, offset] of [a, b, c, d]) this.positions.push(...roadPaintPoint(this.track, distance, offset, lift));
    this.indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }

  strip(start: number, length: number, inner: number, outer: number, lift = 0.014) {
    const end = start + length, spacing = this.track.length / this.track.samples.length;
    const cuts = [start, end];
    // Include every road vertex so paint never bridges across the raised roller.
    for (let d = Math.floor(start / spacing) * spacing + spacing; d < end; d += spacing) cuts.push(d);
    for (let d = start + 0.6; d < end; d += 0.6) cuts.push(d);
    cuts.sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      if (cuts[i] - cuts[i - 1] < 0.00001) continue;
      this.quad([cuts[i - 1], inner], [cuts[i - 1], outer], [cuts[i], inner], [cuts[i], outer], lift);
    }
    return this;
  }

  chevron(distance: number, width: number, depth: number, thickness: number, lift = 0.028) {
    const count = Math.ceil(width / 0.5);
    for (const side of [-1, 1]) for (let i = 0; i < count; i++) {
      const a = side < 0 ? -width / 2 : 0, step = width / 2 / count;
      const x = a + i * step, y = x + step;
      const d = (offset: number) => distance + depth * (1 - 2 * Math.abs(offset) / width);
      this.quad([d(x) - thickness / 2, x], [d(y) - thickness / 2, y],
        [d(x) + thickness / 2, x], [d(y) + thickness / 2, y], lift);
    }
    return this;
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3)); geometry.setIndex(this.indices);
    geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    return geometry;
  }
}

export function roadDashLayout(track: SampledTrack): { distance: number; length: number }[] {
  const count = Math.round(track.length / 9), spacing = track.length / count;
  return Array.from({ length: count }, (_, i) => ({ distance: i * spacing + 3, length: 2.7 })).filter(dash => {
    const start = wrapDistance(dash.distance - (track.definition.startDistance ?? 0), track.length);
    if (Math.min(start, track.length - start) < 7) return false;
    return !(track.definition.features ?? []).some(feature => {
      const relative = wrapDistance(dash.distance - feature.fraction * track.length + 15, track.length) - 15;
      return relative + dash.length > (feature.kind === 'jump' ? -14 : -1) && relative < feature.length + 1;
    });
  });
}

export function makeRoadDashes(track: SampledTrack): BufferGeometry {
  const paint = new SurfacePaint(track);
  for (const dash of roadDashLayout(track)) paint.strip(dash.distance, dash.length, -0.085, 0.085);
  return paint.build();
}
