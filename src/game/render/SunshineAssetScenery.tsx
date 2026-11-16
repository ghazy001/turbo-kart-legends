import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Color, Frustum, InstancedMesh, Matrix4, Object3D, Sphere, Vector3 } from 'three';
import { environmentAssets, environmentSize, type EnvironmentAssetId, type EnvironmentPlacement } from '../config/environmentAssets';
import { configureAssetLoader } from './models/assetLoader';
import { prepareEnvironmentModel, type EnvironmentPart } from './models/environmentModel';
import type { AssetStatusReporter } from './models/RaceAssetLoading';

function StaticBatch({ part, placements, id, far = false }: { part: EnvironmentPart; placements: EnvironmentPlacement[]; id: EnvironmentAssetId; far?: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => ({ color: new Color(), frustum: new Frustum(), projection: new Matrix4(), sphere: new Sphere(), last: new Vector3(Infinity, Infinity, Infinity), matrix: new Matrix4() }), []);
  const radius = useMemo(() => Math.hypot(...environmentSize(id)) / 2, [id]);
  const matrices = useMemo(() => placements.map(placement => {
    const object = new Object3D(); object.position.set(...placement.position); object.scale.setScalar(placement.scale); object.rotation.y = placement.yaw; object.updateMatrix();
    return object.matrix.clone();
  }), [placements]);
  useLayoutEffect(() => { if (mesh.current) mesh.current.count = 0; }, []);
  useFrame(({ camera }) => {
    if (!mesh.current) return;
    // View-dependent compaction: a stationary camera does no repeated matrix/instance uploads.
    scratch.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (scratch.last.distanceToSquared(camera.position) < 0.16 && scratch.matrix.equals(scratch.projection)) return;
    scratch.last.copy(camera.position); scratch.matrix.copy(scratch.projection); scratch.frustum.setFromProjectionMatrix(scratch.projection);
    const asset = environmentAssets[id];
    let count = 0;
    placements.forEach((placement, index) => {
      scratch.sphere.center.set(placement.position[0], placement.position[1] + asset.height * placement.scale / 2, placement.position[2]); scratch.sphere.radius = radius * placement.scale;
      const distance = camera.position.distanceTo(scratch.sphere.center);
      if (distance > asset.distance + scratch.sphere.radius || !scratch.frustum.intersectsSphere(scratch.sphere)) return;
      if (id === 'stylized-tree') {
        const near = environmentAssets['stylized-tree'].nearDistance;
        if (far ? distance < near : distance >= near) return;
      }
      mesh.current!.setMatrixAt(count, matrices[index]); mesh.current!.setColorAt(count++, scratch.color.set(placement.tint));
    });
    mesh.current.count = count; mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[part.geometry, part.material, placements.length]} frustumCulled={false} castShadow={!far} receiveShadow dispose={null} />;
}
function LoadedAsset({ id, placements, report, far = false }: { id: EnvironmentAssetId; placements: EnvironmentPlacement[]; report: AssetStatusReporter; far?: boolean }) {
  const definition = environmentAssets[id], url = far && 'farUrl' in definition ? definition.farUrl : definition.url;
  const gltf = useGLTF(url, false, false, configureAssetLoader);
  const model = useMemo(() => prepareEnvironmentModel(gltf.scene, id), [gltf.scene, id]);
  useEffect(() => { report('ready'); }, [report]);
  return <>{model.parts.map((part, index) => <StaticBatch key={index} part={part} placements={placements} id={id} far={far} />)}</>;
}
class SceneryBoundary extends Component<{ children: ReactNode; report: AssetStatusReporter; id: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.warn(`Scenery ${this.props.id} unavailable; leaving its off-road placement empty.`, error); this.props.report('error'); }
  render() { return this.state.failed ? null : this.props.children; }
}
export function SunshineAssetScenery({ placements, statusFor }: { placements: EnvironmentPlacement[]; statusFor: (id: string) => AssetStatusReporter }) {
  return <group name="sunshine-supplied-scenery">{(Object.keys(environmentAssets) as EnvironmentAssetId[]).flatMap(id => {
    const instances = placements.filter(placement => placement.asset === id);
    return (id === 'stylized-tree' ? [false, true] : [false]).map(far => {
      const key = `environment:${id}${far ? ':far' : ''}`, report = statusFor(key);
      return <SceneryBoundary key={key} id={key} report={report}><Suspense fallback={null}><LoadedAsset id={id} placements={instances} report={report} far={far} /></Suspense></SceneryBoundary>;
    });
  })}</group>;
}
export const sunshineAssetSlots = ['environment:stylized-tree', 'environment:stylized-tree:far', 'environment:gas-station', 'environment:spectators', 'environment:tire-wall'];
