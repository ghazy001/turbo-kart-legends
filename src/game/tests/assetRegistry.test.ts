import { readFileSync } from 'node:fs';
import { AnimationClip, Box3, Group, Mesh, NumberKeyframeTrack, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { driverAssets, karts, racers, unsupportedAssets } from '../config/visualAssets';
import { isVisualSelection, loadSelection, opponentSelections, saveSelection, selectionStorageKey } from '../config/visualSelection';
import { protectedPoseVertices } from '../render/models/poseRegions';
import { prepareModel } from '../render/models/prepareModel';
import { instantiateModel, disposeModelCache } from '../render/models/modelInstances';
import { adaptDiffuseLegacyMaterials } from '../render/models/assetLoader';
import { createDriverAnimator } from '../render/models/driverAnimation';
import { driverFitOptions } from '../render/models/driverFit';
import { kartConfig } from '../config/kartConfig';
import { RaceSession } from '../race/RaceSession';
import { sunshineCircuit } from '../tracks/sunshineCircuit';

function stripTextures(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripTextures);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !key.endsWith('Texture') && !['images', 'textures'].includes(key)).map(([key, child]) => [key, stripTextures(child)]));
  return value;
}
async function load(url: string) {
  const file = readFileSync(new URL(`../../../public${url}`, import.meta.url)), length = file.readUInt32LE(12);
  const doc = stripTextures(JSON.parse(file.subarray(20, 20 + length).toString())) as { materials: Parameters<typeof adaptDiffuseLegacyMaterials>[0]['materials']; animations?: unknown[]; extensionsRequired?: string[] };
  adaptDiffuseLegacyMaterials(doc); doc.extensionsRequired = doc.extensionsRequired?.filter(name => name !== 'KHR_materials_pbrSpecularGlossiness');
  const json = Buffer.from(JSON.stringify(doc)), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const binary = file.subarray(20 + length), output = Buffer.alloc(20 + padded.length + binary.length);
  file.copy(output, 0, 0, 20); output.writeUInt32LE(output.length, 8); output.writeUInt32LE(padded.length, 12); padded.copy(output, 20); binary.copy(output, 20 + padded.length);
  return new GLTFLoader().parseAsync(output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength), '');
}
const kartModels = await Promise.all(karts.map(asset => load(asset.url)));
const racerModels = await Promise.all(racers.map(asset => load(asset.url)));
function mounted(root: Group, transform: { position: [number, number, number]; rotation: [number, number, number]; scale: number }) {
  const group = new Group(); group.position.set(...transform.position); group.rotation.set(...transform.rotation); group.scale.setScalar(transform.scale); group.add(root); group.updateMatrixWorld(true); return group;
}

