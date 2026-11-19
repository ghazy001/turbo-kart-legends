import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Group, InstancedMesh, Object3D, Vector2 } from 'three';
import { podiumConfig } from '../config/podiumConfig';
import { driverAssets, kartAssets } from '../config/visualAssets';
import type { PodiumEntry } from '../ui/results/resultsPresentation';
import { KartAssembly } from './KartAssembly';
import { paintedTexture } from './paintedTexture';

/** A small original display kart keeps the podium usable if an imported model fails. */
function DisplayFallback({ color }: { color: string }) {
  return <group>
    <mesh position={[0, 0.6, 0]}><boxGeometry args={[1.5, 0.45, 2.15]} /><meshStandardMaterial color={color} /></mesh>
    {[-1, 1].flatMap(side => [-0.72, 0.72].map(z => <mesh key={`${side}:${z}`} position={[side * 0.85, 0.35, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.34, 0.34, 0.27, 12]} /><meshStandardMaterial color="#183a48" /></mesh>))}
    <mesh position={[0, 0.95, -0.35]}><boxGeometry args={[0.7, 0.65, 0.4]} /><meshStandardMaterial color="#183a48" /></mesh>
    <mesh position={[0, 1.5, -0.1]}><sphereGeometry args={[0.4, 12, 8]} /><meshStandardMaterial color="#83d9cd" /></mesh>
    <mesh position={[0, 1.48, 0.2]} scale={[1, 0.45, 0.3]}><sphereGeometry args={[0.35, 12, 8]} /><meshStandardMaterial color="#183a48" /></mesh>
  </group>;
}
class PodiumModelBoundary extends Component<{ children: ReactNode; color: string; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.warn('Podium model unavailable; using an original display kart.', error.message); this.props.onUnavailable(); }
  render() { return this.state.failed ? <DisplayFallback color={this.props.color} /> : this.props.children; }
}
function ReadyAssembly({ entry, onReady }: { entry: PodiumEntry; onReady: (id: string) => void }) {
  useEffect(() => { onReady(entry.id); }, [entry.id, onReady]);
  return <KartAssembly kart={kartAssets[entry.selection.kartId]} driver={driverAssets[entry.selection.racerId]} celebrating />;
}
function Plinth({ entry, elapsed, reduced, solo, onReady, onUnavailable }: {
  solo: boolean; entry: PodiumEntry; elapsed: { current: number }; reduced: boolean; onReady: (id: string) => void; onUnavailable: () => void;
}) {
  const platform = useRef<Group>(null), kart = useRef<Group>(null);
  const style = podiumConfig.places[entry.place - 1];
  const platformHeight = solo ? 0.6 : style.height;
  const label = useMemo(() => paintedTexture(String(entry.place).padStart(2, '0'), '#234b58', style.color, entry.id === 'player' ? 'Y O U' : entry.name.toUpperCase()), [entry.place, entry.id, entry.name, style.color]);
  useEffect(() => () => label.dispose(), [label]);
  useFrame(() => {
    const t = elapsed.current;
    const progress = reduced ? 1 : Math.max(0, Math.min(1, (t - (entry.place - 1) * podiumConfig.stagger) / podiumConfig.riseDuration));
    const height = platformHeight * (1 - (1 - progress) ** 3);
    if (platform.current) { platform.current.scale.y = Math.max(0.001, height / platformHeight); platform.current.position.y = height / 2; }
    if (kart.current) {
      kart.current.position.y = height + 0.08;
      kart.current.rotation.y = -0.2 + (reduced ? 0 : Math.sin(Math.min(t, podiumConfig.duration) * 0.8) * 0.07);
    }
  }, -1);
  return <group position={[style.x, 0, 0]}>
    <group ref={platform} position={[0, platformHeight / 2, 0]}>
      <mesh receiveShadow><boxGeometry args={[3.9, platformHeight, 3.5]} /><meshStandardMaterial color="#2b5360" roughness={0.65} /></mesh>
      <mesh position={[0, platformHeight / 2 + 0.03, 0]}><boxGeometry args={[3.94, 0.06, 3.54]} /><meshStandardMaterial color={style.color} metalness={0.25} roughness={0.4} /></mesh>
      <mesh position={[0, 0, 1.756]}><planeGeometry args={[1.8, Math.min(0.8, platformHeight * 0.85)]} /><meshBasicMaterial map={label} /></mesh>
    </group>
    <group ref={kart} position={[0, platformHeight + 0.08, 0]} scale={0.95}>
      <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.9, 1.35, 1]}><circleGeometry args={[1, 24]} /><meshBasicMaterial color="#102f39" transparent opacity={0.18} depthWrite={false} /></mesh>
      <PodiumModelBoundary color={entry.color} onUnavailable={onUnavailable}>
        <Suspense fallback={<DisplayFallback color={entry.color} />}><ReadyAssembly entry={entry} onReady={onReady} /></Suspense>
      </PodiumModelBoundary>
    </group>
  </group>;
}
function Trophy({ elapsed, reduced, solo }: { elapsed: { current: number }; reduced: boolean; solo: boolean }) {
  const root = useRef<Group>(null);
  const profile = useMemo(() => [[0.12, 0], [0.12, 0.2], [0.4, 0.35], [0.62, 0.65], [0.72, 1.05], [0.7, 1.18]].map(([x, y]) => new Vector2(x, y)), []);
  useFrame(() => { if (root.current) root.current.rotation.y = reduced ? 0 : Math.sin(elapsed.current * 0.8) * 0.25; }, -1);
  return <group ref={root} position={solo ? [2.55, 0.23, 0.5] : [0, 0.23, 2.8]} scale={solo ? 0.55 : 0.7}>
    <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.65, 0.7, 0.15, 16]} /><meshStandardMaterial color="#183e4c" /></mesh>
    <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.13, 0.2, 0.5, 12]} /><meshStandardMaterial color="#efbf58" metalness={0.6} roughness={0.3} /></mesh>
    <mesh position={[0, 0.45, 0]}><latheGeometry args={[profile, 20]} /><meshStandardMaterial color="#ffd376" metalness={0.55} roughness={0.3} side={2} /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * 0.7, 1.2, 0]} scale={[0.7, 1, 1]}><torusGeometry args={[0.36, 0.075, 6, 18]} /><meshStandardMaterial color="#ffd376" metalness={0.55} roughness={0.3} /></mesh>)}
  </group>;
}
function Confetti({ elapsed }: { elapsed: { current: number } }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame(() => {
    if (!mesh.current) return;
    const time = elapsed.current;
    mesh.current.visible = time > 0.5 && time < podiumConfig.duration;
    for (let i = 0; i < podiumConfig.confettiCount; i++) {
      const phase = i * 2.39996;
      dummy.position.set(Math.sin(phase) * 6 + Math.sin(time + i) * 0.4, 8 + (i % 5) * 0.4 - time * (1.2 + i % 3 * 0.2), Math.cos(phase) * 2.5);
      dummy.rotation.set(time * 2 + i, phase, time + i); dummy.scale.set(0.08, 0.17, 0.025); dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, -1);
  return <instancedMesh ref={mesh} args={[undefined, undefined, podiumConfig.confettiCount]} frustumCulled={false}><boxGeometry /><meshStandardMaterial color="#ffd06e" roughness={0.8} /></instancedMesh>;
}
function Stage({ entries, reduced, visible, celebrate, onReady, onUnavailable }: {
  entries: readonly PodiumEntry[]; reduced: boolean; visible: boolean; celebrate: boolean;
  onReady: (id: string) => void; onUnavailable: () => void;
}) {
  const elapsed = useRef(0), invalidate = useThree(state => state.invalidate);
  const stageRadius = entries.length === 1 ? 3.3 : 7.1;
  useEffect(() => { invalidate(); }, [reduced, visible, invalidate]);
  useFrame((state, delta) => {
    if (reduced || !visible) return;
    elapsed.current = Math.min(podiumConfig.duration, elapsed.current + Math.min(delta, 0.05));
    if (elapsed.current < podiumConfig.duration) state.invalidate();
  }, -2);
  return <>
    <StageCamera solo={entries.length === 1} />
    <hemisphereLight args={['#fff2d1', '#72a9b1', 2.3]} /><directionalLight position={[-5, 8, 7]} intensity={3} color="#fff0d5" />
    <directionalLight position={[5, 5, -3]} intensity={1.6} color="#a6ece6" />
    <mesh position={[0, -0.16, 0]} scale={[1, 1, 0.6]}><cylinderGeometry args={[stageRadius, stageRadius + 0.05, 0.22, 64]} /><meshStandardMaterial color="#355e64" roughness={0.9} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} scale={[1, 0.6, 1]}><ringGeometry args={[stageRadius - 0.15, stageRadius - 0.12, 64]} /><meshBasicMaterial color="#aabda3" transparent opacity={0.35} /></mesh>
    {entries.map(entry => <Plinth key={entry.id} entry={entry} solo={entries.length === 1} elapsed={elapsed} reduced={reduced} onReady={onReady} onUnavailable={onUnavailable} />)}
    {celebrate && <Trophy elapsed={elapsed} reduced={reduced} solo={entries.length === 1} />}
    {celebrate && !reduced && <Confetti elapsed={elapsed} />}
  </>;
}
function StageCamera({ solo }: { solo: boolean }) {
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    const tangent = Math.tan(38 * Math.PI / 360), aspect = Math.max(0.5, size.width / Math.max(1, size.height));
    const distance = Math.max((solo ? 3.6 : 7.6) / (tangent * aspect), (solo ? 2.4 : 3) / tangent);
    camera.position.set(distance * 0.18, 1.5 + distance * 0.28, distance * 0.94); camera.lookAt(0, 1.5, 0); camera.updateProjectionMatrix(); invalidate();
  }, [camera, size.width, size.height, solo, invalidate]);
  return null;
}
export function PodiumScene(props: Parameters<typeof Stage>[0]) {
  const solo = props.entries.length === 1;
  return <Canvas frameloop="demand" dpr={[1, podiumConfig.dprMax]} camera={{ position: solo ? [4.8, 4.5, 9] : [7, 7.5, 18], fov: 38, near: 0.1, far: 60 }}
    onCreated={({ camera }) => camera.lookAt(0, solo ? 1.25 : 1.5, 0)} gl={{ antialias: true, alpha: true }}
    aria-label={solo ? 'Your racer on the finish stage' : 'Top three classified racers on the podium'}>
    <Stage {...props} />
  </Canvas>;
}
