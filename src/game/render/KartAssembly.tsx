import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { kartConfig } from '../config/kartConfig';
import { defaultDriver, defaultKart, type DriverAssetDefinition, type KartAssetDefinition } from '../config/visualAssets';
import { instantiateModel } from './models/modelInstances';
import { createDriverAnimator } from './models/driverAnimation';
import { driverFitOptions } from './models/driverFit';
import type { ModelOptions } from './models/prepareModel';
import { configureAssetLoader } from './models/assetLoader';
import type { KartVisualRuntime } from './runtime';

export interface KartAssemblyProps { kart?: KartAssetDefinition; driver?: DriverAssetDefinition; runtime?: KartVisualRuntime; showAnchors?: boolean; fitting?: ModelOptions; celebrating?: boolean }
export function preloadAssembly(kart: KartAssetDefinition, driver: DriverAssetDefinition) {
  // Match the paired useGLTF cache key used by KartAssembly, not two unrelated keys.
  useGLTF.preload([kart.url, driver.url], false, false, configureAssetLoader);
}
/** Shared by player, AI and fitting tools. The seat is under the SAME visual motion parent. */
export function KartAssembly({ kart = defaultKart, driver = defaultDriver, runtime, showAnchors = false, fitting, celebrating = false }: KartAssemblyProps) {
  const [kartGLTF, driverGLTF] = useGLTF([kart.url, driver.url], false, false, configureAssetLoader);
  const kartModel = useMemo(() => instantiateModel(kartGLTF.scene, kart.id, { wheels: kart.wheels }), [kartGLTF.scene, kart.id, kart.wheels]);
  const fit = useMemo(() => fitting ?? driverFitOptions(kart, driver), [fitting, kart, driver]);
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
    <group name="kart-model" {...kart.transform}><primitive object={kartModel.root} dispose={null} /></group>
    <group name="driver-seat-anchor" {...kart.seat}>
      <group name="driver-model" {...driver.transform}><primitive object={driverModel.root} dispose={null} /></group>
      {showAnchors && <axesHelper args={[0.6]} />}
    </group>
  </group>;
}
