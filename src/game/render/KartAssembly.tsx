import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { kartConfig } from '../config/kartConfig';
import { defaultDriver, defaultKart, type DriverAssetDefinition, type KartAssetDefinition } from '../config/visualAssets';
import { prepareModel } from './models/prepareModel';
import type { KartVisualRuntime } from './runtime';

export interface KartAssemblyProps {
  kart?: KartAssetDefinition;
  driver?: DriverAssetDefinition;
  runtime?: KartVisualRuntime;
  showAnchors?: boolean;
}

/** Shared by gameplay and the fitting preview. Local frame: Y up, +Z forward. */
export function KartAssembly({ kart = defaultKart, driver = defaultDriver, runtime, showAnchors = false }: KartAssemblyProps) {
  // Supplied GLBs are uncompressed. Avoid enabling CDN-hosted decoders.
  const [kartGLTF, driverGLTF] = useGLTF([kart.url, driver.url], false, false);
  const kartModel = useMemo(() => prepareModel(kartGLTF.scene, { wheels: kart.wheels }), [kartGLTF.scene, kart.wheels]);
  const driverModel = useMemo(() => prepareModel(driverGLTF.scene, { staticDriver: driver.pose === 'supplied-static-seat' }), [driverGLTF.scene, driver.pose]);
  useEffect(() => () => kartModel.dispose(), [kartModel]);
  useEffect(() => () => driverModel.dispose(), [driverModel]);
  useFrame(() => {
    if (!runtime) return;
    const pose = runtime.simulation.pose;
    for (const wheel of kartModel.wheels) {
      wheel.steer.rotation.y = wheel.front ? -pose.steering * 0.43 : 0;
      wheel.spin.rotation.x = pose.wheelSpin * kartConfig.wheelRadius / kart.wheelRadius;
    }
  }, -1);
  return <group name="kart-assembly">
    <group name="kart-model" {...kart.transform}><primitive object={kartModel.root} dispose={null} /></group>
    <group name="driver-seat-anchor" {...kart.seat}>
      <group name="driver-model" {...driver.transform}><primitive object={driverModel.root} dispose={null} /></group>
      {showAnchors && <axesHelper args={[0.6]} />}
    </group>
  </group>;
}
