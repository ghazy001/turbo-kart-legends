import { describe, expect, it } from 'vitest';
import { environmentIdsForTrack, environmentSize, environmentSlotsForTrack, sugarEnvironmentIds } from '../config/environmentAssets';
import { sceneConfig } from '../config/kartConfig';
import { RaceAssetLoading } from '../render/models/RaceAssetLoading';
import { makeRoadDashes, roadDashLayout } from '../render/surfacePaint';
import { sugarScenery } from '../tracks/sugarScenery';
import { sugarRushValley as track } from '../tracks/sugarRushValley';
import { trackCatalog } from '../tracks/trackCatalog';
import { placementClearance } from '../tracks/sunshineAssetLayout';
import { nearestRoadPoint } from '../tracks/trackSampling';
import audit from '../../../docs/assets/environment-audit.json';

describe('Sugar Rush supplied scenery', () => {
  it('uses every requested model in a deterministic, bounded and varied market composition', () => {
    const layout = sugarScenery(track);
    expect(layout).toEqual(sugarScenery(track));
    for (const id of sugarEnvironmentIds) expect(layout.placements.some(p => p.asset === id), id).toBe(true);
    expect(layout.placements.length).toBeGreaterThan(25); expect(layout.placements.length).toBeLessThan(60);
    const gardens = layout.placements.filter(p => p.asset === 'lollipops-pack');
    expect(gardens.length).toBeGreaterThan(12); expect(new Set(gardens.map(p => p.scale)).size).toBe(gardens.length);
    expect(layout.placements.filter(p => p.asset === 'lowpoly-gas-station')).toHaveLength(1);
  });
  it('keeps whole model envelopes clear of both sides of the road and other props', () => {
    const { placements } = sugarScenery(track);
    const radius = (p: typeof placements[number]) => { const [x, , z] = environmentSize(p.asset); return Math.hypot(x, z) * p.scale / 2; };
    for (const [index, placement] of placements.entries()) {
      expect(placementClearance(track, placement), placement.id).toBeGreaterThanOrEqual(8);
      for (const other of placements.slice(index + 1)) expect(Math.hypot(placement.position[0] - other.position[0], placement.position[2] - other.position[2])).toBeGreaterThanOrEqual(radius(placement) + radius(other) + 2);
    }
  });
  it('grounds buildings on matching low paved supports without covering the rails', () => {
    const { placements, plots } = sugarScenery(track);
    expect(plots).toHaveLength(placements.filter(p => p.asset !== 'lollipops-pack').length);
    const face = track.definition.roadWidth / 2 + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2;
    for (const plot of plots) {
      const actor = placements.find(p => p.position[0] === plot.position[0] && p.position[2] === plot.position[2])!;
      expect(actor.position[1]).toBe(plot.position[1] + plot.size[1] / 2); expect(actor.yaw).toBe(plot.yaw);
      for (const x of [-0.5, 0, 0.5]) for (const z of [-0.5, 0, 0.5]) {
        const point = { x: plot.position[0] + x * plot.size[0] * Math.cos(plot.yaw) + z * plot.size[2] * Math.sin(plot.yaw),
          z: plot.position[2] + z * plot.size[2] * Math.cos(plot.yaw) - x * plot.size[0] * Math.sin(plot.yaw) };
        expect(nearestRoadPoint(track, point).distance).toBeGreaterThan(face + 0.16);
      }
    }
  });
  it('loads only this course’s assets and preserves Sunshine and other course scopes', () => {
    expect(environmentIdsForTrack(track.definition.id)).toEqual(sugarEnvironmentIds);
    expect(environmentSlotsForTrack(track.definition.id)).toHaveLength(6);
    expect(environmentSlotsForTrack('sunshine-circuit')).toHaveLength(9);
    for (const { track: other } of trackCatalog.filter(entry => entry.id !== track.definition.id)) expect(sugarScenery(other)).toEqual({ placements: [], plots: [] });
    expect(environmentSlotsForTrack('frostbite-peak')).toHaveLength(6); expect(environmentSlotsForTrack('volcano-sprint')).toHaveLength(6);
    expect(environmentIdsForTrack('sunshine-circuit')).not.toContain('lollipops-pack');
  });
  it('waits for the candy scenery and safely settles a failed model without skipping the readiness barrier', () => {
    const slots = environmentSlotsForTrack(track.definition.id), gate = new RaceAssetLoading(['player', ...slots]);
    gate.reporter('player')('ready'); for (const id of slots.slice(1)) gate.reporter(id)('ready');
    expect(gate.getSnapshot().ready).toBe(false); gate.reporter(slots[0])('error');
    expect(gate.getSnapshot()).toEqual({ ready: true, settled: 7, total: 7, failed: 1 });
    const next = new RaceAssetLoading(['player', ...environmentSlotsForTrack('sunshine-circuit')]);
    gate.reporter(slots[0])('ready'); expect(next.getSnapshot().ready).toBe(false);
  });
  it('records the mascot’s unused skeleton without inventing rigging or clips', () => {
    const mascot = audit.find(source => source.id === 'sugar-mascot')!;
    expect(mascot.skins).toBe(0); expect(mascot.declaredSkins).toBe(1); expect(mascot.bones).toBe(56); expect(mascot.clips).toEqual([]);
    for (const id of sugarEnvironmentIds) { const source = audit.find(asset => asset.id === id)!; expect(source.skins).toBe(0); expect(source.clips).toEqual([]); }
  });
  it('uses centerline-aligned road paint without adding a surface/handling or feature rule', () => {
    const geometry = makeRoadDashes(track), vertices = geometry.getAttribute('position');
    expect(roadDashLayout(track).length).toBeGreaterThan(60);
    for (let i = 0; i < vertices.count; i++) expect(nearestRoadPoint(track, { x: vertices.getX(i), z: vertices.getZ(i) }).distance).toBeLessThan(0.09);
    expect(track.definition.rises).toBeUndefined(); expect(track.definition.features).toBeUndefined(); geometry.dispose();
  });
});
