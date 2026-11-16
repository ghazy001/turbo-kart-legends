import { environmentSize, type EnvironmentAssetId, type EnvironmentPlacement } from '../config/environmentAssets';
import { sceneConfig } from '../config/kartConfig';
import type { SampledTrack } from '../core/types';
import { pointAtDistance, wrapDistance } from '../race/trackProgress';
import { nearestRoadPoint, offsetSample } from './trackSampling';
import { roadHeight } from './trackSurface';
const random = (n: number) => { const x = Math.sin(n * 74.217 + 19.13) * 43758.5453; return x - Math.floor(x); };
export const viewingAreas = [{ fraction: 0.14, side: 1 }, { fraction: 0.365, side: 1 }, { fraction: 0.71, side: 1 }] as const;
/** Check the transformed footprint including curve-side corners, not just the model pivot. */
export function placementClearance(track: SampledTrack, placement: EnvironmentPlacement): number {
  const [width, , depth] = environmentSize(placement.asset), sin = Math.sin(placement.yaw), cos = Math.cos(placement.yaw);
  let minimum = Infinity;
  for (const x of [-0.5, 0, 0.5]) for (const z of [-0.5, 0, 0.5]) {
    minimum = Math.min(minimum, nearestRoadPoint(track, { x: placement.position[0] + (x * width * cos + z * depth * sin) * placement.scale,
      z: placement.position[2] + (z * depth * cos - x * width * sin) * placement.scale }).distance);
  }
  return minimum;
}
export function sunshineAssetLayout(track: SampledTrack): EnvironmentPlacement[] {
  if (track.definition.id !== 'sunshine-circuit') return [];
  const placements: EnvironmentPlacement[] = [];
  const add = (asset: EnvironmentAssetId, distance: number, offset: number, scale = 1, rotation = 0, y = 0, tint = '#ffffff') => {
    const p = pointAtDistance(track, distance), q = offsetSample(p, offset);
    const placement: EnvironmentPlacement = { id: `${asset}-${placements.length}`, asset, position: [q.x, y, q.z], yaw: Math.atan2(p.tx, p.tz) + rotation, scale, tint };
    const railFace = track.definition.roadWidth / 2 + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2;
    if (placementClearance(track, placement) < railFace + 0.16) return;
    placements.push(placement);
  };
  // A pair of detailed pumps in the harbor pit forecourt, facing the track.
  for (const along of [-3, 3]) add('gas-station', track.length * 0.035 + along, 12.5);
  for (const area of viewingAreas) add('spectators', area.fraction * track.length, area.side * 18.5, area.fraction === 0.71 ? 1.05 : 1, area.fraction === 0.365 ? 0.12 : 0, 0.32);
  // Short protective runs on the outside of three bends; existing rails remain the contact face.
  const [tireWidth, , tireLength] = environmentSize('tire-wall');
  const offset = track.definition.roadWidth / 2 + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2 + tireWidth / 2 + 0.3;
  for (const [start, end] of [[0.18, 0.27], [0.44, 0.495], [0.79, 0.865]]) {
    for (let distance = start * track.length; distance < end * track.length; distance += tireLength + 0.1) {
      // Clear the existing checkpoint flags and feature signposts.
      const nearGate = Array.from({ length: 12 }, (_, i) => wrapDistance(distance - (track.definition.startDistance ?? 0) - track.length * i / 12, track.length)).some(d => Math.min(d, track.length - d) < 2.8);
      if (!nearGate) add('tire-wall', distance, offset, 1, 0, roadHeight(track, distance));
    }
  }
  // Deliberately composed groves: open harbor frontage, viewing lawns and lagoon shoreline.
  const groves = [{ f: 0.105, side: -1 }, { f: 0.21, side: -1 }, { f: 0.285, side: 1 }, { f: 0.41, side: -1 }, { f: 0.51, side: 1 }, { f: 0.61, side: -1 }, { f: 0.66, side: 1 }, { f: 0.78, side: -1 }, { f: 0.9, side: -1 }, { f: 0.95, side: 1 }];
  for (const [grove, anchor] of groves.entries()) for (let tree = 0; tree < 5; tree++) {
    const seed = grove * 9 + tree, fraction = anchor.f + (tree - 2) * 0.014 + (random(seed) - 0.5) * 0.006;
    const distance = fraction * track.length, offset = anchor.side * (12 + random(seed + 700) * 18), p = pointAtDistance(track, distance), q = offsetSample(p, offset);
    if ((q.x / 63) ** 2 + ((q.z - 12) / 76) ** 2 < 1.15) continue;
    if (viewingAreas.some(area => { const a = offsetSample(pointAtDistance(track, area.fraction * track.length), area.side * 18.5); return Math.hypot(q.x - a.x, q.z - a.z) < 12; })) continue;
    if (placements.some(other => other.asset === 'stylized-tree' && Math.hypot(q.x - other.position[0], q.z - other.position[2]) < 6.2)) continue;
    add('stylized-tree', distance, offset, 0.82 + random(seed + 41) * 0.35, random(seed + 94) * Math.PI * 2, 0, ['#ffffff', '#eff3db', '#e1ebd5'][seed % 3]);
  }
  return placements;
}
