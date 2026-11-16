import type { SampledTrack } from '../core/types';
import { pointAtDistance } from '../race/trackProgress';
import { nearestRoadPoint, offsetSample } from './trackSampling';
import { roadHeight } from './trackSurface';
import { sunshineServiceAreas } from './sunshineServiceAreas';

export interface ScenicInstance { position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number]; color: string }
const noise = (n: number) => { const x = Math.sin(n * 78.233 + 12.89) * 43758.5453; return x - Math.floor(x); };
/** Original coast venue, outside the playable corridor. Batched primitives have no colliders. */
export function sunshineScenery(track: SampledTrack) {
  const boxes: ScenicInstance[] = [], trunks: ScenicInstance[] = [], foliage: ScenicInstance[] = [], rocks: ScenicInstance[] = [];
  const place = (list: ScenicInstance[], fraction: number, offset: number, along: number, y: number, scale: ScenicInstance['scale'], color: string, roll = 0) => {
    const p = pointAtDistance(track, track.length * fraction + along), q = offsetSample(p, offset);
    // Bound the entire decoration, not just its origin, away from driving space.
    const radius = Math.hypot(scale[0], scale[2]) / 2;
    if (nearestRoadPoint(track, q).distance < track.definition.roadWidth / 2 + radius + 1.8) return;
    list.push({ position: [q.x, y, q.z], scale, rotation: [0, Math.atan2(p.tx, p.tz), roll], color });
  };
  for (let i = 0; i < 68; i++) {
    const fraction = i / 68, side = i % 2 ? 1 : -1;
    if (i % 2 === 0) place(rocks, fraction, side * (9 + noise(i + 99) * 3), 2, 0.3, [1.7, 0.9, 1.3], '#d0c6a3');
  }
  // Architecture is supplied GLB scenery; these primitives only support lawns and paving.
  // Broad level viewing lawns support the supplied crowd's inspected 11×10 m layout.
  for (const fraction of [0.14, 0.365, 0.71]) place(boxes, fraction, 18.5, 0, 0.15, [11, 0.3, 12], '#c5bb9b');
  // Wide forecourt uses its actual rectangular footprint, rather than the conservative prop circle.
  for (const area of sunshineServiceAreas) {
    const forecourt = pointAtDistance(track, track.length * area.fraction), pad = offsetSample(forecourt, area.offset);
    boxes.push({ position: [pad.x, 0.015, pad.z], scale: [7, 0.03, 10], rotation: [0, Math.atan2(forecourt.tx, forecourt.tz), 0], color: '#c6c4b3' });
  }
  // Reflector posts provide continuous scale/speed cues at the road edge.
  for (let i = 0; i < track.length / 8; i++) for (const side of [-1, 1]) {
    const p = pointAtDistance(track, i * 8), q = offsetSample(p, side * 6.45), h = roadHeight(track, p.distance);
    boxes.push({ position: [q.x, h + 0.47, q.z], scale: [0.14, 0.94, 0.14], rotation: [0, 0, 0], color: '#eee6ca' });
    boxes.push({ position: [q.x, h + 0.78, q.z], scale: [0.18, 0.18, 0.18], rotation: [0, 0, 0], color: i % 4 === 0 ? '#e9b35e' : '#5c9b92' });
  }
  return { boxes, trunks, foliage, rocks };
}
