import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { environmentIdsForTrack, environmentSize, environmentSlotsForTrack, frostbiteEnvironmentIds } from '../config/environmentAssets';
import { RaceAssetLoading } from '../render/models/RaceAssetLoading';
import { makeRoadDashes } from '../render/surfacePaint';
import { frostbiteAssetLayout } from '../tracks/frostbiteAssetLayout';
import { frostbitePeak as track } from '../tracks/frostbitePeak';
import { clearOfTunnels, mountainLayout } from '../tracks/frostbiteScenery';
import { placementClearance } from '../tracks/sunshineAssetLayout';
import { nearestRoadPoint } from '../tracks/trackSampling';
import { trackCatalog } from '../tracks/trackCatalog';
import audit from '../../../docs/assets/environment-audit.json';

describe('Frostbite supplied scenery', () => {
  it('uses all six supplied models in deterministic mixed groves and bounded settlements', () => {
    const layout = frostbiteAssetLayout(track);
    expect(layout).toEqual(frostbiteAssetLayout(track));
    for (const id of frostbiteEnvironmentIds) expect(layout.some(p => p.asset === id), id).toBe(true);
    for (const id of ['snow-pine', 'snow-fir']) expect(layout.filter(p => p.asset === id).length).toBeGreaterThan(15);
    expect(layout.length).toBeLessThan(180);
    expect(layout.filter(p => p.asset === 'snow-wolf').length).toBeLessThanOrEqual(3);
    expect(new Set(layout.filter(p => p.asset === 'snow-pine').map(p => p.scale)).size).toBeGreaterThan(15);
  });
  it('reserves whole footprints around the driving corridor, mountain bases and tunnel portals', () => {
    const layout = frostbiteAssetLayout(track);
    const radius = (p: typeof layout[number]) => { const [x, , z] = environmentSize(p.asset); return Math.hypot(x, z) * p.scale / 2; };
    for (const [i, p] of layout.entries()) {
      expect(p.position[1]).toBe(0); expect(placementClearance(track, p), p.id).toBeGreaterThanOrEqual(10);
      const [w, , d] = environmentSize(p.asset);
      for (const x of [-0.5, 0, 0.5]) for (const z of [-0.5, 0, 0.5]) expect(clearOfTunnels(track,
        p.position[0] + (x * w * Math.cos(p.yaw) + z * d * Math.sin(p.yaw)) * p.scale,
        p.position[2] + (z * d * Math.cos(p.yaw) - x * w * Math.sin(p.yaw)) * p.scale)).toBe(true);
      for (const peak of mountainLayout(track)) expect(Math.hypot(p.position[0] - peak.x, p.position[2] - peak.z)).toBeGreaterThanOrEqual(radius(p) + peak.radius + 2);
      for (const q of layout.slice(i + 1)) expect(Math.hypot(p.position[0] - q.position[0], p.position[2] - q.position[2])).toBeGreaterThanOrEqual(radius(p) + radius(q) + 1.5);
    }
  });
  it('keeps course-specific loading isolated and safely settles missing scenery', () => {
    expect(environmentIdsForTrack(track.definition.id)).toEqual(frostbiteEnvironmentIds);
    const slots = environmentSlotsForTrack(track.definition.id), gate = new RaceAssetLoading(slots);
    for (const slot of slots.slice(1)) gate.reporter(slot)('ready');
    expect(gate.getSnapshot().ready).toBe(false); gate.reporter(slots[0])('error');
    expect(gate.getSnapshot()).toEqual({ ready: true, settled: 6, total: 6, failed: 1 });
    for (const { track: other } of trackCatalog.filter(course => course.id !== track.definition.id)) {
      expect(frostbiteAssetLayout(other)).toEqual([]); expect(environmentIdsForTrack(other.definition.id)).not.toContain('snow-pine');
    }
  });
  it('distinguishes both supplied tree models and records only actual static capabilities', () => {
    const trees = ['snow-pine', 'snow-fir'].map(id => audit.find(asset => asset.id === id)!);
    expect(trees[0].sha256).not.toBe(trees[1].sha256);
    expect(trees[0].metadata.extras.author).not.toBe(trees[1].metadata.extras.author);
    for (const id of frostbiteEnvironmentIds) {
      const source = audit.find(asset => asset.id === id)!;
      expect(source.skins).toBe(0); expect(source.declaredSkins).toBe(0); expect(source.clips).toEqual([]);
    }
  });
  it('explicitly converts the wolf’s legacy material while preserving its source credits and diffuse texture', () => {
    const bytes = readFileSync(new URL('../../../public/assets/optimized/environment/snow-wolf.glb', import.meta.url));
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()) as { asset: unknown; extensionsUsed: string[]; materials: { pbrMetallicRoughness: { baseColorTexture: { index: number }; roughnessFactor: number } }[] };
    expect(doc.asset).toEqual(audit.find(asset => asset.id === 'snow-wolf')!.metadata);
    expect(doc.extensionsUsed).not.toContain('KHR_materials_pbrSpecularGlossiness');
    expect(doc.materials[0].pbrMetallicRoughness).toMatchObject({ baseColorTexture: { index: 0 }, roughnessFactor: 0.85 });
  });
  it('aligns road paint with the unchanged flat sampled course', () => {
    const geometry = makeRoadDashes(track), position = geometry.attributes.position;
    expect(position.count).toBeGreaterThan(200);
    for (let i = 0; i < position.count; i++) expect(nearestRoadPoint(track, { x: position.getX(i), z: position.getZ(i) }).distance).toBeLessThan(0.09);
    expect(track.definition.features).toBeUndefined(); expect(track.definition.rises).toBeUndefined(); geometry.dispose();
  });
});
