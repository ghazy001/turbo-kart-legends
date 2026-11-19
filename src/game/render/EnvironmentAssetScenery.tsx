import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh } from 'three';
import { environmentAssets, type EnvironmentAssetId, type EnvironmentPlacement } from '../config/environmentAssets';
import { configureAssetLoader } from './models/assetLoader';
import { prepareEnvironmentModel, type EnvironmentPart } from './models/environmentModel';
import { SceneryVisibility } from './models/SceneryVisibility';
import type { AssetStatusReporter } from './models/RaceAssetLoading';

function StaticBatch({ part, visibility, far = false }: { part: EnvironmentPart; visibility: SceneryVisibility; far?: boolean }) {
  const mesh = useRef<InstancedMesh>(null), uploaded = useRef(-1);
  useLayoutEffect(() => {
    const instance = mesh.current;
    if (!instance) return;
    // Allocate the complete immutable instance/color buffers before shader warmup,
    // even when this batch starts outside the camera.
    visibility.matrices.forEach((matrix, index) => {
      instance.setMatrixAt(index, matrix); instance.setColorAt(index, visibility.colors[index]);
    });
    instance.instanceMatrix.needsUpdate = true;
    if (instance.instanceColor) instance.instanceColor.needsUpdate = true;
    instance.count = 0; uploaded.current = -1;
    // dispose={null} protects shared geometry/materials, but instance buffers are owned.
    return () => instance.dispose();
  }, [visibility, part.geometry, part.material]);
  useFrame(() => {
    if (!mesh.current || uploaded.current === visibility.version) return;
    for (let slot = 0; slot < visibility.indices.length; slot++) {
      const index = visibility.indices[slot];
      mesh.current.setMatrixAt(slot, visibility.matrices[index]); mesh.current.setColorAt(slot, visibility.colors[index]);
    }
    mesh.current.count = visibility.indices.length; mesh.current.visible = mesh.current.count > 0;
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    uploaded.current = visibility.version;
  });
  return <instancedMesh ref={mesh} args={[part.geometry, part.material, visibility.matrices.length]} frustumCulled={false} castShadow={!far} receiveShadow dispose={null} />;
}
function LoadedAsset({ id, placements, report, far = false }: { id: EnvironmentAssetId; placements: EnvironmentPlacement[]; report: AssetStatusReporter; far?: boolean }) {
  const definition = environmentAssets[id], url = far && 'farUrl' in definition ? definition.farUrl : definition.url;
  const gltf = useGLTF(url, false, false, configureAssetLoader);
  const model = useMemo(() => prepareEnvironmentModel(gltf.scene, id), [gltf.scene, id]);
  const visibility = useMemo(() => new SceneryVisibility(placements, id, far), [placements, id, far]);
  useFrame(({ camera }) => { camera.updateMatrixWorld(); visibility.update(camera); }, -0.5);
  useEffect(() => { report('ready'); }, [report]);
  return <>{model.parts.map((part, index) => <StaticBatch key={index} part={part} visibility={visibility} far={far} />)}</>;
}
class SceneryBoundary extends Component<{ children: ReactNode; report: AssetStatusReporter; id: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.warn(`Scenery ${this.props.id} unavailable; leaving its off-road placement empty.`, error); this.props.report('error'); }
  render() { return this.state.failed ? null : this.props.children; }
}
export function EnvironmentAssetScenery({ placements, statusFor, assetIds }: { placements: EnvironmentPlacement[]; assetIds: readonly EnvironmentAssetId[]; statusFor: (id: string) => AssetStatusReporter }) {
  const groups = useMemo(() => assetIds.map(id => ({ id, instances: placements.filter(placement => placement.asset === id) })), [placements, assetIds]);
  return <group name="supplied-environment-scenery">{groups.flatMap(({ id, instances }) => {
    return (id === 'stylized-tree' ? [false, true] : [false]).map(far => {
      const key = `environment:${id}${far ? ':far' : ''}`, report = statusFor(key);
      return <SceneryBoundary key={key} id={key} report={report}><Suspense fallback={null}><LoadedAsset id={id} placements={instances} report={report} far={far} /></Suspense></SceneryBoundary>;
    });
  })}</group>;
}
