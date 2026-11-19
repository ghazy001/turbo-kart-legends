import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { Box3, Group, Matrix4, Mesh, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { podiumConfig } from '../config/podiumConfig';
import { prepareTrophyModel } from '../render/models/trophyModel';

let source: Object3D;
beforeAll(async () => {
  const bytes = readFileSync(new URL(`../../../public${podiumConfig.trophy.url}`, import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  source = gltf.scene;
});
describe('supplied trophy integration', () => {
  it('grounds the actual model at unit height while preserving its proportions', () => {
    const original = new Box3().setFromObject(source, true).getSize(new Vector3()), model = prepareTrophyModel(source);
    const box = new Box3().setFromObject(model.root, true), size = box.getSize(new Vector3()), center = box.getCenter(new Vector3());
    expect(box.min.y).toBeCloseTo(0, 6); expect(size.y).toBeCloseTo(1, 6);
    expect(size.x / size.y).toBeCloseTo(original.x / original.y, 6);
    expect(size.z / size.y).toBeCloseTo(original.z / original.y, 6);
    expect(center.x).toBeCloseTo(0, 6); expect(center.z).toBeCloseTo(0, 6);
    model.dispose();
  });
  it('keeps scene transforms and material edits independent without copying geometry', () => {
    const before = new Box3().setFromObject(source, true).clone(), first = prepareTrophyModel(source), second = prepareTrophyModel(source);
    const originalMesh = source.getObjectByProperty('isMesh', true) as Mesh;
    const firstMesh = first.root.getObjectByName(originalMesh.name) as Mesh, secondMesh = second.root.getObjectByName(originalMesh.name) as Mesh;
    expect(firstMesh.geometry).toBe(originalMesh.geometry);
    expect(firstMesh.material).not.toBe(originalMesh.material); expect(firstMesh.material).not.toBe(secondMesh.material);
    first.root.position.x = 100; first.root.updateMatrixWorld(true);
    expect(new Box3().setFromObject(source, true).equals(before)).toBe(true);
    expect(new Box3().setFromObject(second.root, true).getCenter(new Vector3()).x).toBeCloseTo(0, 6);
    first.dispose(); second.dispose();
  });
  it.each(['podium', 'solo'] as const)('%s display clears the kart plinths throughout its small turn', mode => {
    const layout = podiumConfig.trophy[mode], model = prepareTrophyModel(source);
    const local = new Box3().setFromObject(model.root, true);
    for (const yaw of [podiumConfig.trophy.yaw - 0.08, podiumConfig.trophy.yaw, podiumConfig.trophy.yaw + 0.08]) {
      const box = local.clone().applyMatrix4(new Matrix4().makeScale(layout.height, layout.height, layout.height)).applyMatrix4(new Matrix4().makeRotationY(yaw));
      box.translate(new Vector3(...layout.position).add(new Vector3(0, podiumConfig.trophy.standHeight + 0.01, 0)));
      for (const place of mode === 'solo' ? [podiumConfig.places[0]] : podiumConfig.places) {
        // Reserve the full rectangular pedestal envelope, even above its actual top.
        const overlapsX = box.max.x > place.x - 1.97 && box.min.x < place.x + 1.97;
        const overlapsZ = box.max.z > -1.77 && box.min.z < 1.77;
        expect(overlapsX && overlapsZ).toBe(false);
        const nearestX = Math.max(place.x - 1.97, Math.min(place.x + 1.97, layout.position[0]));
        const nearestZ = Math.max(-1.77, Math.min(1.77, layout.position[2]));
        expect(Math.hypot(layout.position[0] - nearestX, layout.position[2] - nearestZ)).toBeGreaterThan(layout.standRadius + 0.035);
      }
    }
    model.dispose();
  });
  it('rejects an empty model so the visual boundary can provide a safe fallback', () => {
    expect(() => prepareTrophyModel(new Group())).toThrow('Trophy has no usable geometry.');
  });
});
