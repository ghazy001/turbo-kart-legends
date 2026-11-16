import { readFileSync } from 'node:fs';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { environmentAssets, environmentSize, sunshineEnvironmentIds, type EnvironmentAssetId } from '../config/environmentAssets';
import { adaptDiffuseLegacyMaterials } from '../render/models/assetLoader';
import { prepareEnvironmentModel, disposeEnvironmentModels } from '../render/models/environmentModel';
import { placementClearance, sunshineAssetLayout } from '../tracks/sunshineAssetLayout';
import { sunshineCircuit } from '../tracks/sunshineCircuit';
import { trackCatalog } from '../tracks/trackCatalog';
import { sceneConfig } from '../config/kartConfig';
import { sunshineServiceAreas } from '../tracks/sunshineServiceAreas';
import { sunshineScenery } from '../tracks/sunshineScenery';
import { pointAtDistance } from '../race/trackProgress';
import { nearestRoadPoint, offsetSample } from '../tracks/trackSampling';
import report from '../../../docs/assets/environment-optimization.json';
import audit from '../../../docs/assets/environment-audit.json';

async function loadGeometry(url: string) {
  const bytes = readFileSync(new URL(`../../../public${url}`, import.meta.url)), length = bytes.readUInt32LE(12);
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !key.endsWith('Texture') && !['images', 'textures'].includes(key)).map(([key, v]) => [key, strip(v)]));
    return value;
  };
  const document = JSON.parse(bytes.subarray(20, 20 + length).toString()) as { asset: unknown; animations?: unknown[]; skins?: unknown[]; materials?: Parameters<typeof adaptDiffuseLegacyMaterials>[0]['materials']; extensionsUsed?: string[] };
  adaptDiffuseLegacyMaterials(document);
  // Legacy materials above now use the real compatible modern representation.
  document.extensionsUsed = document.extensionsUsed?.filter(extension => extension !== 'KHR_materials_pbrSpecularGlossiness');
  const json = Buffer.from(JSON.stringify(strip(document))), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const binary = bytes.subarray(20 + length), glb = Buffer.alloc(20 + padded.length + binary.length); bytes.copy(glb, 0, 0, 20);
  glb.writeUInt32LE(glb.length, 8); glb.writeUInt32LE(padded.length, 12); padded.copy(glb, 20); binary.copy(glb, 20 + padded.length);
  return { ...await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.length), ''), document };
}

