import { Group, Mesh, Vector3, type BufferGeometry, type Object3D } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { fitStaticDriverVertex } from './staticDriverPose';
import type { WheelDefinition } from '../../config/visualAssets';

export interface WheelRig { steer: Group; spin: Group; front: boolean }
export interface PreparedModel { root: Group; wheels: WheelRig[]; dispose: () => void }

/** Clone cached glTF scenes: callers never reparent or deform useGLTF's shared scene.
 * Authored drivers retain their hierarchy and skeleton for future animation clips.
 * Static fitting/baked wheel pivots own ONLY their cloned geometry, not GLTF textures.
 */
export function prepareModel(source: Object3D, options: {
  staticDriver?: boolean; wheels?: readonly WheelDefinition[];
} = {}): PreparedModel {
  const root = new Group();
  const wheels: WheelRig[] = [];
  const ownedGeometry: BufferGeometry[] = [];
  const instance = clone(source);
  instance.traverse(node => { if (node instanceof Mesh) { node.castShadow = true; node.receiveShadow = true; } });
  if (!options.staticDriver && !options.wheels?.length) {
    root.add(instance);
  } else {
    instance.updateMatrixWorld(true);
    const meshes: Mesh[] = [];
    instance.traverse(node => { if (node instanceof Mesh) meshes.push(node); });
    for (const mesh of meshes) {
      const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      ownedGeometry.push(geometry);
      const position = geometry.getAttribute('position');
      if (options.staticDriver) {
        const point = new Vector3();
        for (let i = 0; i < position.count; i++) {
          point.fromBufferAttribute(position, i);
          fitStaticDriverVertex(point, mesh.name);
          position.setXYZ(i, point.x, point.y, point.z);
        }
        position.needsUpdate = true;
        geometry.computeVertexNormals();
      }
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const visual = new Mesh(geometry, mesh.material);
      visual.name = mesh.name; visual.castShadow = true; visual.receiveShadow = true;
      const wheel = options.wheels?.find(item => item.node === mesh.name);
      if (wheel) {
        const center = geometry.boundingBox?.getCenter(new Vector3()) ?? new Vector3();
        geometry.translate(-center.x, -center.y, -center.z);
        const steer = new Group(); const spin = new Group();
        steer.position.copy(center); steer.add(spin); spin.add(visual); root.add(steer);
        wheels.push({ steer, spin, front: wheel.front });
      } else root.add(visual);
    }
  }
  return { root, wheels, dispose: () => ownedGeometry.forEach(geometry => geometry.dispose()) };
}
