import { Component, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { defaultDriver, defaultKart, type DriverAssetDefinition, type KartAssetDefinition } from '../config/visualAssets';
import { KartAssembly } from './KartAssembly';
import { KartEffects } from './KartEffects';
import { ProceduralKartVisual } from './ProceduralKartVisual';
import type { KartVisualRuntime } from './runtime';

export type AssetStatus = 'loading' | 'ready' | 'error';
const ignoreStatus = () => undefined;

class ModelBoundary extends Component<{ children: ReactNode; runtime: KartVisualRuntime; onStatus: (status: AssetStatus) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) {
    console.error('Kart asset could not load; using the procedural kart.', error);
    this.props.onStatus('error');
  }
  render() {
    return this.state.failed ? <ProceduralKartVisual runtime={this.props.runtime} /> : this.props.children;
  }
}

function LoadingKart({ runtime, onStatus }: { runtime: KartVisualRuntime; onStatus: (status: AssetStatus) => void }) {
  useEffect(() => { onStatus('loading'); }, [onStatus]);
  return <ProceduralKartVisual runtime={runtime} />;
}

function MovingKart({ runtime, kart, driver, onStatus }: { runtime: KartVisualRuntime; kart: KartAssetDefinition; driver: DriverAssetDefinition; onStatus: (status: AssetStatus) => void }) {
  useEffect(() => { onStatus('ready'); }, [onStatus]);
  const rig = useRef<Group>(null);
  const body = useRef<Group>(null);
  useFrame(() => {
    const pose = runtime.simulation.pose;
    if (rig.current) { rig.current.position.set(pose.x, 0.055 + pose.y, pose.z); rig.current.rotation.y = pose.heading; }
    if (body.current) {
      body.current.rotation.z = -pose.yawRate * pose.forwardSpeed * 0.0016;
      body.current.rotation.y = pose.driftDirection * 0.18;
      body.current.scale.y = 1 - pose.landingCompression;
    }
  }, -2);
  return <group ref={rig} name="kart-motion-root">
    <group ref={body} name="kart-visual-body"><KartAssembly kart={kart} driver={driver} runtime={runtime} /></group>
    <KartEffects runtime={runtime} />
  </group>;
}

/** Asset selection affects visuals only. Both models share the original motion rig. */
export function KartVisual({ runtime, kart = defaultKart, driver = defaultDriver, onStatus = ignoreStatus }: {
  runtime: KartVisualRuntime; kart?: KartAssetDefinition; driver?: DriverAssetDefinition; onStatus?: (status: AssetStatus) => void;
}) {
  return <ModelBoundary key={`${kart.id}-${driver.id}`} runtime={runtime} onStatus={onStatus}>
    <Suspense fallback={<LoadingKart runtime={runtime} onStatus={onStatus} />}>
      <MovingKart runtime={runtime} kart={kart} driver={driver} onStatus={onStatus} />
    </Suspense>
  </ModelBoundary>;
}