describe('supplied Sunshine environment composition', () => {
  it('uses every supplied asset with deterministic bounded placement and varied trees', () => {
    const layout = sunshineAssetLayout(sunshineCircuit);
    expect(layout).toEqual(sunshineAssetLayout(sunshineCircuit));
    for (const id of sunshineEnvironmentIds) expect(layout.filter(p => p.asset === id).length).toBeGreaterThan(0);
    expect(layout.every(p => (sunshineEnvironmentIds as readonly EnvironmentAssetId[]).includes(p.asset))).toBe(true);
    const trees = layout.filter(p => p.asset === 'stylized-tree');
    expect(trees.length).toBeGreaterThan(25); expect(trees.length).toBeLessThanOrEqual(50);
    expect(new Set(trees.map(p => p.scale)).size).toBeGreaterThan(20);
    expect(layout.filter(p => p.asset === 'gas-station')).toHaveLength(1);
    expect(layout.filter(p => p.asset === 'lowpoly-gas-station')).toHaveLength(1);
    expect(layout.filter(p => p.asset === 'spectators')).toHaveLength(3);
  });
  it('keeps transformed model footprints behind existing rail collision faces', () => {
    const face = sunshineCircuit.definition.roadWidth / 2 + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2;
    for (const placement of sunshineAssetLayout(sunshineCircuit)) expect(placementClearance(sunshineCircuit, placement), placement.id).toBeGreaterThanOrEqual(face + 0.16);
  });
  it('moves both pumps and their paving together into separated roadside service areas', () => {
    const pumps = sunshineAssetLayout(sunshineCircuit).filter(p => p.asset === 'gas-station' || p.asset === 'lowpoly-gas-station');
    const pads = sunshineScenery(sunshineCircuit).boxes.filter(p => p.color === '#c6c4b3');
    expect(pumps).toHaveLength(sunshineServiceAreas.length); expect(pads).toHaveLength(pumps.length);
    for (const [index, area] of sunshineServiceAreas.entries()) {
      const p = pointAtDistance(sunshineCircuit, sunshineCircuit.length * area.fraction), expected = offsetSample(p, area.offset);
      expect(pumps[index].position).toEqual([expected.x, 0, expected.z]);
      expect(pads[index].position).toEqual([expected.x, 0.015, expected.z]);
      expect(pumps[index].asset).toBe(area.asset);
      expect(pads[index].rotation[1] + area.rotation).toBe(pumps[index].yaw);
      expect(pads[index].scale).toEqual([area.paving[0], 0.03, area.paving[1]]);
      // Inspected shop/pumps open along source +X; vintage dispenser faces source -X.
      const sourceFront = area.asset === 'lowpoly-gas-station' ? 1 : -1;
      const facing = { x: Math.cos(pumps[index].yaw) * sourceFront, z: -Math.sin(pumps[index].yaw) * sourceFront };
      expect(facing.x * -p.tz + facing.z * p.tx).toBeCloseTo(1, 5);
    }
    expect(Math.hypot(pumps[0].position[0] - pumps[1].position[0], pumps[0].position[2] - pumps[1].position[2])).toBeGreaterThan(100);
  });
  it('keeps the entire paved service footprints clear of the racing corridor', () => {
    const face = sunshineCircuit.definition.roadWidth / 2 + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2;
    for (const pad of sunshineScenery(sunshineCircuit).boxes.filter(p => p.color === '#c6c4b3')) {
      const yaw = pad.rotation[1];
      for (const x of [-0.5, 0, 0.5]) for (const z of [-0.5, 0, 0.5]) {
        const distance = nearestRoadPoint(sunshineCircuit, {
          x: pad.position[0] + x * pad.scale[0] * Math.cos(yaw) + z * pad.scale[2] * Math.sin(yaw),
          z: pad.position[2] + z * pad.scale[2] * Math.cos(yaw) - x * pad.scale[0] * Math.sin(yaw),
        }).distance;
        expect(distance).toBeGreaterThan(face + 0.16);
      }
    }
  });
  it('does not add scenery or alter source definitions on other circuits', () => {
    for (const { track } of trackCatalog.slice(1)) expect(sunshineAssetLayout(track)).toEqual([]);
  });
  it('replaces block buildings with repeated supplied houses and spaced cactus gardens', () => {
    const layout = sunshineAssetLayout(sunshineCircuit), houses = layout.filter(p => p.asset === 'viking-house' || p.asset === 'stylized-house'), cacti = layout.filter(p => p.asset === 'cactus');
    expect(houses).toHaveLength(14);
    expect(houses.filter(p => p.asset === 'viking-house')).toHaveLength(4);
    expect(houses.filter(p => p.asset === 'stylized-house')).toHaveLength(10);
    expect(cacti.length).toBeGreaterThan(40); expect(cacti.length).toBeLessThan(90);
    expect(new Set(houses.map(p => p.scale)).size).toBe(houses.length);
    // The support batch contains only reflectors, paving and viewing terraces, no buildings.
    expect(sunshineScenery(sunshineCircuit).boxes.every(p => p.scale[1] <= 0.94)).toBe(true);
    const radius = (p: typeof layout[number]) => { const [x, , z] = environmentSize(p.asset); return Math.hypot(x, z) * p.scale / 2; };
    for (const prop of [...houses, ...cacti]) for (const other of layout) {
      if (prop === other) continue;
      expect(Math.hypot(prop.position[0] - other.position[0], prop.position[2] - other.position[2]), `${prop.id} / ${other.id}`).toBeGreaterThanOrEqual(radius(prop) + radius(other) + 1);
      expect((prop.position[0] / 63) ** 2 + ((prop.position[2] - 12) / 76) ** 2).toBeGreaterThanOrEqual(1.15);
    }
  });
  it('records real static capabilities, preserves credits, and budgets mesh/texture derivatives', async () => {
    expect(audit).toHaveLength(13);
    for (const source of audit) { expect(source.skins).toBe(0); expect(source.clips).toEqual([]); expect(source.metadata.extras.author).toBeTruthy(); }
    for (const asset of report) {
      const bytes = readFileSync(new URL(`../../../public/assets/optimized/environment/${asset.output}.glb`, import.meta.url));
      const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()) as { asset: unknown };
      expect(doc.asset).toEqual(audit.find(source => source.id === asset.source)!.metadata);
      expect(asset.images.every(image => image.width <= asset.textureCap && image.height <= asset.textureCap)).toBe(true);
    }
    expect(report.find(asset => asset.output === 'stylized-tree')!.afterTriangles).toBeLessThan(45000);
    expect(report.find(asset => asset.output === 'stylized-tree-far')!.afterTriangles).toBeLessThan(14000);
    expect(report.find(asset => asset.output === 'viking-house')!.afterTriangles).toBeLessThan(35000);
    expect(report.find(asset => asset.output === 'cactus')!.afterTriangles).toBe(3780);
  });
  it('keeps near/far tree anchors and source envelopes identical', async () => {
    const source = await loadGeometry(environmentAssets['stylized-tree'].url), far = await loadGeometry(environmentAssets['stylized-tree'].farUrl);
    const nearModel = prepareEnvironmentModel(source.scene, 'stylized-tree'), farModel = prepareEnvironmentModel(far.scene, 'stylized-tree');
    expect(nearModel.size.toArray()).toEqual(farModel.size.toArray());
    for (const model of [nearModel, farModel]) for (const part of model.parts) {
      const box = part.geometry.boundingBox!;
      expect(box.min.y).toBeGreaterThanOrEqual(-0.001); expect(box.max.y).toBeLessThanOrEqual(8.401);
      expect(Math.max(Math.abs(box.min.x), Math.abs(box.max.x))).toBeLessThanOrEqual(model.size.x / 2 + 0.001);
      expect(Math.max(Math.abs(box.min.z), Math.abs(box.max.z))).toBeLessThanOrEqual(model.size.z / 2 + 0.001);
    }
    disposeEnvironmentModels();
  });
  it.each(Object.keys(environmentAssets) as EnvironmentAssetId[])('%s: ground-aligns, centers and batches the real source without mutating cached geometry', async id => {
    const asset = environmentAssets[id], loaded = await loadGeometry(asset.url);
    loaded.scene.updateMatrixWorld(true); const before = new Box3().setFromObject(loaded.scene);
    const sourceMeshes: Mesh[] = []; loaded.scene.traverse(node => { if (node instanceof Mesh) sourceMeshes.push(node); });
    const model = prepareEnvironmentModel(loaded.scene, id), box = new Box3();
    for (const part of model.parts) { part.geometry.computeBoundingBox(); box.union(part.geometry.boundingBox!); }
    expect(box.min.y).toBeCloseTo(0, 4); expect(Math.abs(box.getCenter(new Vector3()).x)).toBeLessThan(0.15); expect(Math.abs(box.getCenter(new Vector3()).z)).toBeLessThan(0.15);
    expect(box.max.y).toBeLessThanOrEqual(asset.height + 0.001); expect(box.max.y).toBeGreaterThan(asset.height * 0.96);
    const expected = environmentSize(id), size = box.getSize(new Vector3());
    expect(size.x).toBeLessThanOrEqual(expected[0] + 0.001); expect(size.x).toBeGreaterThan(expected[0] * 0.93);
    expect(size.z).toBeLessThanOrEqual(expected[2] + 0.001); expect(size.z).toBeGreaterThan(expected[2] * 0.93);
    expect(model.parts.length).toBeLessThanOrEqual(id === 'cotton-candy-stall' ? 12 : id === 'lowpoly-gas-station' ? 5 : id === 'stylized-tree' || id === 'viking-house' || id === 'lollipops-pack' ? 2 : 1);
    expect(prepareEnvironmentModel(loaded.scene, id)).toBe(model);
    expect(new Box3().setFromObject(loaded.scene).equals(before)).toBe(true);
    for (const part of model.parts) expect(sourceMeshes.some(mesh => mesh.geometry === part.geometry || mesh.material === part.material)).toBe(false);
    disposeEnvironmentModels();
  });
});
