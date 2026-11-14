import { Component, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Group, PCFShadowMap } from 'three';
import { KartAssembly } from '../render/KartAssembly';
import type { DriverAssetDefinition, KartAssetDefinition } from '../config/visualAssets';
import type { AssetStatus } from '../render/KartVisual';

export class PreviewBoundary extends Component<{ children: ReactNode; onStatus: (status: AssetStatus) => void }, { failed: boolean }> {
  state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.warn('Garage preview unavailable:', error.message); this.props.onStatus('error'); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Loading({ onStatus }: { onStatus: (status: AssetStatus) => void }) {
  useEffect(() => { onStatus('loading'); }, [onStatus]); return null;
}
function Showcase({ kart, driver, onStatus }: { kart: KartAssetDefinition; driver: DriverAssetDefinition; onStatus: (status: AssetStatus) => void }) {
  const group = useRef<Group>(null), elapsed = useRef(0);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => { onStatus('ready'); }, [onStatus]);
  useFrame(({ invalidate }, dt) => {
    elapsed.current += Math.min(dt, 0.05);
    const remaining = reduced ? 0 : Math.exp(-elapsed.current * 8);
    if (group.current) { group.current.rotation.y = -remaining * 0.35; group.current.position.y = -remaining * 0.12; }
    if (remaining > 0.001) invalidate();
  });
  return <group ref={group}><KartAssembly kart={kart} driver={driver} /></group>;
}
export function GaragePreview({ kart, driver, onStatus }: { kart: KartAssetDefinition; driver: DriverAssetDefinition; onStatus: (status: AssetStatus) => void }) {
  return <Canvas frameloop="demand" shadows={{ type: PCFShadowMap }} dpr={[1, 1.5]} camera={{ position: [3.7, 2.5, 4.5], fov: 38, near: 0.1, far: 40 }} aria-label={`${driver.name} in ${kart.name}, interactive 3D preview`}>
    <color attach="background" args={['#e3e9df']} /><hemisphereLight args={['#fff7df', '#779e91', 2.1]} />
    <directionalLight position={[-3, 6, 4]} intensity={2.8} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-normalBias={0.025} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow><circleGeometry args={[8, 64]} /><meshStandardMaterial color="#d0d9ca" roughness={1} /></mesh>
    <mesh position={[0, -0.035, 0]}><cylinderGeometry args={[2.1, 2.15, 0.05, 64]} /><meshStandardMaterial color="#f1eee0" roughness={0.9} /></mesh>
    <PreviewBoundary key={`${kart.id}:${driver.id}`} onStatus={onStatus}><Suspense fallback={<Loading onStatus={onStatus} />}><Showcase key={`${kart.id}:${driver.id}`} kart={kart} driver={driver} onStatus={onStatus} /></Suspense></PreviewBoundary>
    <OrbitControls makeDefault target={[0, 0.8, 0]} minDistance={3.5} maxDistance={8} maxPolarAngle={Math.PI / 2.15} enablePan={false} />
  </Canvas>;
}
