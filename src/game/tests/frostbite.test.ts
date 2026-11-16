import { describe, expect, it } from 'vitest';
import { cameraConfig, sceneConfig } from '../config/kartConfig';
import { makeAlpineTunnel } from '../render/alpineGeometry';
import { alpineConfig, alpineTunnels, clearOfTunnels, mountainLayout, tunnelOutline, tunnelSections } from '../tracks/frostbiteScenery';
import { frostbitePeak } from '../tracks/frostbitePeak';
import { nearestRoadPoint, offsetSample } from '../tracks/trackSampling';
import { createRaceFlowStore } from '../ui/menu/raceFlowStore';
import { defaultSelection } from '../config/visualAssets';
import { sunshineCup, trackCatalog } from '../tracks/trackCatalog';

const track = frostbitePeak;
describe('Frostbite Peak scenery and selection', () => {
  it('exposes the original course in every solo/CPU setup and preserves the selected index', () => {
    const index = trackCatalog.findIndex(course => course.id === track.definition.id);
    expect(index).toBe(2); expect(new Set(trackCatalog.map(course => course.id)).size).toBe(trackCatalog.length);
    for (const mode of ['quick-race', 'time-trial', 'vs-race'] as const) {
      const flow = createRaceFlowStore(defaultSelection, { audioEnabled: true, selectedTrack: 'sunshine-circuit', mode });
      flow.begin(mode); flow.next(); flow.next(); flow.move('down');
      expect(flow.launch()).toMatchObject({ trackId: 'frostbite-peak', mode });
      flow.commit(); flow.home(); flow.begin(mode); expect(flow.getSnapshot().trackIndex).toBe(index);
    }
    expect(sunshineCup.tracks.slice(0, 3)).toEqual(['sunshine-circuit', 'sugar-rush-valley', 'frostbite-peak']);
  });
  it('keeps mountains clear of the whole driving corridor and tunnel envelope', () => {
    const peaks = mountainLayout(track); expect(peaks.length).toBeGreaterThanOrEqual(8); expect(peaks.length).toBeLessThanOrEqual(13);
    for (const peak of peaks) expect(nearestRoadPoint(track, peak).distance - peak.radius).toBeGreaterThanOrEqual(alpineConfig.mountainClearance);
  });
  it.each(alpineTunnels)('$name follows the sampled road, with open portals and camera/rail clearance', tunnel => {
    const sections = tunnelSections(track, tunnel), inner = tunnelOutline(), outer = tunnelOutline(true);
    expect(sections.length).toBe(Math.ceil(tunnel.length / alpineConfig.tunnelStep) + 1);
    expect(inner).toHaveLength(outer.length); expect(inner[0].height).toBe(0); expect(inner.at(-1)!.height).toBe(0);
    for (const section of sections) {
      expect(nearestRoadPoint(track, section).distance).toBeLessThan(0.01);
      for (const side of [-1, 1]) {
        const wall = offsetSample(section, side * alpineConfig.tunnelHalfWidth);
        expect(nearestRoadPoint(track, wall).distance).toBeGreaterThan(track.definition.roadWidth / 2 + sceneConfig.railCenterOffset + 2);
        expect(clearOfTunnels(track, wall.x, wall.z)).toBe(false);
        const lane = offsetSample(section, side * 3.6);
        const camera = { x: lane.x - section.tx * cameraConfig.distance, z: lane.z - section.tz * cameraConfig.distance };
        const lateral = nearestRoadPoint(track, camera).distance;
        expect(lateral).toBeLessThan(alpineConfig.tunnelHalfWidth - 1);
        const roof = alpineConfig.tunnelBase + alpineConfig.tunnelRise * Math.sqrt(1 - (lateral / alpineConfig.tunnelHalfWidth) ** 2);
        expect(roof).toBeGreaterThan(cameraConfig.height + 2);
      }
    }
  });
  it.each(alpineTunnels)('$name builds finite, nondegenerate continuous shell geometry on a small fixed budget', tunnel => {
    const geometry = makeAlpineTunnel(track, tunnel), position = geometry.getAttribute('position'), normals = geometry.getAttribute('normal'), indices = geometry.index!;
    expect(position.count).toBeLessThan(600); expect(indices.count / 3).toBeLessThan(1200);
    expect([...position.array, ...normals.array].every(Number.isFinite)).toBe(true);
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i), b = indices.getX(i + 1), c = indices.getX(i + 2);
      const ux = position.getX(b) - position.getX(a), uy = position.getY(b) - position.getY(a), uz = position.getZ(b) - position.getZ(a);
      const vx = position.getX(c) - position.getX(a), vy = position.getY(c) - position.getY(a), vz = position.getZ(c) - position.getZ(a);
      expect(Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)).toBeGreaterThan(1e-7);
    }
    geometry.dispose();
  });
});
