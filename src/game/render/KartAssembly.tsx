import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { kartConfig } from '../config/kartConfig';
import { defaultDriver, defaultKart, type DriverAssetDefinition, type KartAssetDefinition, type VisualTransform } from '../config/visualAssets';
import { instantiateModel } from './models/modelInstances';
import { createDriverAnimator } from './models/driverAnimation';
import { driverFitOptions, resolveDriverMount } from './models/driverFit';
import type { ModelOptions } from './models/prepareModel';
import { configureAssetLoader } from './models/assetLoader';
import type { KartVisualRuntime } from './runtime';

export interface KartAssemblyProps { kart?: KartAssetDefinition; driver?: DriverAssetDefinition; runtime?: KartVisualRuntime; showAnchors?: boolean; showDriver?: boolean; driverMount?: VisualTransform; fitting?: ModelOptions; celebrating?: boolean }
export function preloadAssembly(kart: KartAssetDefinition, driver: DriverAssetDefinition) {
  // Match the paired useGLTF cache key used by KartAssembly, not two unrelated keys.
  useGLTF.preload([kart.url, driver.url], false, false, configureAssetLoader);
}
/** Shared by player, AI and fitting tools. The seat is under the SAME visual motion parent. */
export function KartAssembly({ kart = defaultKart, driver = defaultDriver, runtime, showAnchors = false, showDriver = true, driverMount, fitting, celebrating = false }: KartAssemblyProps) {
  const [kartGLTF, driverGLTF] = useGLTF([kart.url, driver.url], false, false, configureAssetLoader);
  const kartModel = useMemo(() => instantiateModel(kartGLTF.scene, kart.id, { wheels: kart.wheels }), [kartGLTF.scene, kart.id, kart.wheels]);
  const mount = useMemo(() => driverMount ?? resolveDriverMount(kart, driver), [driverMount, kart, driver]);
  const fit = useMemo(() => fitting ?? driverFitOptions(kart, driver, mount), [fitting, kart, driver, mount]);
  const driverModel = useMemo(() => instantiateModel(driverGLTF.scene, `${driver.id}:${driver.pose}`, fit), [driverGLTF.scene, driver.id, driver.pose, fit]);
  const animator = useMemo(() => createDriverAnimator(driverModel.root, driver.pose === 'authored' ? driverGLTF.animations : [], driver.clips), [driverModel, driverGLTF.animations, driver.clips, driver.pose]);
  useEffect(() => () => animator.dispose(), [animator]);
  useFrame(({ invalidate }, delta) => {
    const pose = runtime?.simulation.pose;
    if (pose) for (const wheel of kartModel.wheels) {
      wheel.steer.rotation.y = wheel.front ? -pose.steering * 0.43 : 0;
      wheel.spin.rotation[kart.axle ?? 'x'] = pose.wheelSpin * kartConfig.wheelRadius / kart.wheelRadius * (kart.spinDirection ?? 1);
    }
    if (!runtime && animator.supported.length > 0) invalidate();
    animator.update(delta, { steering: pose?.steering ?? 0, driftDirection: pose?.driftDirection ?? 0, victory: celebrating || runtime?.mode === 'results', paused: runtime?.mode === 'paused' });
  }, -1);
  return <group name="kart-assembly">
    {showAnchors && [-1, 1].map(side => <mesh key={side} position={[side * kart.steeringGrip[0], kart.steeringGrip[1], kart.steeringGrip[2]]}>
      <sphereGeometry args={[0.035, 12, 8]} /><meshBasicMaterial color="#ff6b21" depthTest={false} />
    </mesh>)}
    {showAnchors && <group position={kart.cockpit.cushion}><axesHelper args={[0.3]} /><mesh><boxGeometry args={[0.32, 0.012, 0.22]} /><meshBasicMaterial color="#79e3a4" transparent opacity={0.5} depthTest={false} /></mesh></group>}
    <group name="kart-model" {...kart.transform}><primitive object={kartModel.root} dispose={null} /></group>
    {kart.cockpit.wheel && <group name="cockpit-steering-wheel" position={kart.cockpit.wheel.center} rotation={[kart.cockpit.wheel.tilt, 0, 0]}>
      <mesh castShadow><torusGeometry args={[kart.cockpit.wheel.radius, 0.024, 8, 32]} /><meshStandardMaterial color="#263d48" roughness={0.72} /></mesh>
      <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.055, 0.055, 0.055, 12]} /><meshStandardMaterial color="#e3c58b" metalness={0.3} roughness={0.5} /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * 0.1, 0, 0]}><boxGeometry args={[0.2, 0.026, 0.026]} /><meshStandardMaterial color="#72838a" roughness={0.65} /></mesh>)}
    </group>}
    <group name="driver-seat-anchor" {...kart.seat} visible={showDriver}>
      <group name="driver-model" {...mount}><primitive object={driverModel.root} dispose={null} /></group>
    </group>
  </group>;
}
