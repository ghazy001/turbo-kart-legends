import { Suspense, useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PerspectiveCamera, View, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { type Group, type PerspectiveCamera as ThreeCamera } from 'three';
import type { DriverAssetDefinition, KartAssetDefinition } from '../../config/visualAssets';
import { KartAssembly } from '../../render/KartAssembly';
import type { AssetStatus } from '../../render/KartVisual';
import { PreviewBoundary } from '../GaragePreview';
import { HomeScenery } from './HomeScenery';
import { RacerModel } from '../selection/SelectionModel';
import { placePreviewOnFloor } from '../../render/models/racerPresentation';

function ParkedSubject({ driver, kart, kind, terrace, onReady }: { driver: DriverAssetDefinition; kart: KartAssetDefinition; kind: 'racer' | 'kart'; terrace: boolean; onReady: () => void }) {
  const root = useRef<Group>(null);
  useLayoutEffect(() => {
    if (!root.current) return;
    placePreviewOnFloor(root.current, terrace ? 0.20 : 0.035);
    onReady();
  }, [driver, kart, kind, terrace, onReady]);
  return <group ref={root} scale={kind === 'kart' ? 1.12 : terrace ? 1.3 : 1.05} rotation={[0, -0.18, 0]}>
    {kind === 'racer' ? <RacerModel driver={driver} /> : <KartAssembly driver={driver} kart={kart} />}
  </group>;
}
const narrowScreen = () => window.matchMedia('(max-width: 760px)').matches;
const subscribeScreen = (listener: () => void) => {
  const query = window.matchMedia('(max-width: 760px)');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
};
function CoastalCamera({ narrow, terrace }: { narrow: boolean; terrace: boolean }) {
  const camera = useRef<ThreeCamera>(null);
  const targetX = narrow ? 0 : terrace ? -3.6 : -2.7;
  const targetY = terrace ? 1.5 : narrow ? 0.9 : 1.2;
  // Set after R3F's camera sizing; the View portal owns its own aspect ratio.
  useFrame(() => camera.current?.lookAt(targetX, targetY, 0), -2);
  return <PerspectiveCamera ref={camera} makeDefault fov={narrow ? 38 : 36} near={0.1} far={150}
    position={terrace ? narrow ? [0, 2.4, 6.8] : [0, 3.3, 12] : narrow ? [4, 2.3, 5.5] : [7, 3.5, 10]}
    onUpdate={camera => camera.lookAt(targetX, targetY, 0)} />;
}
/** One view in the existing shared renderer, with an independently cloned parked assembly. */
export function HomeScene({ driver, kart, kind = 'kart', scenery = 'road', className = 'home-scenery-view', tint = false, showSubject = true }: {
  driver: DriverAssetDefinition; kart: KartAssetDefinition; kind?: 'racer' | 'kart'; scenery?: 'road' | 'terrace'; className?: string; tint?: boolean; showSubject?: boolean;
}) {
  const narrow = useSyncExternalStore(subscribeScreen, narrowScreen);
  const [status, setStatus] = useState<AssetStatus>('loading'), [retry, setRetry] = useState(0);
  const ready = useCallback(() => setStatus('ready'), []);
  return <>
    <View className={className} index={0.5} aria-hidden="true">
      <CoastalCamera narrow={narrow} terrace={scenery === 'terrace'} /><HomeScenery variant={scenery} />
      {showSubject && <PreviewBoundary key={`${driver.id}:${kart.id}:${retry}`} onStatus={setStatus}><Suspense fallback={null}>
        <ParkedSubject driver={driver} kart={kart} kind={kind} terrace={scenery === 'terrace'} onReady={ready} />
      </Suspense></PreviewBoundary>}
      {tint && (!narrow || !showSubject) && <mesh frustumCulled={false} renderOrder={10000}>
        <planeGeometry args={[2, 2]} /><shaderMaterial transparent depthWrite={false} depthTest={false} toneMapped={false}
          vertexShader={'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}'}
          fragmentShader={narrow
            ? 'void main(){gl_FragColor=vec4(0.075,0.19,0.23,0.72);}'
            : 'varying vec2 vUv; void main(){float left=1.0-smoothstep(0.12,0.7,vUv.x);float bottom=1.0-smoothstep(0.0,0.2,vUv.y);gl_FragColor=vec4(0.075,0.19,0.23,max(left*0.88,bottom*0.4));}'} />
      </mesh>}
    </View>
    {showSubject && status !== 'ready' && <div className="home-scene-status" role={status === 'error' ? 'alert' : 'status'}>
      {status === 'error' ? <><span>Preview unavailable</span><button data-selection-action onClick={() => { useGLTF.clear(driver.url); useGLTF.clear(kart.url); setStatus('loading'); setRetry(value => value + 1); }}>Retry preview</button></> : kind === 'racer' ? 'Meeting your racer…' : 'Parking your kart…'}
    </div>}
  </>;
}
