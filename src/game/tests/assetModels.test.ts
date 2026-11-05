import { readFileSync } from 'node:fs';
import { Box3, Group, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it, vi } from 'vitest';
import { defaultDriver, defaultKart } from '../config/visualAssets';
import { kartConfig } from '../config/kartConfig';
import { prepareModel } from '../render/models/prepareModel';
import { fitStaticDriverVertex } from '../render/models/staticDriverPose';

interface GLBDocument {
  materials: { pbrMetallicRoughness?: { baseColorTexture?: unknown } }[];
  images?: { bufferView: number; mimeType: string }[];
  textures?: unknown[];
  skins?: unknown[];
  animations?: unknown[];
}

/** Geometry-only Node inspection of the real assets. Browser QA loads all textures.
 * Repack the JSON chunk, retaining the original embedded binary geometry buffer.
 */
async function loadGeometry(url: string) {
  const file = readFileSync(new URL(`../../../public${url}`, import.meta.url));
  const length = file.readUInt32LE(12);
  const document = JSON.parse(file.subarray(20, 20 + length).toString()) as GLBDocument;
  const metadata = { skins: document.skins?.length ?? 0, clips: document.animations?.length ?? 0, images: document.images?.length ?? 0 };
  delete document.images; delete document.textures;
  for (const material of document.materials) if (material.pbrMetallicRoughness) delete material.pbrMetallicRoughness.baseColorTexture;
  const json = Buffer.from(JSON.stringify(document));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const binChunk = file.subarray(20 + length);
  const glb = Buffer.alloc(20 + padded.length + binChunk.length);
  file.copy(glb, 0, 0, 20); glb.writeUInt32LE(glb.length, 8); glb.writeUInt32LE(padded.length, 12);
  padded.copy(glb, 20); binChunk.copy(glb, 20 + padded.length);
  return { ...await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), ''), metadata };
}

const kart = await loadGeometry(defaultKart.url);
const driver = await loadGeometry(defaultDriver.url);

function transformed(root: Group, transform: typeof defaultKart.transform) {
  const group = new Group(); group.position.set(...transform.position); group.rotation.set(...transform.rotation); group.scale.setScalar(transform.scale); group.add(root); group.updateMatrixWorld(true); return group;
}

describe('supplied GLB fitting', () => {
  it('records the actual asset capabilities without inventing animation clips', () => {
    expect(kart.metadata).toEqual({ skins: 0, clips: 0, images: 1 });
    expect(driver.metadata).toEqual({ skins: 0, clips: 0, images: 8 });
  });

  it('bakes the exporter axes and builds four centered wheel pivots without mutating the cached scene', () => {
    const before = new Box3().setFromObject(kart.scene);
    const model = prepareModel(kart.scene, { wheels: defaultKart.wheels });
    expect(model.wheels).toHaveLength(4);
    expect(model.wheels.filter(wheel => wheel.front)).toHaveLength(2);
    for (const wheel of model.wheels) {
      const mesh = wheel.spin.children[0] as Mesh;
      expect(mesh.geometry.boundingBox?.getCenter(new Vector3()).length()).toBeLessThan(1e-6);
      expect(wheel.steer.position.z > 0).toBe(wheel.front);
      const original = kart.scene.getObjectByName(mesh.name) as Mesh;
      expect(mesh.geometry).not.toBe(original.geometry);
      expect(mesh.material).toBe(original.material);
    }
    const after = new Box3().setFromObject(kart.scene);
    expect(after.equals(before)).toBe(true);
    expect(new Box3().setFromObject(model.root).min.distanceTo(before.min)).toBeLessThan(1e-6);
    const dispose = vi.spyOn((model.wheels[0].spin.children[0] as Mesh).geometry, 'dispose');
    model.dispose(); expect(dispose).toHaveBeenCalledOnce();
    const original = kart.scene.getObjectByName(defaultKart.wheels[0].node) as Mesh;
    expect(original.castShadow).toBe(false);
  });

  it('fits every kart vertex inside the unchanged planar collider and places tire bottoms on the road', () => {
    const model = prepareModel(kart.scene, { wheels: defaultKart.wheels });
    const assembly = transformed(model.root, defaultKart.transform);
    const point = new Vector3(); let radius = 0;
    assembly.traverse(node => { if (node instanceof Mesh) {
      const positions = node.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld);
        radius = Math.max(radius, Math.hypot(point.x, point.z));
      }
    } });
    expect(radius).toBeLessThan(kartConfig.collisionRadius);
    expect(new Box3().setFromObject(assembly).min.y).toBeCloseTo(0, 3);
    model.dispose();
  });

  it('retains the cached standing model while fitting legs above the floor and arms within the cockpit', () => {
    const before = new Box3().setFromObject(driver.scene);
    const model = prepareModel(driver.scene, { staticDriver: true });
    const mount = transformed(model.root, defaultDriver.transform);
    const seat = transformed(mount, defaultKart.seat);
    const bounds = new Box3().setFromObject(seat);
    expect(bounds.min.y).toBeGreaterThan(0.1);
    expect(bounds.max.y).toBeLessThan(2);
    expect(bounds.max.x - bounds.min.x).toBeLessThan(1);
    expect(new Box3().setFromObject(driver.scene).equals(before)).toBe(true);
    expect(before.max.x - before.min.x).toBeGreaterThan(7);
    const hand = fitStaticDriverVertex(new Vector3(3.4, 4.05, 0.05), 'Object_4').multiplyScalar(defaultDriver.transform.scale).add(new Vector3(...defaultKart.seat.position));
    expect(hand.x).toBeGreaterThan(0.1); expect(hand.x).toBeLessThan(0.35);
    expect(hand.y).toBeGreaterThan(0.8); expect(hand.y).toBeLessThan(1.1);
    expect(hand.z).toBeGreaterThan(0.15); expect(hand.z).toBeLessThan(0.4);
    model.dispose();
  });

  it('keeps authored driver hierarchies intact and gives each instance independent transforms', () => {
    const first = prepareModel(driver.scene); const second = prepareModel(driver.scene);
    first.root.rotation.y = 1; first.root.position.y = 3;
    expect(second.root.rotation.y).toBe(0); expect(second.root.position.y).toBe(0);
    expect(first.root.children[0].children).toHaveLength(driver.scene.children.length);
    expect(first.root.getObjectByName('Object_4')).not.toBe(second.root.getObjectByName('Object_4'));
    first.dispose(); second.dispose();
  });
});
