import { Box3, BufferAttribute, Group, Mesh, SkinnedMesh, Vector3, type BufferGeometry, type Object3D } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { fitStaticMeshes } from './staticCockpitFit';
import type { RigSeatDefinition, StaticPoseDefinition, WheelDefinition } from '../../config/visualAssets';
import { applyRigSeatPose } from './rigSeatPose';

export interface WheelRig { steer: Group; spin: Group; front: boolean }
export interface PreparedModel { root: Group; wheels: WheelRig[]; dispose: () => void; releaseUnusedGeometry: () => void }
export interface ModelOptions { surface?: 'racer-matte'; staticDriver?: boolean; handTarget?: [number, number, number]; footFloor?: number; hiddenNodes?: readonly string[]; staticPose?: StaticPoseDefinition; rigSeat?: RigSeatDefinition; wheels?: readonly WheelDefinition[] }

/** Split a joined left/right tire pair without cutting triangles or changing source buffers. */
function wheelSide(source: BufferGeometry, side: -1 | 1): BufferGeometry {
  const flat = source.index ? source.toNonIndexed() : source.clone();
  const position = flat.getAttribute('position'); const selected: number[] = [];
  for (let i = 0; i < position.count; i += 3) {
    const x = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
    if (Math.sign(x) === side) selected.push(i, i + 1, i + 2);
  }
  const geometry = flat.clone(); geometry.clearGroups();
  for (const [name, attribute] of Object.entries(flat.attributes)) {
    const values = new Float32Array(selected.length * attribute.itemSize);
    selected.forEach((vertex, i) => { for (let c = 0; c < attribute.itemSize; c++) values[i * attribute.itemSize + c] = attribute.getComponent(vertex, c); });
    geometry.setAttribute(name, new BufferAttribute(values, attribute.itemSize, attribute.normalized));
  }
  flat.dispose(); return geometry;
}
/** Preserve skeletons and the cached GLTF. Bake only static meshes that need fitting/pivots. */
export function prepareModel(source: Object3D, options: ModelOptions = {}): PreparedModel {
  const root = new Group(), instance = clone(source);
  if (options.rigSeat) applyRigSeatPose(instance, options.rigSeat, options.handTarget ?? [0.2, 0.55, 0.35], options.footFloor);
  for (const name of options.hiddenNodes ?? []) instance.getObjectByName(name)?.removeFromParent(); const wheels: WheelRig[] = [], owned: BufferGeometry[] = [];
  instance.traverse(node => { if (node instanceof Mesh) { node.castShadow = true; node.receiveShadow = true; } });
  if (!options.staticDriver && !options.staticPose && !options.wheels?.length) root.add(instance);
  else {
    instance.updateMatrixWorld(true); const meshes: Mesh[] = [];
    instance.traverse(node => { if (node instanceof Mesh) meshes.push(node); });
    const bakedMeshes = new Map(meshes.filter(mesh => !(mesh instanceof SkinnedMesh)).map(mesh => [mesh, mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)]));
    owned.push(...bakedMeshes.values());
    fitStaticMeshes(bakedMeshes, options);
    const parts = new Map<WheelDefinition, Mesh[]>();
    for (const mesh of meshes) {
      if (mesh instanceof SkinnedMesh) continue; // Keep joints, inverse binds and hierarchy intact.
      const baked = bakedMeshes.get(mesh)!;
      const definitions = options.wheels?.filter(item => (item.nodes ?? [item.node]).includes(mesh.name)) ?? [];
      if (definitions.length) for (const definition of definitions) {
        const geometry = definition.side ? wheelSide(baked, definition.side) : baked;
        if (definition.side) owned.push(geometry);
        const visual = new Mesh(geometry, mesh.material); visual.name = mesh.name; visual.castShadow = true; visual.receiveShadow = true;
        const list = parts.get(definition) ?? []; list.push(visual); parts.set(definition, list);
      } else {
        const visual = new Mesh(baked, mesh.material); visual.name = mesh.name; visual.castShadow = true; visual.receiveShadow = true; root.add(visual);
      }
      mesh.removeFromParent();
    }
    // Empty exporter groups are harmless; skinned meshes retain their original parents.
    root.add(instance);
    for (const [definition, visuals] of parts) {
      const bounds = new Box3();
      for (const visual of visuals) { visual.geometry.computeBoundingBox(); if (visual.geometry.boundingBox) bounds.union(visual.geometry.boundingBox); }
      const center = bounds.getCenter(new Vector3()), steer = new Group(), spin = new Group();
      steer.name = `steer:${definition.node}:${definition.side ?? 0}`; spin.name = `spin:${definition.node}:${definition.side ?? 0}`;
      steer.position.copy(center); steer.add(spin); root.add(steer);
      for (const visual of visuals) { visual.geometry.translate(-center.x, -center.y, -center.z); spin.add(visual); }
      wheels.push({ steer, spin, front: definition.front });
    }
    root.traverse(node => { if (node instanceof Mesh && !(node instanceof SkinnedMesh)) { node.geometry.computeBoundingBox(); node.geometry.computeBoundingSphere(); } });
  }
  const releaseUnusedGeometry = () => {
    const live = new Set<BufferGeometry>();
    root.traverse(node => { if (node instanceof Mesh) live.add(node.geometry); });
    for (let i = owned.length - 1; i >= 0; i--) if (!live.has(owned[i])) { owned[i].dispose(); owned.splice(i, 1); }
  };
  releaseUnusedGeometry();
  return { root, wheels, dispose: () => owned.forEach(geometry => geometry.dispose()), releaseUnusedGeometry };
}
