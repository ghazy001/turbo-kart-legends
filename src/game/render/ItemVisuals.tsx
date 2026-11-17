import { Component, Suspense, useMemo, useRef, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, Frustum, InstancedMesh, Matrix4, Mesh, Sphere, Vector3, type BufferGeometry, type Material } from 'three';
import { itemBoxAsset, itemConfig } from '../config/itemConfig';
import type { GameRuntime } from './runtime';
import { configureAssetLoader } from './models/assetLoader';
import { instantiateModel } from './models/modelInstances';
import { CombatModels } from './CombatModels';
import { BubbleGuardVisuals } from './BubbleGuardVisuals';
import { CombatEffects } from './CombatEffects';
import { AbilityBursts } from './AbilityBursts';

function PickupBatch({ geometry, material, transform, runtime }: { geometry?: BufferGeometry; material?: Material | Material[]; transform?: Matrix4; runtime: GameRuntime }) {
  const mesh = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => ({ matrix: new Matrix4(), rotation: new Matrix4(), frustum: new Frustum(), projection: new Matrix4(), sphere: new Sphere(new Vector3(), 1.5) }), []);
  useFrame(({ camera }) => {
    if (!mesh.current) return;
    scratch.frustum.setFromProjectionMatrix(scratch.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    let count = 0;
    for (const [index, pickup] of runtime.race.items.pickups.entries()) {
      if (pickup.respawn > 0) continue;
      const y = (pickup.ground ?? 0) + itemConfig.pickupHeight + Math.sin(runtime.race.items.time * 2.3 + index) * 0.1;
      scratch.sphere.center.set(pickup.x, y, pickup.z);
      if (!scratch.frustum.intersectsSphere(scratch.sphere)) continue;
      scratch.matrix.makeTranslation(pickup.x, y, pickup.z).multiply(scratch.rotation.makeRotationY(runtime.race.items.time * 0.75 + index * 0.4));
      if (transform) scratch.matrix.multiply(transform);
      mesh.current.setMatrixAt(count++, scratch.matrix);
    }
    mesh.current.count = count; mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geometry, material, 9]} frustumCulled={false} dispose={geometry ? null : undefined}>
    {!geometry && <octahedronGeometry args={[0.65]} />}{!material && <meshStandardMaterial color="#51d5d8" emissive="#176c78" roughness={0.3} />}
  </instancedMesh>;
}
function ImportedPickups({ runtime }: { runtime: GameRuntime }) {
  const gltf = useGLTF(itemBoxAsset.url, false, false, configureAssetLoader);
  const parts = useMemo(() => {
    const model = instantiateModel(gltf.scene, 'item-box', {}); model.root.updateMatrixWorld(true);
    const core = model.root.getObjectByName('translucent_cube_body_1') ?? model.root;
    const box = new Box3().setFromObject(core, true), center = box.getCenter(new Vector3()), size = box.getSize(new Vector3());
    const scale = itemBoxAsset.width / Math.max(size.x, size.y, size.z);
    const normalize = new Matrix4().makeScale(scale, scale, scale).multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z));
    const meshes: { geometry: BufferGeometry; material: Material | Material[]; transform: Matrix4 }[] = [];
    model.root.traverse(node => { if (node instanceof Mesh) meshes.push({ geometry: node.geometry, material: node.material, transform: normalize.clone().multiply(node.matrixWorld) }); });
    return meshes;
  }, [gltf.scene]);
  return <>{parts.map((part, index) => <PickupBatch key={index} {...part} runtime={runtime} />)}</>;
}
class PickupBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.warn('Pickup model unavailable; using the procedural pickup.', error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function ItemVisuals({ runtime }: { runtime: GameRuntime }) {
  const group = useRef<import('three').Group>(null);
  useFrame(() => { if (group.current) group.current.visible = runtime.race.items.enabled && runtime.race.phase !== 'finished'; });
  if (!runtime.race.items.enabled) return null;
  const fallback = <PickupBatch runtime={runtime} />;
  return <group ref={group} name="race-items"><PickupBoundary fallback={fallback}><Suspense fallback={fallback}><ImportedPickups runtime={runtime} /></Suspense></PickupBoundary><CombatModels runtime={runtime} /><CombatEffects runtime={runtime} /><AbilityBursts runtime={runtime} /><BubbleGuardVisuals runtime={runtime} /></group>;
}