describe('Milestone 3.5 registry and real assets', () => {
  it('uses unique IDs, covers nine selectable sources, and records the three unsupported files', () => {
    const assets = [...karts, ...racers]; expect(new Set(assets.map(asset => asset.id)).size).toBe(9);
    expect(new Set(assets.map(asset => asset.url)).size).toBe(9); expect(unsupportedAssets).toHaveLength(3);
    for (const model of [...kartModels, ...racerModels]) expect(model.animations).toHaveLength(0);
    for (const racer of racers) expect(racer.clips).toBeUndefined();
    expect(readFileSync('public/assets/karts/kart_2.glb').equals(readFileSync('public/assets/karts/go_kart_64.glb'))).toBe(true);
  });
  for (const [index, kart] of karts.entries()) it(`${kart.id}: four usable wheels, road contact, original collider and source bounds preserved`, () => {
    const source = kartModels[index].scene, before = new Box3().setFromObject(source, true);
    const model = prepareModel(source, { wheels: kart.wheels });
    expect(model.wheels).toHaveLength(4); expect(model.wheels.filter(wheel => wheel.front)).toHaveLength(2);
    const group = mounted(model.root, kart.transform), bounds = new Box3().setFromObject(group, true);
    expect(bounds.min.y).toBeCloseTo(0, 3);
    const point = new Vector3(); let radius = 0;
    group.traverse(node => { if (node instanceof Mesh) {
      const positions = node.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) { node.getVertexPosition(i, point).applyMatrix4(node.matrixWorld); radius = Math.max(radius, Math.hypot(point.x, point.z)); }
    } });
    expect(radius).toBeLessThan(kartConfig.collisionRadius);
    for (const wheel of model.wheels) {
      const center = wheel.steer.getWorldPosition(new Vector3()); expect(center.z > 0).toBe(wheel.front);
      expect(Math.abs(center.x)).toBeGreaterThan(0.3);
    }
    expect(new Box3().setFromObject(source, true).equals(before)).toBe(true); model.dispose();
  });
  for (const [ki, kart] of karts.entries()) for (const [ri, racer] of racers.entries()) it(`${racer.id} + ${kart.id}: finite fitted bounds, no floor penetration, attachment follows parent motion`, () => {
    const source = racerModels[ri].scene, before = new Box3().setFromObject(source, true);
    const model = prepareModel(source, driverFitOptions(kart, racer));
    const driver = mounted(model.root, racer.transform), seat = mounted(driver, kart.seat), motion = new Group(); motion.add(seat); motion.updateMatrixWorld(true);
    const box = new Box3().setFromObject(motion, true);
    expect(box.min.y, `${racer.id}/${kart.id} feet`).toBeGreaterThan(0);
    expect(box.max.y).toBeLessThan(2.3); expect(box.getSize(new Vector3()).x).toBeLessThan(1.5);
    const local = driver.getWorldPosition(new Vector3()); motion.position.set(11, 2, -8); motion.rotation.set(0, 1.1, 0.12); motion.scale.y = 0.9; motion.updateMatrixWorld(true);
    expect(driver.getWorldPosition(new Vector3()).distanceTo(motion.localToWorld(local))).toBeLessThan(1e-5);
    expect(new Box3().setFromObject(source, true).equals(before)).toBe(true); expect(kartModels[ki].scene).toBeDefined(); model.dispose();
  });
  it('preserves complete Arnold head/neck islands while actually bending separate arms', () => {
    const index = racers.findIndex(driver => driver.id === 'arnold'), source = racerModels[index].scene;
    source.updateMatrixWorld(true);
    const mesh = source.getObjectByName('Object_3') as Mesh;
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld), protectedVertices = protectedPoseVertices(geometry, 1.29);
    const driver = racers[index], model = prepareModel(source, driverFitOptions(karts[3], driver));
    const fitted = (model.root.getObjectByName('Object_3') as Mesh).geometry.getAttribute('position');
    const positions = geometry.getAttribute('position'); let error = 0, unchanged = 0, moved = 0;
    for (let i = 0; i < positions.count; i++) {
      const distance = Math.hypot(fitted.getX(i) - positions.getX(i), fitted.getY(i) + driver.staticPose!.hip - positions.getY(i), fitted.getZ(i) - positions.getZ(i));
      if (protectedVertices[i]) { error = Math.max(error, distance); unchanged++; }
      else if (positions.getY(i) > 1 && Math.abs(positions.getX(i)) > 0.4 && distance > 0.1) moved++;
    }
    expect(unchanged).toBeGreaterThan(1000); expect(error).toBeLessThan(1e-6); expect(moved).toBeGreaterThan(100);
    geometry.dispose(); model.dispose();
  });
  it('clones bone hierarchies and wheel pivots independently, sharing immutable fitted buffers', () => {
    const kart = karts.findIndex(asset => asset.id === 'boat'), source = kartModels[kart].scene;
    const first = instantiateModel(source, 'test-boat', { wheels: karts[kart].wheels }), second = instantiateModel(source, 'test-boat', { wheels: karts[kart].wheels });
    const a: SkinnedMesh[] = [], b: SkinnedMesh[] = [];
    first.root.traverse(node => { if (node instanceof SkinnedMesh) a.push(node); }); second.root.traverse(node => { if (node instanceof SkinnedMesh) b.push(node); });
    expect(a.length).toBeGreaterThan(0); expect(a[0].skeleton).not.toBe(b[0].skeleton); expect(a[0].skeleton.bones[0]).not.toBe(b[0].skeleton.bones[0]);
    first.wheels[0].spin.rotation.x = 2; expect(second.wheels[0].spin.rotation.x).toBeCloseTo(0);
    expect((first.wheels[0].spin.children[0] as Mesh).geometry).toBe((second.wheels[0].spin.children[0] as Mesh).geometry);
    disposeModelCache();
  });
});

