import { environmentSize, type EnvironmentAssetId, type EnvironmentPlacement } from '../config/environmentAssets';
import type { SampledTrack } from '../core/types';
import { pointAtDistance } from '../race/trackProgress';
import { offsetSample } from './trackSampling';
import { placementClearance } from './sunshineAssetLayout';

const random = (n: number) => { const x = Math.sin(n * 91.117 + 7.81) * 43758.5453; return x - Math.floor(x); };
export interface SugarPlot { position: [number, number, number]; size: [number, number, number]; yaw: number; color: string }
export interface SugarSceneryLayout { placements: EnvironmentPlacement[]; plots: SugarPlot[] }

/** Market streets, a service stop and lollipop gardens around the unchanged sampled course. */
export function sugarScenery(track: SampledTrack): SugarSceneryLayout {
  const placements: EnvironmentPlacement[] = [], plots: SugarPlot[] = [];
  if (track.definition.id !== 'sugar-rush-valley') return { placements, plots };
  const radius = (id: EnvironmentAssetId, scale: number) => { const [x, , z] = environmentSize(id); return Math.hypot(x, z) * scale / 2; };
  const add = (asset: EnvironmentAssetId, fraction: number, offset: number, scale = 1, rotation = -Math.PI / 2, plot = true) => {
    const p = pointAtDistance(track, fraction * track.length), q = offsetSample(p, offset);
    const placement: EnvironmentPlacement = { id: `sugar-${asset}-${placements.length}`, asset, position: [q.x, plot ? 0.05 : 0, q.z], yaw: Math.atan2(p.tx, p.tz) + rotation, scale, tint: '#ffffff' };
    // Reserve space for the complete source envelope plus its supporting pavement.
    if (placementClearance(track, placement) < 8) return;
    if (placements.some(other => Math.hypot(q.x - other.position[0], q.z - other.position[2]) < radius(asset, scale) + radius(other.asset, other.scale) + 2)) return;
    placements.push(placement);
    if (plot) {
      const [width, , depth] = environmentSize(asset);
      plots.push({ position: [q.x, 0.025, q.z], size: [(width + 2) * scale, 0.05, (depth + 2) * scale], yaw: placement.yaw, color: asset === 'sugar-mascot' ? '#f5e4cc' : '#eddbcd' });
    }
  };
  // A single full station anchors the south-side service boulevard; source +X opens to the road.
  add('lowpoly-gas-station', 0.575, 25, 1, Math.PI);
  // Landmark shops have breathing room; the inside chicane remains visually open.
  for (const [i, fraction] of [0.015, 0.20, 0.425, 0.50, 0.72, 0.895].entries()) add('sugarcube-corner', fraction, 23 + i % 2 * 4, 0.88 + random(i + 20) * 0.18);
  for (const fraction of [0.055, 0.09, 0.25, 0.455, 0.755, 0.94]) add('cotton-candy-stall', fraction, 14.5, 0.94 + random(fraction * 100) * 0.12);
  // Park the serving window (+X) inward, keeping the van itself outside the corridor.
  for (const fraction of [0.12, 0.35, 0.655, 0.84]) add('ice-cream-truck', fraction, 16, 1, Math.PI);
  for (const fraction of [0.975, 0.31, 0.625]) add('sugar-mascot', fraction, 17, 0.9 + random(fraction * 1000) * 0.16);
  // Each supplied pack contains ten different candies; use small separated gardens, not a wall.
  for (let i = 0; i < 36; i++) {
    const side = i % 3 === 0 ? -1 : 1;
    add('lollipops-pack', (i + 0.4) / 36, side * (15 + random(i + 100) * 15), 0.72 + random(i + 200) * 0.38,
      side * -Math.PI / 2 + (random(i + 300) - 0.5) * 0.4, false);
  }
  return { placements, plots };
}
