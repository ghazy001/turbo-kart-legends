import { environmentSize, type EnvironmentAssetId, type EnvironmentPlacement } from '../config/environmentAssets';
import type { SampledTrack } from '../core/types';
import { pointAtDistance } from '../race/trackProgress';
import { offsetSample } from './trackSampling';
import { placementClearance } from './sunshineAssetLayout';
import { lavaPools } from './volcanoScenery';

const random = (n: number) => { const x = Math.sin(n * 87.117 + 49.81) * 43758.5453; return x - Math.floor(x); };
/** Supplied posed creatures frame distinct bends; nothing moves or collides with racing actors. */
export function volcanoAssetLayout(track: SampledTrack): EnvironmentPlacement[] {
  if (track.definition.id !== 'volcano-sprint') return [];
  const placements: EnvironmentPlacement[] = [], pools = lavaPools(track);
  const radius = (id: EnvironmentAssetId, scale: number) => { const [x, , z] = environmentSize(id); return Math.hypot(x, z) * scale / 2; };
  const place = (asset: EnvironmentAssetId, x: number, z: number, scale: number, yaw: number, tint = '#ffffff') => {
    const candidate: EnvironmentPlacement = { asset, id: `volcano-${asset}-${placements.length}`, position: [x, 0, z], scale, yaw, tint };
    if (placementClearance(track, candidate) < 10) return;
    const r = radius(asset, scale);
    if (pools.some(pool => Math.hypot(x - pool.x, z - pool.z) < Math.max(pool.rx, pool.rz) * 1.12 + r + 1)) return;
    if (placements.some(other => Math.hypot(x - other.position[0], z - other.position[2]) < r + radius(other.asset, other.scale) + 2)) return;
    placements.push(candidate);
  };
  const beside = (asset: EnvironmentAssetId, fraction: number, offset: number, scale: number, yaw: number, tint?: string) => {
    const sample = pointAtDistance(track, fraction * track.length), q = offsetSample(sample, offset);
    place(asset, q.x, q.z, scale, Math.atan2(sample.tx, sample.tz) + yaw, tint);
  };
  // One readable hero caldera inside the loop, with three distant silhouettes.
  place('cartoon-volcano', 0, 22, 1, 0.3);
  place('cartoon-volcano', -190, -170, 1.4, 1.8);
  place('cartoon-volcano', 170, 170, 1.5, 3.2);
  place('cartoon-volcano', 215, -115, 1.2, 4.5);
  // Respect each complete tail/wing envelope. No invented flight or walk clips.
  beside('charizard', 0.07, 21, 1, -Math.PI / 2);
  beside('dinosaur', 0.27, 25, 1, -Math.PI / 2);
  beside('deadly-nadder', 0.52, 27, 1, -Math.PI / 2);
  beside('momma-dino', 0.61, 29, 1, -Math.PI / 2);
  beside('charizard', 0.92, -23, 0.85, Math.PI / 2);
  // Broken rock gardens, rather than evenly spaced pillars or a solid scenic wall.
  for (let i = 0; i < 76; i++) {
    const side = i % 3 === 0 ? -1 : 1;
    beside('desert-rocks', (i + 0.35) / 76, side * (13 + random(i + 10) * 19), 0.55 + random(i + 100) * 0.8,
      random(i + 200) * Math.PI * 2, ['#ffffff', '#d2c4bd', '#c4bdc6'][i % 3]);
  }
  return placements;
}
