import type { SampledTrack } from '../core/types';
import { pointAtDistance } from '../race/trackProgress';
import { nearestRoadPoint, offsetSample } from './trackSampling';
import { roadHeight } from './trackSurface';

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
    const fraction = i / 68, side = i % 2 ? 1 : -1, offset = side * (12.5 + noise(i) * 7);
    const h = 4.3 + noise(i + 10) * 2;
    place(trunks, fraction, offset, 0, h / 2, [0.42, h, 0.42], '#a68862', 0.08);
    const p = pointAtDistance(track, track.length * fraction), q = offsetSample(p, offset);
    for (let leaf = 0; leaf < 5; leaf++) {
      const angle = leaf * Math.PI * 2 / 5 + i;
      foliage.push({ position: [q.x + Math.sin(angle) * 1.8, h - 0.2, q.z + Math.cos(angle) * 1.8], scale: [0.75, 0.23, 3.5], rotation: [0.12, angle, 0.1], color: ['#448b63', '#307c68', '#64a168'][i % 3] });
    }
    if (i % 2 === 0) place(rocks, fraction, side * (9 + noise(i + 99) * 3), 2, 0.3, [1.7, 0.9, 1.3], '#d0c6a3');
    for (let flower = 0; flower < 5; flower++) {
      place(foliage, fraction, side * (8 + noise(i + flower + 123) * 3), flower * 0.65, 0.15, [0.22, 0.3, 0.22], flower % 3 ? '#e5ca73' : '#fff3ce');
    }
  }
  // Clubhouse and harbor garages on the home straight.
  for (const [index, fraction] of [0.91, 0.95, 0.995, 0.04].entries()) {
    const color = ['#f3dec0', '#e2e3d4', '#f3d9b9', '#f4e8cd'][index];
    place(boxes, fraction, 20, 0, 2.8, [8, 5.6, 13], color);
    place(boxes, fraction, 20, 0, 5.9, [9, 0.5, 14], '#467d7b');
    place(boxes, fraction, 15.7, 0, 3.5, [0.15, 1.6, 10.5], '#528f9a');
    place(boxes, fraction, 14.9, 0, 4.7, [2, 0.18, 13.4], '#e5b66b');
    for (let door = -1; door <= 1; door++) place(boxes, fraction, 15.9, door * 3.5, 1.2, [0.12, 2.4, 2.4], '#385c66');
  }
  // Spectator terraces, with clear sightlines and no decorative on-road collision.
  for (const fraction of [0.14, 0.71]) {
    for (let row = 0; row < 4; row++) {
      place(boxes, fraction, 13 + row * 1.1, 0, 0.35 + row * 0.45, [1.1, 0.7 + row * 0.9, 19], '#ede2c6');
      for (let person = 0; person < 12; person++) place(foliage, fraction, 13 + row * 1.1, -8 + person * 1.5, 1.3 + row * 0.9, [0.4, 0.6, 0.4], ['#d89368', '#387d88', '#e1bb5f', '#708b72'][(person + row) % 4]);
    }
    place(boxes, fraction, 16, 0, 6.3, [9, 0.3, 23], '#527e7b');
    for (const end of [-10, 10]) place(trunks, fraction, 18, end, 3.1, [0.2, 6.2, 0.2], '#b4a77e');
  }
  // Reflector posts provide continuous scale/speed cues at the road edge.
  for (let i = 0; i < track.length / 8; i++) for (const side of [-1, 1]) {
    const p = pointAtDistance(track, i * 8), q = offsetSample(p, side * 6.45), h = roadHeight(track, p.distance);
    boxes.push({ position: [q.x, h + 0.47, q.z], scale: [0.14, 0.94, 0.14], rotation: [0, 0, 0], color: '#eee6ca' });
    boxes.push({ position: [q.x, h + 0.78, q.z], scale: [0.18, 0.18, 0.18], rotation: [0, 0, 0], color: i % 4 === 0 ? '#e9b35e' : '#5c9b92' });
  }
  return { boxes, trunks, foliage, rocks };
}
