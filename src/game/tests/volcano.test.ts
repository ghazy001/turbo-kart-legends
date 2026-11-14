import { describe, expect, it } from 'vitest';
import { defaultSelection } from '../config/visualAssets';
import { makeVolcanoFissures } from '../render/volcanoGeometry';
import { volcanoSprint } from '../tracks/volcanoSprint';
import { basaltColumns, lavaPools, volcanicPeaks, volcanoConfig } from '../tracks/volcanoScenery';
import { nearestRoadPoint } from '../tracks/trackSampling';
import { sunshineCup, trackCatalog } from '../tracks/trackCatalog';
import { createRaceFlowStore, loadMenuPreferences, saveMenuPreferences } from '../ui/menu/raceFlowStore';

describe('Volcano Sprint content integration', () => {
  it('selects, commits and reloads the fourth course for every standalone race mode', () => {
    const index = trackCatalog.findIndex(course => course.track === volcanoSprint);
    expect(index).toBe(3);
    for (const mode of ['quick-race', 'time-trial', 'vs-race'] as const) {
      const flow = createRaceFlowStore(defaultSelection, { audioEnabled: true, mode, selectedTrack: 'sunshine-circuit' });
      flow.begin(mode); flow.next(); flow.next(); flow.choose(index);
      expect(flow.launch()).toMatchObject({ trackId: 'volcano-sprint', mode, selection: defaultSelection });
      flow.commit(); flow.home(); flow.begin(mode); expect(flow.getSnapshot().trackIndex).toBe(index);
      let saved = '';
      expect(saveMenuPreferences(flow.getSnapshot(), { setItem: (_key, value) => { saved = value; } })).toBe(true);
      expect(loadMenuPreferences({ getItem: () => saved })).toMatchObject({ selectedTrack: 'volcano-sprint', mode });
    }
    expect(new Set(trackCatalog.map(course => course.id)).size).toBe(4);
    expect(sunshineCup.tracks).toEqual(['sunshine-circuit', 'sugar-rush-valley', 'frostbite-peak', 'volcano-sprint']);
  });
  it('keeps the complete visible lava fields safely outside the driving corridor', () => {
    const pools = lavaPools(volcanoSprint); expect(pools.length).toBeGreaterThanOrEqual(3); expect(pools.length).toBeLessThanOrEqual(5);
    for (const pool of pools) for (let i = 0; i < 96; i++) {
      const angle = i / 96 * Math.PI * 2, x = pool.rx * 1.12 * Math.cos(angle), z = pool.rz * 1.12 * Math.sin(angle);
      const point = { x: pool.x + x * Math.cos(pool.rotation) - z * Math.sin(pool.rotation), z: pool.z - x * Math.sin(pool.rotation) - z * Math.cos(pool.rotation) };
      expect(nearestRoadPoint(volcanoSprint, point).distance).toBeGreaterThan(volcanoConfig.roadClearance);
    }
  });
  it('bounds the basalt and crater scenery and excludes it from the road and lava fields', () => {
    const peaks = volcanicPeaks(volcanoSprint), columns = basaltColumns(volcanoSprint);
    expect(peaks).toHaveLength(volcanoConfig.peakCount + 1); expect(peaks[0]).toMatchObject({ x: 0, z: 8 });
    expect(columns.length).toBeGreaterThan(20); expect(columns.length).toBeLessThanOrEqual(volcanoConfig.maxColumns);
    for (const prop of [...peaks, ...columns]) expect(nearestRoadPoint(volcanoSprint, prop).distance - prop.radius).toBeGreaterThan(volcanoConfig.roadClearance);
    for (const column of columns) for (const pool of lavaPools(volcanoSprint)) expect(Math.hypot(column.x - pool.x, column.z - pool.z)).toBeGreaterThan(Math.max(pool.rx, pool.rz) * 1.12 + column.radius);
  });
  it('builds finite nondegenerate lava seams on the actual cliff faces within a fixed geometry budget', () => {
    const peaks = volcanicPeaks(volcanoSprint), geometry = makeVolcanoFissures(peaks);
    const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal'), indices = geometry.index!;
    expect(positions.count).toBe(peaks.length * 42); expect(indices.count / 3).toBe(peaks.length * 36);
    expect([...positions.array, ...normals.array].every(Number.isFinite)).toBe(true);
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i), b = indices.getX(i + 1), c = indices.getX(i + 2);
      const ux = positions.getX(b) - positions.getX(a), uy = positions.getY(b) - positions.getY(a), uz = positions.getZ(b) - positions.getZ(a);
      const vx = positions.getX(c) - positions.getX(a), vy = positions.getY(c) - positions.getY(a), vz = positions.getZ(c) - positions.getZ(a);
      expect(Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)).toBeGreaterThan(1e-5);
    }
    geometry.dispose();
  });
});
