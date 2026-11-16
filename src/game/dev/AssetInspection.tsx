import environmentAudit from '../../../docs/assets/environment-audit.json';
import { Component, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Box3, Vector3, Mesh, PCFShadowMap } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import audit from '../../../docs/assets/asset-audit.json';
import { configureAssetLoader } from '../render/models/assetLoader';
import './assetPreview.css';

class InspectionBoundary extends Component<{ children: ReactNode; onError: (message: string) => void }, { failed: boolean }> {
  state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onError(error.message); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Model({ url, onReady }: { url: string; onReady: () => void }) {
  const { scene } = useGLTF(url, false, false, configureAssetLoader);
  const model = useMemo(() => {
    const instance = clone(scene); instance.updateMatrixWorld(true);
    instance.traverse(node => { if (node instanceof Mesh) { node.castShadow = true; node.receiveShadow = true; } });
    const bounds = new Box3().setFromObject(instance, true); const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3()); const scale = 3 / Math.max(size.x, size.y, size.z);
    return { instance, scale, position: [-center.x * scale, -bounds.min.y * scale, -center.z * scale] as [number, number, number] };
  }, [scene]);
  useEffect(onReady, [onReady]);
  return <primitive object={model.instance} scale={model.scale} position={model.position} dispose={null} />;
}
export function AssetInspection() {
  const ready = useCallback(() => setError('Model ready'), []);
  const files = [...audit.filter(asset => asset.category !== 'ignored' && !asset.path.startsWith('assets/environment/')), ...environmentAudit.map(asset => ({ path: `assets/environment/${asset.id}.glb`, category: 'environment', triangles: asset.meshes.reduce((sum, mesh) => sum + mesh.triangles, 0), skins: Array.from({ length: asset.skins }), clips: asset.clips, requiredExtensions: asset.extensions, min: asset.min, max: asset.max }))];
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0); const asset = files[index];
  return <main className="asset-preview"><aside><a href="/">← Game</a><h1>Source model inspection</h1>
    <label>Source file<select aria-label="Source asset" value={index} onChange={event => { setError(''); setIndex(Number(event.currentTarget.value)); }}>{files.map((file, i) => <option key={file.path} value={i}>{file.path.split('/').pop()}</option>)}</select></label>
    <p>{asset.category} • {asset.triangles?.toLocaleString()} triangles • {asset.skins?.length} skins • {asset.clips?.length} clips</p>
    <p>{asset.requiredExtensions?.join(', ') || 'Standard metallic/roughness materials'}</p>
    <p role="status">{error || 'Read-only source inspection'}</p><p>Drag to orbit; scroll to zoom. Normalized for inspection only.</p><pre>{JSON.stringify({ bounds: [asset.min, asset.max], skins: asset.skins, clips: asset.clips }, null, 2)}</pre>
  </aside><section><Canvas frameloop="demand" shadows={{ type: PCFShadowMap }} camera={{ position: [4, 3, 5], fov: 42 }} dpr={[1, 1.25]}>
    <color attach="background" args={['#d7e8e5']} /><hemisphereLight args={['#fff9e8', '#6c897d', 2.1]} /><directionalLight position={[-3, 7, 5]} intensity={2.6} castShadow />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#b2c7b4" /></mesh>
    <InspectionBoundary key={asset.path} onError={setError}><Suspense fallback={null}><Model url={`/${asset.path}`} onReady={ready} /></Suspense></InspectionBoundary><OrbitControls target={[0, 1, 0]} />
  </Canvas></section></main>;
}
