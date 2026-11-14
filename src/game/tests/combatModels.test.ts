import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Box3, Mesh, Vector3, type BufferGeometry, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { afterAll, describe, expect, it } from 'vitest';
import { combatAssets, type CombatModelId } from '../config/itemConfig';
import { combatModelParts } from '../render/models/itemModel';
import { disposeModelCache } from '../render/models/modelInstances';

const sources: Object3D[] = [];
const geometryOnly = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(geometryOnly);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !key.endsWith('Texture') && !['images', 'textures'].includes(key)).map(([key, child]) => [key, geometryOnly(child)]));
  return value;
};
async function loadGeometry(url: string) {
  const bytes = readFileSync(new URL(`../../../public${url}`, import.meta.url));
  const length = bytes.readUInt32LE(12), document = JSON.parse(bytes.toString('utf8', 20, 20 + length)) as unknown;
  const json = Buffer.from(JSON.stringify(geometryOnly(document))), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const binary = bytes.subarray(20 + length), header = Buffer.from(bytes.subarray(0, 20)); header.writeUInt32LE(20 + padded.length + binary.length, 8); header.writeUInt32LE(padded.length, 12);
  const glb = Buffer.concat([header, padded, binary]);
  const loaded = await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '');
  sources.push(loaded.scene); return { loaded, hash: createHash('sha256').update(bytes).digest('hex') };
}
afterAll(() => {
  disposeModelCache();
  const geometries = new Set<BufferGeometry>();
  for (const source of sources) source.traverse(node => { if (node instanceof Mesh) { geometries.add(node.geometry); for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.dispose(); } });
  geometries.forEach(geometry => geometry.dispose());
});
describe('supplied combat model fitting', () => {
  for (const kind of Object.keys(combatAssets) as CombatModelId[]) it(`${kind}: real GLB fits its intended size/pivot without mutating source`, async () => {
    const asset = combatAssets[kind], { loaded } = await loadGeometry(asset.url);
    expect(loaded.animations).toHaveLength(0);
    const before = loaded.scene.toJSON(), parts = combatModelParts(loaded.scene, kind);
    const box = new Box3();
    for (const part of parts) { const mesh = new Mesh(part.geometry, part.material); mesh.applyMatrix4(part.transform); mesh.updateMatrixWorld(); box.union(new Box3().setFromObject(mesh, true)); }
    const size = box.getSize(new Vector3()); expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(asset.size, 5);
    expect(box.getCenter(new Vector3()).x).toBeCloseTo(0); expect(box.getCenter(new Vector3()).z).toBeCloseTo(0);
    expect(asset.grounded ? box.min.y : box.getCenter(new Vector3()).y).toBeCloseTo(0);
    const second = combatModelParts(loaded.scene, kind); parts[0].transform.makeTranslation(99, 99, 99);
    expect(second[0].transform.equals(parts[0].transform)).toBe(false); expect(loaded.scene.toJSON()).toEqual(before);
    if (kind === 'banana-trap') { expect(parts).toHaveLength(1); expect(loaded.scene.getObjectByName('Object_4')).toBeDefined(); }
  });
});
