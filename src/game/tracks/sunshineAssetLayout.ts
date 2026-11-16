import { environmentSize, type EnvironmentAssetId, type EnvironmentPlacement } from '../config/environmentAssets';
import { sceneConfig } from '../config/kartConfig';
import type { SampledTrack } from '../core/types';
import { pointAtDistance, wrapDistance } from '../race/trackProgress';
import { nearestRoadPoint, offsetSample } from './trackSampling';
import { roadHeight } from './trackSurface';
import { sunshineServiceAreas } from './sunshineServiceAreas';
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
  const radius = (asset: EnvironmentAssetId, scale: number) => { const [x, , z] = environmentSize(asset); return Math.hypot(x, z) * scale / 2; };
  const overlaps = (candidate: EnvironmentPlacement, gap: number) => placements.some(other =>
    Math.hypot(candidate.position[0] - other.position[0], candidate.position[2] - other.position[2]) < radius(candidate.asset, candidate.scale) + radius(other.asset, other.scale) + gap);
  const add = (asset: EnvironmentAssetId, distance: number, offset: number, scale = 1, rotation = 0, y = 0, tint = '#ffffff') => {
    const p = pointAtDistance(track, distance), q = offsetSample(p, offset);
    const placement: EnvironmentPlacement = { id: `${asset}-${placements.length}`, asset, position: [q.x, y, q.z], yaw: Math.atan2(p.tx, p.tz) + rotation, scale, tint };
    const railFace = track.definition.roadWidth / 2 + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2;
    if (placementClearance(track, placement) < railFace + 0.16) return;
    if (asset === 'viking-house' || asset === 'cactus' || asset === 'stylized-tree') {
      // Preserve lagoon shoreline, spectator lawns and room between full source envelopes.
      if ((q.x / 63) ** 2 + ((q.z - 12) / 76) ** 2 < 1.15 || overlaps(placement, asset === 'cactus' ? 1 : 1.5)) return;
    }
    placements.push(placement);
  };
  // Spread the supplied dispensers between two clear roadside service areas.
  for (const area of sunshineServiceAreas) add('gas-station', track.length * area.fraction, area.offset);
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
  // Small groups with open gaps between them: the supplied broad-fronted houses face the road.
  const villages = [0.005, 0.04, 0.075, 0.21, 0.245, 0.465, 0.50, 0.54, 0.64, 0.785, 0.875, 0.915, 0.955, 0.985];
  for (const [index, fraction] of villages.entries()) {
    add('viking-house', fraction * track.length, [23, 29, 24][index % 3], 0.88 + random(index + 1200) * 0.25, -Math.PI / 2 + (random(index + 1220) - 0.5) * 0.14);
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
  // Cactus gardens frame houses and service forecourts rather than creating a dense prop wall.
  const gardens = [...villages.map(fraction => ({ fraction, offset: 15.5 })), ...sunshineServiceAreas.map(area => ({ fraction: area.fraction, offset: area.offset + 7 }))];
  for (const [garden, anchor] of gardens.entries()) for (const along of [-7, 0, 7]) {
    const seed = garden * 3 + along;
    add('cactus', anchor.fraction * track.length + along, anchor.offset + random(seed + 1400) * 3, 0.65 + random(seed + 1420) * 0.45, random(seed + 1440) * Math.PI * 2);
  }
  // Sparse outer-verge accents fill the remaining stretches without covering race sightlines.
  for (let i = 0; i < 36; i++) add('cactus', track.length * (i + 0.3) / 36, 12 + random(i + 1600) * 21, 0.7 + random(i + 1620) * 0.4, random(i + 1640) * Math.PI * 2);
  return placements;
}
