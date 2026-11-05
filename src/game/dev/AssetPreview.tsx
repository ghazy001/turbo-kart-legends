import { Suspense, useLayoutEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Mesh, PCFShadowMap } from 'three';
import { defaultDriver, defaultKart, type Triple, type VisualTransform } from '../config/visualAssets';
import { KartAssembly } from '../render/KartAssembly';
import './assetPreview.css';

function RawModel({ url, scale, position }: { url: string; scale: number; position: Triple }) {
  const gltf = useGLTF(url, false, false);
  const instance = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.traverse(node => { if (node instanceof Mesh) { node.castShadow = true; node.receiveShadow = true; } });
    return scene;
  }, [gltf.scene]);
  return <primitive object={instance} scale={scale} position={position} dispose={null} />;
}
function TransformEditor({ title, value, onChange }: { title: string; value: VisualTransform; onChange: (next: VisualTransform) => void }) {
  return <fieldset><legend>{title}</legend>
    {(['position', 'rotation'] as const).map(kind => <div key={kind} className="transform-row"><span>{kind}</span>{(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}>{axis}<input type="number" step={kind === 'rotation' ? 0.05 : 0.01} aria-label={`${title} ${kind} ${axis}`} value={Number(value[kind][index].toFixed(3))} onChange={event => {
      const number = event.currentTarget.valueAsNumber;
      if (!Number.isFinite(number)) return;
      const next: Triple = [...value[kind]]; next[index] = number;
      onChange({ ...value, [kind]: next });
    }} /></label>)}</div>)}
    <label className="scale-row">Scale <input type="number" min="0.01" max="5" step="0.01" value={value.scale} aria-label={`${title} scale`} onChange={event => { const scale = event.currentTarget.valueAsNumber; if (Number.isFinite(scale) && scale > 0) onChange({ ...value, scale }); }} /></label>
  </fieldset>;
}
function PreviewCamera({ position }: { position: Triple }) {
  const { camera, controls, invalidate } = useThree();
  useLayoutEffect(() => {
    camera.position.set(...position); camera.lookAt(0, 0.85, 0);
    // OrbitControls updates its spherical coordinates from the new camera pose.
    if (controls && 'update' in controls && typeof controls.update === 'function') controls.update();
    invalidate();
  }, [camera, controls, invalidate, position]);
  return null;
}
const positions: Triple[] = [[4, 2.8, 5], [5, 1.7, 0], [0, 1.7, 5], [0, 7, 0.01]];
export function AssetPreview() {
  const [seat, setSeat] = useState<VisualTransform>(defaultKart.seat);
  const [driver, setDriver] = useState<VisualTransform>(defaultDriver.transform);
  const [raw, setRaw] = useState(false);
  const [anchors, setAnchors] = useState(false);
  const [view, setView] = useState(0);

  return <main className="asset-preview"><aside>
    <a href="/">← Back to driving</a><p className="eyebrow">DEVELOPMENT • VISUAL FITTING</p><h1>Kart & driver workshop</h1>
    <p>Drag to orbit, scroll to zoom. Green = up; blue = forward. Changes stay in this preview until copied into visualAssets.ts.</p>
    <label><input type="checkbox" checked={raw} onChange={event => setRaw(event.currentTarget.checked)} /> Inspect original models side by side</label>
    <label><input type="checkbox" checked={anchors} onChange={event => setAnchors(event.currentTarget.checked)} /> Show seat anchor</label>
    <div className="preview-buttons">{['Three-quarter', 'Side', 'Front', 'Top'].map((name, index) => <button key={name} onClick={() => setView(index)}>{name}</button>)}</div>
    <TransformEditor title="Seat" value={seat} onChange={setSeat} /><TransformEditor title="Driver" value={driver} onChange={setDriver} />
    <button onClick={() => { setSeat(defaultKart.seat); setDriver(defaultDriver.transform); }}>Restore defaults</button>
    <p className="pose-note">Unrigged character • 0 animation clips. The assembly uses an approximate static mesh pose, not a seated driving animation.</p>
    <details><summary>Copy fitting settings</summary><pre>{JSON.stringify({ seat, driver }, null, 2)}</pre></details>
  </aside><section aria-label="3D asset fitting preview">
    <Canvas shadows={{ type: PCFShadowMap }} camera={{ position: positions[0], fov: 42, near: 0.05, far: 100 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#d7e8e5']} /><hemisphereLight args={['#fff9e8', '#6c897d', 2.1]} />
      <directionalLight position={[-3, 7, 5]} intensity={2.6} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0003} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#b2c7b4" roughness={0.9} /></mesh>
      <gridHelper args={[12, 24, '#7e9c91', '#a2b7a8']} />
      <Suspense fallback={null}>{raw ? <><RawModel url={defaultKart.url} scale={1.5} position={[-1.8, 0.16, 0]} /><RawModel url={defaultDriver.url} scale={0.3} position={[1.5, 0, 0]} /></> : <KartAssembly kart={{ ...defaultKart, seat }} driver={{ ...defaultDriver, transform: driver }} showAnchors={anchors} />}</Suspense>
      <PreviewCamera position={positions[view]} /><OrbitControls makeDefault target={[0, 0.85, 0]} minDistance={1} maxDistance={15} />
    </Canvas>
  </section></main>;
}
