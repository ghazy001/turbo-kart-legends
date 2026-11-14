import { Component, Suspense, useMemo, useRef, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Frustum, Matrix4, Sphere, Vector3, type BufferGeometry, type InstancedMesh, type Material } from 'three';
import { combatAssets, itemConfig, type CombatModelId } from '../config/itemConfig';
import type { GameRuntime } from './runtime';
import { configureAssetLoader } from './models/assetLoader';
import { combatModelParts } from './models/itemModel';

function CombatBatch({ runtime, kind, geometry, material, transform }: { runtime: GameRuntime; kind: CombatModelId; geometry?: BufferGeometry; material?: Material | Material[]; transform?: Matrix4 }) {
  const mesh = useRef<InstancedMesh>(null), trap = kind === 'banana-trap';
  const scratch = useMemo(() => ({ matrix: new Matrix4(), rotation: new Matrix4(), spin: new Matrix4(), frustum: new Frustum(), projection: new Matrix4(), sphere: new Sphere(new Vector3(), 1) }), []);
  useFrame(({ camera }) => {
    if (!mesh.current) return;
    const items = runtime.race.items;
    scratch.frustum.setFromProjectionMatrix(scratch.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    let count = 0;
    if (trap) for (const hazard of items.traps) {
      scratch.sphere.center.set(hazard.x, 0.4, hazard.z);
      if (!scratch.frustum.intersectsSphere(scratch.sphere)) continue;
      scratch.matrix.makeTranslation(hazard.x, geometry ? 0.03 : 0.35, hazard.z).multiply(scratch.rotation.makeRotationY(hazard.heading));
      if (transform) scratch.matrix.multiply(transform);
      mesh.current.setMatrixAt(count++, scratch.matrix);
    } else for (const bolt of items.projectiles) {
      scratch.sphere.center.set(bolt.x, bolt.y, bolt.z);
      if (!scratch.frustum.intersectsSphere(scratch.sphere)) continue;
      scratch.matrix.makeTranslation(bolt.x, bolt.y, bolt.z).multiply(scratch.rotation.makeRotationY(Math.atan2(bolt.dx, bolt.dz))).multiply(scratch.spin.makeRotationX(items.time * 10));
      if (transform) scratch.matrix.multiply(transform);
      mesh.current.setMatrixAt(count++, scratch.matrix);
    }
    mesh.current.count = count; mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geometry, material, trap ? itemConfig.maxTraps : itemConfig.maxProjectiles]} frustumCulled={false} dispose={geometry ? null : undefined}>
    {!geometry && (trap ? <coneGeometry args={[0.5, 0.65, 3]} /> : <sphereGeometry args={[itemConfig.projectileRadius, 12, 8]} />)}
    {!material && <meshStandardMaterial color={trap ? '#ffdc5c' : '#65e3ed'} emissive={trap ? '#564008' : '#174a59'} roughness={0.45} />}
  </instancedMesh>;
}
function ImportedCombatModel({ runtime, kind }: { runtime: GameRuntime; kind: CombatModelId }) {
  const gltf = useGLTF(combatAssets[kind].url, false, false, configureAssetLoader);
  const parts = useMemo(() => combatModelParts(gltf.scene, kind), [gltf.scene, kind]);
  return <>{parts.map((part, index) => <CombatBatch key={index} runtime={runtime} kind={kind} {...part} />)}</>;
}
class CombatModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.warn('Combat model unavailable; using its procedural fallback.', error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function CombatModels({ runtime }: { runtime: GameRuntime }) {
  return <>{(['spark-bolt', 'banana-trap'] as const).map(kind => {
    const fallback = <CombatBatch runtime={runtime} kind={kind} />;
    return <CombatModelBoundary key={kind} fallback={fallback}><Suspense fallback={fallback}><ImportedCombatModel runtime={runtime} kind={kind} /></Suspense></CombatModelBoundary>;
  })}</>;
}
