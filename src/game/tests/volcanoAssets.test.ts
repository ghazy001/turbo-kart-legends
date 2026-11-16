import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { environmentIdsForTrack, environmentSize, environmentSlotsForTrack, volcanoEnvironmentIds } from '../config/environmentAssets';
import { RaceAssetLoading } from '../render/models/RaceAssetLoading';
import { roadDashLayout, makeRoadDashes } from '../render/surfacePaint';
import { volcanoAssetLayout } from '../tracks/volcanoAssetLayout';
import { volcanoSprint as track } from '../tracks/volcanoSprint';
import { trackCatalog } from '../tracks/trackCatalog';
import { placementClearance } from '../tracks/sunshineAssetLayout';
import { lavaPools } from '../tracks/volcanoScenery';
import { nearestRoadPoint } from '../tracks/trackSampling';
import audit from '../../../docs/assets/environment-audit.json';
import report from '../../../docs/assets/environment-optimization.json';

describe('Volcano supplied assets', () => {
  it('composes all six supplied models without a repeated creature field', () => {
    const layout = volcanoAssetLayout(track);
    expect(layout).toEqual(volcanoAssetLayout(track));
    for (const id of volcanoEnvironmentIds) expect(layout.some(p => p.asset === id), id).toBe(true);
    expect(layout.filter(p => p.asset === 'cartoon-volcano')).toHaveLength(4);
    const creatures = layout.filter(p => p.asset !== 'cartoon-volcano' && p.asset !== 'desert-rocks');
    expect(creatures.length).toBeGreaterThanOrEqual(4); expect(creatures.length).toBeLessThanOrEqual(5);
    expect(layout.filter(p => p.asset === 'desert-rocks').length).toBeGreaterThan(20);
    expect(layout.length).toBeLessThan(90);
  });
  it('keeps full tails, wings and rock envelopes clear of the road, lava and each other', () => {
    const layout = volcanoAssetLayout(track);
    const radius = (p: typeof layout[number]) => { const [x, , z] = environmentSize(p.asset); return Math.hypot(x, z) * p.scale / 2; };
    for (const [i, p] of layout.entries()) {
      expect(p.position[1]).toBe(0); expect(placementClearance(track, p), p.id).toBeGreaterThanOrEqual(10);
      for (const q of layout.slice(i + 1)) expect(Math.hypot(p.position[0] - q.position[0], p.position[2] - q.position[2])).toBeGreaterThanOrEqual(radius(p) + radius(q) + 2);
      for (const pool of lavaPools(track)) expect(Math.hypot(p.position[0] - pool.x, p.position[2] - pool.z)).toBeGreaterThanOrEqual(radius(p) + Math.max(pool.rx, pool.rz) * 1.12 + 1);
    }
  });
  it('isolates loading and layout from other courses and settles missing scenery safely', () => {
    expect(environmentIdsForTrack(track.definition.id)).toEqual(volcanoEnvironmentIds);
    const slots = environmentSlotsForTrack(track.definition.id), gate = new RaceAssetLoading(slots);
    for (const id of slots.slice(1)) gate.reporter(id)('ready');
    expect(gate.getSnapshot().ready).toBe(false); gate.reporter(slots[0])('error');
    expect(gate.getSnapshot()).toEqual({ ready: true, settled: 6, total: 6, failed: 1 });
    for (const { track: other } of trackCatalog.filter(course => course.id !== track.definition.id)) {
      expect(volcanoAssetLayout(other)).toEqual([]);
      expect(environmentIdsForTrack(other.definition.id)).not.toContain('dinosaur');
    }
  });
  it('records the actual bound dinosaur rig and zero animation clips rather than inventing movement', () => {
    const dinosaur = audit.find(asset => asset.id === 'dinosaur')!;
    expect(dinosaur.skins).toBe(21); expect(dinosaur.declaredSkins).toBe(1); expect(dinosaur.bones).toBe(58);
    for (const id of volcanoEnvironmentIds) expect(audit.find(asset => asset.id === id)!.clips).toEqual([]);
  });
  it('converts only the two incompatible legacy derivatives and preserves their authored diffuse maps/credits', () => {
    for (const id of ['cartoon-volcano', 'dinosaur']) {
      const bytes = readFileSync(new URL(`../../../public/assets/optimized/environment/${id}.glb`, import.meta.url));
      const document = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()) as {
        asset: unknown; extras: { turboKartMaterialConversion: string }; extensionsUsed: string[];
        materials: { pbrMetallicRoughness: { baseColorTexture: { index: number }; metallicFactor: number; roughnessFactor: number }; normalTexture?: { index: number } }[];
      };
      expect(document.asset).toEqual(audit.find(asset => asset.id === id)!.metadata);
      expect(document.extensionsUsed).not.toContain('KHR_materials_pbrSpecularGlossiness');
      expect(document.extras.turboKartMaterialConversion).toContain('Matte');
      expect(document.materials[0].pbrMetallicRoughness).toMatchObject({ baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.85 });
    }
    expect(report.find(asset => asset.source === 'deadly-nadder')!.afterTriangles).toBeLessThan(80000);
    expect(report.find(asset => asset.source === 'momma-dino')!.afterTriangles).toBeLessThan(35000);
  });
  it('keeps aligned road paint and the original flat surface/race topology', () => {
    const geometry = makeRoadDashes(track), positions = geometry.attributes.position;
    expect(roadDashLayout(track).length).toBeGreaterThan(60);
    for (let i = 0; i < positions.count; i++) expect(nearestRoadPoint(track, { x: positions.getX(i), z: positions.getZ(i) }).distance).toBeLessThan(0.09);
    expect(track.definition.features).toBeUndefined(); expect(track.definition.rises).toBeUndefined(); geometry.dispose();
  });
});
