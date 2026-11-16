import type { SampledTrack } from '../core/types';
import type { TrackFeature } from '../tracks/trackSurface';
import { SurfacePaint } from './surfacePaint';

/** Paint follows existing trigger/surface definitions; it never changes boost or jump ownership. */
export function makeFeaturePaint(track: SampledTrack, feature: TrackFeature) {
  const turbo = feature.kind === 'turbo', gate = feature.fraction * track.length;
  const start = turbo ? gate : gate - 12, length = turbo ? feature.length : 12 + feature.length;
  // Keep paint off the curb/edge stripe; physical trigger widths remain unchanged.
  const half = Math.min(feature.width / 2, track.definition.roadWidth / 2 - 0.65);
  const bed = new SurfacePaint(track), trim = new SurfacePaint(track), arrows = new SurfacePaint(track), entry = new SurfacePaint(track);
  bed.strip(start, length, -half, half, 0.012);
  for (const side of [-1, 1]) {
    const edge = side * (half - 0.11);
    trim.strip(start, length, edge - 0.07, edge + 0.07, 0.019);
    if (!turbo) for (let d = start; d < gate; d += 1.2) trim.strip(d, 0.55, side < 0 ? -half : half - 0.5, side < 0 ? -half + 0.5 : half, 0.02);
  }
  for (const offset of turbo ? [0.65, 2.35, 4.05] : [-10.5, -7, -3.5]) arrows.chevron(gate + offset, feature.width * (turbo ? 0.7 : 0.55), turbo ? 1.1 : 1.7, 0.42);
  // A distinct activation/launch stripe sits on the actual swept trigger plane.
  entry.strip(gate, 0.18, -half, half, 0.03);
  if (turbo) trim.strip(gate + length - 0.16, 0.16, -half, half, 0.019);
  return { bed: bed.build(), trim: trim.build(), arrows: arrows.build(), entry: entry.build() };
}
