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

function PickupBatch({ geometry, material, transform, runtime }: { geometry?: BufferGeometry; material?: Material | Material[]; transform?: Matrix4; runtime: GameRuntime }) {
  const mesh = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => ({ matrix: new Matrix4(), rotation: new Matrix4(), frustum: new Frustum(), projection: new Matrix4(), sphere: new Sphere(new Vector3(), 1.5) }), []);
  useFrame(({ camera }) => {
    if (!mesh.current) return;
    scratch.frustum.setFromProjectionMatrix(scratch.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    let count = 0;
    for (const [index, pickup] of runtime.race.items.pickups.entries()) {
      if (pickup.respawn > 0) continue;
      const y = itemConfig.pickupHeight + Math.sin(runtime.race.items.time * 2.3 + index) * 0.1;
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
function CombatEffects({ runtime }: { runtime: GameRuntime }) {
  const recovery = useRef<InstancedMesh>(null);
  const trails = useRef<InstancedMesh>(null), rings = useRef<InstancedMesh>(null), shards = useRef<InstancedMesh>(null), warning = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => ({ matrix: new Matrix4(), rotation: new Matrix4(), scale: new Matrix4() }), []);
  useFrame(() => {
    const items = runtime.race.items;
    if (!trails.current || !rings.current || !shards.current || !warning.current || !recovery.current) return;
    for (const [index, bolt] of items.projectiles.entries()) {
      const heading = Math.atan2(bolt.dx, bolt.dz);
      scratch.matrix.makeTranslation(bolt.x - Math.sin(heading) * 0.65, bolt.y, bolt.z - Math.cos(heading) * 0.65).multiply(scratch.rotation.makeRotationY(heading));
      trails.current.setMatrixAt(index, scratch.matrix);
    }
    trails.current.count = items.projectiles.length;
    for (const [index, trap] of items.traps.entries()) {
      const size = itemConfig.trapRadius * (trap.armRemaining > 0 ? 0.9 + Math.sin(items.time * 16) * 0.1 : 1);
      scratch.matrix.makeTranslation(trap.x, 0.025, trap.z).multiply(scratch.rotation.makeRotationX(-Math.PI / 2)).multiply(scratch.scale.makeScale(size, size, 1));
      warning.current.setMatrixAt(index, scratch.matrix);
    }
    warning.current.count = items.traps.length;
    let ringCount = 0;
    for (let i = items.events.length - 1; i >= 0 && ringCount < 8; i--) {
      const event = items.events[i], age = items.time - event.time;
      if (!['hit', 'blocked', 'wall', 'pickup'].includes(event.kind) || age > 0.5) continue;
      const size = 0.2 + age * 4;
      scratch.matrix.makeTranslation(event.x, 0.12 + age, event.z).multiply(scratch.rotation.makeRotationX(-Math.PI / 2)).multiply(scratch.scale.makeScale(size, size, 1));
      rings.current.setMatrixAt(ringCount++, scratch.matrix);
    }
    rings.current.count = ringCount;
    let shardCount = 0;
    for (const racer of runtime.race.racers) {
      if (!(items.slot(racer.id)?.slowRemaining)) continue;
      const pose = racer.simulation.pose;
      for (let i = 0; i < 4; i++) {
        const angle = items.time * 8 + i * Math.PI / 2;
        scratch.matrix.makeTranslation(pose.x + Math.sin(angle) * 1.3, pose.y + 1.2 + Math.sin(angle * 2) * 0.15, pose.z + Math.cos(angle) * 1.3).multiply(scratch.rotation.makeRotationY(angle));
        shards.current.setMatrixAt(shardCount++, scratch.matrix);
      }
    }
    shards.current.count = shardCount;
    let recovering = 0;
    for (const racer of runtime.race.racers) {
      if ((items.slot(racer.id)?.immunity ?? 0) <= 0 || racer.progress.finishTime !== null) continue;
      const pose = racer.simulation.pose;
      scratch.matrix.makeTranslation(pose.x, pose.y + 0.12, pose.z).multiply(scratch.rotation.makeRotationX(-Math.PI / 2));
      recovery.current.setMatrixAt(recovering++, scratch.matrix);
    }
    recovery.current.count = recovering;
    for (const mesh of [trails.current, rings.current, shards.current, warning.current, recovery.current]) mesh.instanceMatrix.needsUpdate = true;
  });
  return <>
    <instancedMesh ref={recovery} args={[undefined, undefined, 4]} frustumCulled={false}><ringGeometry args={[1.4, 1.5, 24]} /><meshBasicMaterial color="#ffe6a3" transparent opacity={0.7} depthWrite={false} /></instancedMesh>
    <instancedMesh ref={warning} args={[undefined, undefined, itemConfig.maxTraps]} frustumCulled={false}><ringGeometry args={[0.85, 1, 24]} /><meshBasicMaterial color="#ffcf48" transparent opacity={0.7} depthWrite={false} /></instancedMesh>
    <instancedMesh ref={trails} args={[undefined, undefined, itemConfig.maxProjectiles]} frustumCulled={false}><boxGeometry args={[0.12, 0.12, 1.5]} /><meshBasicMaterial color="#58e9ed" /></instancedMesh>
    <instancedMesh ref={rings} args={[undefined, undefined, 8]} frustumCulled={false}><ringGeometry args={[0.83, 1, 24]} /><meshBasicMaterial color="#ffd56b" transparent opacity={0.65} depthWrite={false} /></instancedMesh>
    <instancedMesh ref={shards} args={[undefined, undefined, 16]} frustumCulled={false}><octahedronGeometry args={[0.15]} /><meshBasicMaterial color="#ffd56b" /></instancedMesh>
  </>;
}
export function ItemVisuals({ runtime }: { runtime: GameRuntime }) {
  const group = useRef<import('three').Group>(null);
  useFrame(() => { if (group.current) group.current.visible = runtime.race.items.enabled && runtime.race.phase !== 'finished'; });
  if (!runtime.race.items.enabled) return null;
  const fallback = <PickupBatch runtime={runtime} />;
  return <group ref={group} name="race-items"><PickupBoundary fallback={fallback}><Suspense fallback={fallback}><ImportedPickups runtime={runtime} /></Suspense></PickupBoundary><CombatModels runtime={runtime} /><CombatEffects runtime={runtime} /><BubbleGuardVisuals runtime={runtime} /></group>;
}
