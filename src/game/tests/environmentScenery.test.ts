import { readFileSync } from 'node:fs';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { environmentAssets, environmentSize, type EnvironmentAssetId } from '../config/environmentAssets';
import { prepareEnvironmentModel, disposeEnvironmentModels } from '../render/models/environmentModel';
import { placementClearance, sunshineAssetLayout } from '../tracks/sunshineAssetLayout';
import { sunshineCircuit } from '../tracks/sunshineCircuit';
import { trackCatalog } from '../tracks/trackCatalog';
import { sceneConfig } from '../config/kartConfig';
import report from '../../../docs/assets/environment-optimization.json';
import audit from '../../../docs/assets/environment-audit.json';

async function loadGeometry(url: string) {
  const bytes = readFileSync(new URL(`../../../public${url}`, import.meta.url)), length = bytes.readUInt32LE(12);
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !key.endsWith('Texture') && !['images', 'textures'].includes(key)).map(([key, v]) => [key, strip(v)]));
    return value;
  };
  const document = JSON.parse(bytes.subarray(20, 20 + length).toString()) as { asset: unknown; animations?: unknown[]; skins?: unknown[] };
  const json = Buffer.from(JSON.stringify(strip(document))), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const binary = bytes.subarray(20 + length), glb = Buffer.alloc(20 + padded.length + binary.length); bytes.copy(glb, 0, 0, 20);
  glb.writeUInt32LE(glb.length, 8); glb.writeUInt32LE(padded.length, 12); padded.copy(glb, 20); binary.copy(glb, 20 + padded.length);
  return { ...await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.length), ''), document };
}

describe('supplied Sunshine environment composition', () => {
  it('uses every supplied asset with deterministic bounded placement and varied trees', () => {
    const layout = sunshineAssetLayout(sunshineCircuit);
    expect(layout).toEqual(sunshineAssetLayout(sunshineCircuit));
    for (const id of Object.keys(environmentAssets)) expect(layout.filter(p => p.asset === id).length).toBeGreaterThan(0);
    const trees = layout.filter(p => p.asset === 'stylized-tree');
    expect(trees.length).toBeGreaterThan(25); expect(trees.length).toBeLessThanOrEqual(50);
    expect(new Set(trees.map(p => p.scale)).size).toBeGreaterThan(20);
    expect(layout.filter(p => p.asset === 'gas-station')).toHaveLength(2);
    expect(layout.filter(p => p.asset === 'spectators')).toHaveLength(3);
  });
  it('keeps transformed model footprints behind existing rail collision faces', () => {
    const face = sunshineCircuit.definition.roadWidth / 2 + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2;
    for (const placement of sunshineAssetLayout(sunshineCircuit)) expect(placementClearance(sunshineCircuit, placement), placement.id).toBeGreaterThanOrEqual(face + 0.16);
  });
  it('does not add scenery or alter source definitions on other circuits', () => {
    for (const { track } of trackCatalog.slice(1)) expect(sunshineAssetLayout(track)).toEqual([]);
  });
  it('records real static capabilities, preserves credits, and budgets mesh/texture derivatives', async () => {
    expect(audit).toHaveLength(4);
    for (const source of audit) { expect(source.skins).toBe(0); expect(source.clips).toEqual([]); expect(source.metadata.extras.author).toBeTruthy(); }
    for (const asset of report) {
      const bytes = readFileSync(new URL(`../../../public/assets/optimized/environment/${asset.output}.glb`, import.meta.url));
      const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()) as { asset: unknown };
      expect(doc.asset).toEqual(audit.find(source => source.id === asset.source)!.metadata);
      expect(asset.images.every(image => image.width <= asset.textureCap && image.height <= asset.textureCap)).toBe(true);
    }
    expect(report.find(asset => asset.output === 'stylized-tree')!.afterTriangles).toBeLessThan(45000);
    expect(report.find(asset => asset.output === 'stylized-tree-far')!.afterTriangles).toBeLessThan(14000);
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
    expect(model.parts.length).toBeLessThanOrEqual(id === 'stylized-tree' ? 2 : 1);
    expect(prepareEnvironmentModel(loaded.scene, id)).toBe(model);
    expect(new Box3().setFromObject(loaded.scene).equals(before)).toBe(true);
    for (const part of model.parts) expect(sourceMeshes.some(mesh => mesh.geometry === part.geometry || mesh.material === part.material)).toBe(false);
    disposeEnvironmentModels();
  });
});
