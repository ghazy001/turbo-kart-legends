import { environmentSize, type EnvironmentAssetId, type EnvironmentPlacement } from '../config/environmentAssets';
import type { SampledTrack } from '../core/types';
import { pointAtDistance } from '../race/trackProgress';
import { offsetSample } from './trackSampling';
import { placementClearance } from './sunshineAssetLayout';
import { clearOfTunnels, mountainLayout } from './frostbiteScenery';

const random = (n: number) => { const x = Math.sin(n * 93.117 + 24.81) * 43758.5453; return x - Math.floor(x); };
/** Full source footprints leave open portals, snowbanks and the unchanged driving corridor. */
export function frostbiteAssetLayout(track: SampledTrack): EnvironmentPlacement[] {
  if (track.definition.id !== 'frostbite-peak') return [];
  const placements: EnvironmentPlacement[] = [], peaks = mountainLayout(track);
  const radius = (id: EnvironmentAssetId, scale: number) => { const [x, , z] = environmentSize(id); return Math.hypot(x, z) * scale / 2; };
  const add = (asset: EnvironmentAssetId, fraction: number, offset: number, scale = 1, rotation = -Math.PI / 2, tint = '#ffffff') => {
    const p = pointAtDistance(track, fraction * track.length), q = offsetSample(p, offset), yaw = Math.atan2(p.tx, p.tz) + rotation;
    const candidate: EnvironmentPlacement = { asset, id: `frostbite-${asset}-${placements.length}`, position: [q.x, 0, q.z], yaw, scale, tint };
    if (placementClearance(track, candidate) < 10) return;
    const [width, , depth] = environmentSize(asset), sin = Math.sin(yaw), cos = Math.cos(yaw);
    for (const x of [-0.5, 0, 0.5]) for (const z of [-0.5, 0, 0.5]) {
      if (!clearOfTunnels(track, q.x + (x * width * cos + z * depth * sin) * scale, q.z + (z * depth * cos - x * width * sin) * scale)) return;
    }
    const r = radius(asset, scale);
    if (peaks.some(peak => Math.hypot(q.x - peak.x, q.z - peak.z) < r + peak.radius + 2)) return;
    if (placements.some(other => Math.hypot(q.x - other.position[0], q.z - other.position[2]) < r + radius(other.asset, other.scale) + 1.5)) return;
    placements.push(candidate);
  };
  // Small settlements, with the supplied decorated cabin scene kept intact.
  for (const [i, fraction] of [0.025, 0.23, 0.39, 0.68, 0.89].entries()) add(i % 2 === 0 ? 'winter-cabin' : 'witch-house', fraction, 28, 0.9 + random(i + 10) * 0.15);
  for (const fraction of [0.055, 0.31, 0.48, 0.75, 0.965]) add('happy-snowman', fraction, 15, 0.9 + random(fraction * 100) * 0.18);
  for (const fraction of [0.195, 0.44, 0.82]) add('snow-wolf', fraction, 19, 0.95, -Math.PI / 2 + 0.2);
  // Alternating supplied tree silhouettes form loose groves with gaps between them.
  const groves = [0.065, 0.19, 0.275, 0.35, 0.46, 0.64, 0.73, 0.83, 0.94];
  for (const [grove, fraction] of groves.entries()) for (let tree = 0; tree < 18; tree++) {
    const seed = grove * 23 + tree, side = tree % 3 === 0 ? -1 : 1;
    add(tree % 2 ? 'snow-pine' : 'snow-fir', fraction + (random(seed) - 0.5) * 0.085, side * (15 + random(seed + 100) * 29),
      0.72 + random(seed + 200) * 0.5, random(seed + 300) * Math.PI * 2, ['#ffffff', '#edf4ff', '#e8f0f3'][tree % 3]);
  }
  return placements;
}
