import type { SampledTrack, Vec2 } from '../core/types';
import { nearestRoadPoint, offsetSample } from './trackSampling';

export const volcanoConfig = { roadClearance: 12, columnOffset: 14, columnSpacing: 24, maxColumns: 72, peakCount: 9 } as const;
export interface LavaPool extends Vec2 { rx: number; rz: number; rotation: number }
export interface VolcanicPeak extends Vec2 { radius: number; height: number; rotation: number }
const random = (i: number) => { const n = Math.sin(i * 127.1 + 98.7) * 43758.5453; return n - Math.floor(n); };
/** The conservative circular envelope keeps the complete ellipse beyond the road/rail/camera corridor. */
export function lavaPools(track: SampledTrack): LavaPool[] {
  return [
    { x: 20, z: -40, rx: 26, rz: 9, rotation: -0.3 },
    { x: 138, z: -58, rx: 15, rz: 24, rotation: 0.3 },
    { x: 102, z: 116, rx: 14, rz: 23, rotation: -0.7 },
    { x: -151, z: 64, rx: 24, rz: 14, rotation: 0.5 },
    { x: -45, z: -138, rx: 24, rz: 10, rotation: 0.15 },
  ].filter(pool => nearestRoadPoint(track, pool).distance > Math.max(pool.rx, pool.rz) * 1.12 + volcanoConfig.roadClearance);
}
export function volcanicPeaks(track: SampledTrack): VolcanicPeak[] {
  const peaks = Array.from({ length: volcanoConfig.peakCount }, (_, i) => {
    const angle = i / volcanoConfig.peakCount * Math.PI * 2, distance = 225 + random(i) * 20;
    return { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance, radius: 25 + random(i + 11) * 20, height: 35 + random(i + 22) * 38, rotation: random(i + 33) * Math.PI };
  });
  peaks.unshift({ x: 0, z: 8, radius: 25, height: 40, rotation: 0.2 });
  return peaks.filter(peak => nearestRoadPoint(track, peak).distance > peak.radius + volcanoConfig.roadClearance);
}
export function basaltColumns(track: SampledTrack) {
  const pools = lavaPools(track), peaks = volcanicPeaks(track), stride = Math.round(volcanoConfig.columnSpacing / (track.length / track.samples.length));
  return track.samples.filter((_, i) => i % stride === 0).flatMap((sample, i) => [-1, 1].map(side => ({
    ...offsetSample(sample, side * (volcanoConfig.columnOffset + random(i) * 3)), radius: 0.8 + random(i + 15) * 0.8,
    height: 2.5 + random(i + 20) * 5, rotation: random(i + 7) * Math.PI,
  }))).filter(column => nearestRoadPoint(track, column).distance > column.radius + volcanoConfig.roadClearance
    && pools.every(pool => Math.hypot(column.x - pool.x, column.z - pool.z) > Math.max(pool.rx, pool.rz) * 1.12 + column.radius)
    && peaks.every(peak => Math.hypot(column.x - peak.x, column.z - peak.z) > peak.radius + column.radius))
    .slice(0, volcanoConfig.maxColumns);
}
