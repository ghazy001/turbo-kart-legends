import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Box3, Mesh, PCFShadowMap } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { configureAssetLoader } from '../render/models/assetLoader';
import { driverAssets, kartAssets, type KartId, type RacerId, type KartAssetDefinition, type DriverAssetDefinition, type Triple, type VisualTransform } from '../config/visualAssets';
import { driverFitOptions, resolveDriverMount } from '../render/models/driverFit';
import { KartAssembly } from '../render/KartAssembly';
import './assetPreview.css';
import { PreviewBoundary } from '../ui/GaragePreview';
import type { AssetStatus } from '../render/KartVisual';
import { racerPortraitFit } from '../render/models/racerPresentation';

function RawModel({ url, scale, position, portrait = false }: { url: string; scale: number; position: Triple; portrait?: boolean }) {
  const gltf = useGLTF(url, false, false, configureAssetLoader);
  const instance = useMemo(() => {
    const scene = clone(gltf.scene);
    scene.traverse(node => { if (node instanceof Mesh) { node.castShadow = true; node.receiveShadow = true; } });
    return scene;
  }, [gltf.scene]);
  const fit = useMemo(() => portrait ? racerPortraitFit(new Box3().setFromObject(instance, true)) : null, [instance, portrait]);
  return <group position={position}><group scale={fit?.scale ?? scale} position={fit?.position}><primitive object={instance} dispose={null} /></group></group>;
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
function Ready({ onStatus }: { onStatus: (status: AssetStatus) => void }) { useEffect(() => { onStatus('ready'); }, [onStatus]); return null; }
function FittingSession({ kart, racer }: { kart: KartAssetDefinition; racer: DriverAssetDefinition }) {
  const [status, setStatus] = useState<AssetStatus>('loading');
  const [seat, setSeat] = useState<VisualTransform>(kart.seat);
  const [driver, setDriver] = useState<VisualTransform>(() => resolveDriverMount(kart, racer));
  const [showDriver, setShowDriver] = useState(true);
  const [motion, setMotion] = useState('parked');
  const [raw, setRaw] = useState(false);
  const [anchors, setAnchors] = useState(false);
  const [fitted, setFitted] = useState(true);
  const [view, setView] = useState(0);
  const fit = useMemo(() => driverFitOptions({ ...kart, seat }, racer, driver), [kart, racer, seat, driver]);

  return <main className="asset-preview"><aside>
    <a href="/">← Back to driving</a> · <a href="/?asset-inspect">Raw file inventory</a><p className="eyebrow">DEVELOPMENT • VISUAL FITTING</p><h1>Kart & driver workshop</h1>
    <p>Drag to orbit, scroll to zoom. Green = cushion; orange = palm targets. Defaults derive from each cockpit and racer; edits stay in this workshop.</p>
    <label><input type="checkbox" checked={raw} onChange={event => setRaw(event.currentTarget.checked)} /> Inspect original models side by side</label>
    <label><input type="checkbox" checked={anchors} onChange={event => setAnchors(event.currentTarget.checked)} /> Show seat and hand targets</label>
    <label><input type="checkbox" checked={showDriver} onChange={event => setShowDriver(event.currentTarget.checked)} /> Show fitted racer</label>
    <label>Attachment check <select aria-label="Attachment check" value={motion} onChange={event => setMotion(event.currentTarget.value)}><option value="parked">Parked</option><option value="bank">Body bank</option><option value="jump">Airborne / pitch</option><option value="landing">Landing compression</option></select></label>
    <div className="preview-buttons">{['Three-quarter', 'Side', 'Front', 'Top'].map((name, index) => <button key={name} onClick={() => setView(index)}>{name}</button>)}</div>
    <label><input type="checkbox" checked={fitted} onChange={event => setFitted(event.currentTarget.checked)} /> Apply approximate static driving fit</label>
    <TransformEditor title="Seat" value={seat} onChange={setSeat} /><TransformEditor title="Driver" value={driver} onChange={setDriver} />
    <button onClick={() => { setSeat(kart.seat); setDriver(resolveDriverMount(kart, racer)); }}>Restore defaults</button>
    <p role="status">{status === 'ready' ? 'Models ready' : status === 'error' ? 'Model failed to load' : 'Loading models…'}</p>
    <p className="pose-note">{racer.rigSeat ? 'Rigged character • 0 animation clips. Existing joints use a fitted static seated pose.' : 'Unrigged character • 0 animation clips. The assembly uses an approximate static mesh pose, not a seated driving animation.'}</p>
    <details><summary>Copy fitting settings</summary><pre>{JSON.stringify({ kartId: kart.id, racerId: racer.id, seat, resolvedDriverMount: driver, cockpit: kart.cockpit, steeringGrip: kart.steeringGrip }, null, 2)}</pre></details>
  </aside><section aria-label="3D asset fitting preview">
    <Canvas frameloop="demand" shadows={{ type: PCFShadowMap }} camera={{ position: positions[0], fov: 42, near: 0.05, far: 100 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#d7e8e5']} /><hemisphereLight args={['#fff9e8', '#6c897d', 2.1]} />
      <directionalLight position={[-3, 7, 5]} intensity={2.6} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0003} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#b2c7b4" roughness={0.9} /></mesh>
      <gridHelper args={[12, 24, '#7e9c91', '#a2b7a8']} />
      <PreviewBoundary onStatus={setStatus}><Suspense fallback={null}>{raw ? <><RawModel url={kart.sourceUrl} scale={kart.transform.scale} position={[-1.8, 0.16, 0]} /><RawModel url={racer.sourceUrl} scale={1} position={[1.5, 0, 0]} portrait /></> : <group position={[0, motion === 'jump' ? 0.65 : 0, 0]} rotation={[motion === 'jump' ? -0.12 : 0, motion === 'bank' ? 0.18 : 0, motion === 'bank' ? -0.08 : 0]} scale={[1, motion === 'landing' ? 0.9 : 1, 1]}>
        <KartAssembly kart={{ ...kart, seat }} driver={{ ...racer, pose: fitted ? racer.pose : 'authored' }} driverMount={driver} fitting={fitted ? fit : {}} showAnchors={anchors} showDriver={showDriver} />
      </group>}<Ready onStatus={setStatus} /></Suspense></PreviewBoundary>
      <PreviewCamera position={positions[view]} /><OrbitControls makeDefault target={[0, 0.85, 0]} minDistance={1} maxDistance={15} />
    </Canvas>
  </section></main>;
}

export function AssetPreview() {
  const [kartId, setKartId] = useState<KartId>('practice');
  const [racerId, setRacerId] = useState<RacerId>('supplied');
  return <><div className="fitting-selectors"><label>Kart <select aria-label="Fitting kart" value={kartId} onChange={event => setKartId(event.currentTarget.value as KartId)}>{Object.values(kartAssets).map(kart => <option key={kart.id} value={kart.id}>{kart.name}</option>)}</select></label><label>Racer <select aria-label="Fitting racer" value={racerId} onChange={event => setRacerId(event.currentTarget.value as RacerId)}>{Object.values(driverAssets).map(racer => <option key={racer.id} value={racer.id}>{racer.name}</option>)}</select></label></div><FittingSession key={`${kartId}:${racerId}`} kart={kartAssets[kartId]} racer={driverAssets[racerId]} /></>;
}
