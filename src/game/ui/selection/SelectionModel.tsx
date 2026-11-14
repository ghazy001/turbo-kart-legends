import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Box3, Group, Vector3 } from 'three';
import { configureAssetLoader } from '../../render/models/assetLoader';
import { instantiateModel } from '../../render/models/modelInstances';
import { KartAssembly } from '../../render/KartAssembly';
import type { DriverAssetDefinition, KartAssetDefinition } from '../../config/visualAssets';

/** Portraits retain the source pose. They never modify the seated gameplay instance. */
function RacerModel({ driver }: { driver: DriverAssetDefinition }) {
  const gltf = useGLTF(driver.url, false, false, configureAssetLoader);
  const model = useMemo(() => {
    const instance = instantiateModel(gltf.scene, `${driver.id}:portrait`, {});
    const bounds = new Box3().setFromObject(instance.root, true), size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = 2.3 / Math.max(size.y, size.x * 0.85, 0.01);
    return { root: instance.root, scale, position: [-center.x * scale, -bounds.min.y * scale, -center.z * scale] as [number, number, number] };
  }, [gltf.scene, driver.id]);
  return <group rotation={driver.transform.rotation}><group scale={model.scale} position={model.position}><primitive object={model.root} dispose={null} /></group></group>;
}
function KartModel({ kart }: { kart: KartAssetDefinition }) {
  const gltf = useGLTF(kart.url, false, false, configureAssetLoader);
  const model = useMemo(() => instantiateModel(gltf.scene, kart.id, { wheels: kart.wheels }), [gltf.scene, kart.id, kart.wheels]);
  return <group {...kart.transform}><primitive object={model.root} dispose={null} /></group>;
}
export function SelectionModel({ driver, kart, kind, thumbnail = false, animate = false, presentation = 'selection', onReady }: {
  driver: DriverAssetDefinition; kart: KartAssetDefinition; kind: 'racer' | 'kart'; thumbnail?: boolean; animate?: boolean; presentation?: 'selection' | 'showroom'; onReady: () => void;
}) {
  const turntable = useRef<Group>(null), elapsed = useRef(0);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useFrame(({ invalidate }, delta) => {
    if (!animate || reducedMotion || !turntable.current) return;
    elapsed.current += Math.min(delta, 0.05);
    turntable.current.rotation.y = -0.25 + Math.sin(elapsed.current * 0.35) * 0.16;
    invalidate();
  });
  useEffect(() => { onReady(); }, [onReady]);
  const racer = kind === 'racer', showroom = presentation === 'showroom';
  const distance = (kart.id === 'ds' ? 0.8 : 1) * (animate ? 0.9 : 1);
  return <>
    <PerspectiveCamera makeDefault fov={showroom ? 30 : thumbnail ? 32 : 33} position={racer ? [0.5, 1.55, thumbnail ? 5.6 : 5.3] : [3.5 * distance, 0.8 + 1.45 * distance, 4.8 * distance]} onUpdate={camera => camera.lookAt(0, racer ? 1.12 : 0.8, 0)} near={0.1} far={30} />
    <hemisphereLight args={[showroom ? '#f5eee3' : '#fff4dd', showroom ? '#354354' : '#5f9799', showroom ? 1.7 : 2.2]} />
    <directionalLight position={[-3, 5, 5]} intensity={showroom ? 3.1 : 2.7} />
    <directionalLight position={[4, 3, -3]} color={showroom ? '#d4deff' : '#b8f1ff'} intensity={showroom ? 2.1 : 1.8} />
    <group ref={turntable} rotation={[0, thumbnail ? (racer ? driver : kart).thumbnail.yaw : -0.25, 0]}>
      {racer ? <RacerModel driver={driver} /> : thumbnail ? <KartModel kart={kart} /> : <KartAssembly kart={kart} driver={driver} />}
    </group>
  </>;
}
