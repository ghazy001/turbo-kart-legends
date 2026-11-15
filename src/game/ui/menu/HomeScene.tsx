import { Suspense, useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PerspectiveCamera, View, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, type Group, type PerspectiveCamera as ThreeCamera } from 'three';
import type { DriverAssetDefinition, KartAssetDefinition } from '../../config/visualAssets';
import { KartAssembly } from '../../render/KartAssembly';
import type { AssetStatus } from '../../render/KartVisual';
import { PreviewBoundary } from '../GaragePreview';
import { HomeScenery } from './HomeScenery';

function ParkedKart({ driver, kart, onReady }: { driver: DriverAssetDefinition; kart: KartAssetDefinition; onReady: () => void }) {
  const root = useRef<Group>(null);
  useLayoutEffect(() => {
    if (!root.current) return;
    root.current.updateWorldMatrix(true, true);
    const bounds = new Box3().setFromObject(root.current, true);
    if (!bounds.isEmpty()) root.current.position.y += 0.035 - bounds.min.y;
    onReady();
  }, [driver, kart, onReady]);
  return <group ref={root} scale={1.12} rotation={[0, -0.18, 0]}><KartAssembly driver={driver} kart={kart} /></group>;
}
const narrowScreen = () => window.matchMedia('(max-width: 760px)').matches;
const subscribeScreen = (listener: () => void) => {
  const query = window.matchMedia('(max-width: 760px)');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
};
function CoastalCamera({ narrow }: { narrow: boolean }) {
  const camera = useRef<ThreeCamera>(null);
  // Set after R3F's camera sizing; the View portal owns its own aspect ratio.
  useFrame(() => camera.current?.lookAt(narrow ? 0 : -2.7, narrow ? 0.9 : 1.2, 0), -2);
  return <PerspectiveCamera ref={camera} makeDefault fov={narrow ? 38 : 36} near={0.1} far={150}
    position={narrow ? [4, 2.3, 5.5] : [7, 3.5, 10]}
    onUpdate={camera => camera.lookAt(narrow ? 0 : -2.7, narrow ? 0.9 : 1.2, 0)} />;
}
/** One view in the existing shared renderer, with an independently cloned parked assembly. */
export function HomeScene({ driver, kart }: { driver: DriverAssetDefinition; kart: KartAssetDefinition }) {
  const narrow = useSyncExternalStore(subscribeScreen, narrowScreen);
  const [status, setStatus] = useState<AssetStatus>('loading'), [retry, setRetry] = useState(0);
  const ready = useCallback(() => setStatus('ready'), []);
  return <>
    <View className="home-scenery-view" index={1} aria-hidden="true">
      <CoastalCamera narrow={narrow} /><HomeScenery />
      <PreviewBoundary key={`${driver.id}:${kart.id}:${retry}`} onStatus={setStatus}><Suspense fallback={null}>
        <ParkedKart driver={driver} kart={kart} onReady={ready} />
      </Suspense></PreviewBoundary>
    </View>
    {status !== 'ready' && <div className="home-scene-status" role={status === 'error' ? 'alert' : 'status'}>
      {status === 'error' ? <><span>Kart preview unavailable</span><button data-selection-action onClick={() => { useGLTF.clear(driver.url); useGLTF.clear(kart.url); setStatus('loading'); setRetry(value => value + 1); }}>Retry preview</button></> : 'Parking your kart…'}
    </div>}
  </>;
}
