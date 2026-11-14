import type { SampledTrack, TrackSample } from '../core/types';
import { pointAtDistance } from '../race/trackProgress';
import { nearestRoadPoint } from './trackSampling';

export interface AlpineTunnel { fraction: number; length: number; name: string }
export const alpineConfig = {
  tunnelHalfWidth: 12.8, tunnelBase: 2, tunnelRise: 9, tunnelShell: 1.2, tunnelStep: 2, archSegments: 12,
  bankOffset: 8.8, bankSpacing: 9, mountainClearance: 20,
} as const;
export const alpineTunnels: readonly AlpineTunnel[] = [
  { fraction: 0.115, length: 32, name: 'GLACIER GATE' },
  { fraction: 0.565, length: 28, name: 'SUMMIT PASS' },
];
export function tunnelSections(track: SampledTrack, tunnel: AlpineTunnel): TrackSample[] {
  const count = Math.ceil(tunnel.length / alpineConfig.tunnelStep);
  const start = (track.definition.startDistance ?? 0) + tunnel.fraction * track.length;
  return Array.from({ length: count + 1 }, (_, i) => pointAtDistance(track, start + tunnel.length * i / count));
}
export function tunnelOutline(outer = false): { offset: number; height: number }[] {
  const half = alpineConfig.tunnelHalfWidth + (outer ? alpineConfig.tunnelShell : 0);
  const rise = alpineConfig.tunnelRise + (outer ? alpineConfig.tunnelShell : 0);
  return [{ offset: -half, height: 0 }, ...Array.from({ length: alpineConfig.archSegments + 1 }, (_, i) => {
    const angle = Math.PI * i / alpineConfig.archSegments;
    return { offset: -Math.cos(angle) * half, height: alpineConfig.tunnelBase + Math.sin(angle) * rise };
  }), { offset: half, height: 0 }];
}
export function clearOfTunnels(track: SampledTrack, x: number, z: number): boolean {
  const road = nearestRoadPoint(track, { x, z });
  return alpineTunnels.every(tunnel => {
    const start = (track.definition.startDistance ?? 0) + tunnel.fraction * track.length;
    const along = ((road.progress - start + track.length) % track.length);
    return !(along < tunnel.length + 6 || along > track.length - 6) || road.distance > alpineConfig.tunnelHalfWidth + alpineConfig.tunnelShell + 5;
  });
}
const noise = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
export function mountainLayout(track: SampledTrack) {
  const peaks = Array.from({ length: 12 }, (_, i) => {
    const angle = i * Math.PI * 2 / 12 + 0.2, distance = 265 + noise(i) * 15;
    return { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance, radius: 30 + noise(i + 30) * 18, height: 46 + noise(i + 20) * 45, rotation: noise(i + 5) * Math.PI };
  });
  peaks.push({ x: 0, z: 10, radius: 20, height: 48, rotation: 0.3 });
  return peaks.filter(peak => nearestRoadPoint(track, peak).distance > peak.radius + alpineConfig.mountainClearance);
}