describe('cosmetic selection and animation contracts', () => {
  it('rejects unknown/prototype IDs and corrupt or version-incompatible saved selection', () => {
    const port = { getItem: () => '{broken', setItem: () => undefined };
    expect(loadSelection(port)).toEqual({ kartId: 'practice', racerId: 'supplied' });
    expect(isVisualSelection({ kartId: '__proto__', racerId: 'aang' })).toBe(false);
    expect(loadSelection({ ...port, getItem: () => JSON.stringify({ version: 99, selection: { kartId: 'boat', racerId: 'aang' } }) })).toEqual(loadSelection(port));
  });
  it('round-trips valid selection and survives browser storage denial', () => {
    const data = new Map<string, string>(), storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    const selection = { kartId: 'boat', racerId: 'crash' } as const;
    expect(saveSelection(selection, storage)).toBe(true); expect(data.has(selectionStorageKey)).toBe(true); expect(loadSelection(storage)).toEqual(selection);
    const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(saveSelection(selection, denied)).toBe(false); expect(loadSelection(denied).kartId).toBe('practice');
  });
  it('assigns three distinct AI appearances for every player combo without changing a running race', () => {
    const race = new RaceSession(sunshineCircuit); race.start('quick-race'); const revision = race.revision, simulations = race.racers.map(racer => racer.simulation);
    for (const kart of karts) for (const racer of racers) {
      const opponents = opponentSelections({ kartId: kart.id as keyof typeof import('../config/visualAssets').kartAssets, racerId: racer.id as keyof typeof driverAssets });
      expect(new Set(opponents.map(choice => choice.racerId)).size).toBe(3); expect(new Set(opponents.map(choice => choice.kartId)).size).toBe(3);
      expect(opponents.some(choice => choice.racerId === racer.id || choice.kartId === kart.id)).toBe(false);
    }
    expect(race.revision).toBe(revision); expect(race.racers.map(racer => racer.simulation)).toEqual(simulations);
  });
  it('plays only explicitly mapped clips, freezes on pause and isolates animation mixers', () => {
    const root = new Group(); root.name = 'driver'; const other = root.clone();
    const clip = new AnimationClip('seated-idle', 1, [new NumberKeyframeTrack('.position[y]', [0, 1], [0, 1])]);
    const first = createDriverAnimator(root, [clip], { idle: 'seated-idle', victory: 'missing' }), second = createDriverAnimator(other, [clip], { idle: 'seated-idle' });
    const signal = { steering: 0, driftDirection: 0, victory: false, paused: false };
    expect(first.supported).toEqual(['idle']); for (let i = 0; i < 10; i++) first.update(0.05, signal);
    expect(root.position.y).toBeGreaterThan(0.3); expect(other.position.y).toBe(0);
    const y = root.position.y; first.update(1, { ...signal, paused: true }); expect(root.position.y).toBe(y);
    first.dispose(); second.dispose();
  });
  it('converts the exact zero-specular legacy material but refuses lossy complex conversion', () => {
    const material = { extensions: { KHR_materials_pbrSpecularGlossiness: { diffuseFactor: [1, 0.5, 0.2, 1], specularFactor: [0, 0, 0], glossinessFactor: 0 } } };
    adaptDiffuseLegacyMaterials({ materials: [material] }); expect(material.extensions).not.toHaveProperty('KHR_materials_pbrSpecularGlossiness'); expect(material).toHaveProperty('pbrMetallicRoughness.roughnessFactor', 1);
    expect(() => adaptDiffuseLegacyMaterials({ materials: [{ extensions: { KHR_materials_pbrSpecularGlossiness: { specularFactor: [1, 1, 1] } } }] })).toThrow('conversion');
  });
});
