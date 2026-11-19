import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Group, Vector2 } from 'three';
import { podiumConfig } from '../config/podiumConfig';
import { prepareTrophyModel } from './models/trophyModel';

function SuppliedCup() {
  const { scene } = useGLTF(podiumConfig.trophy.url);
  const model = useMemo(() => prepareTrophyModel(scene), [scene]);
  useEffect(() => () => model.dispose(), [model]);
  return <primitive object={model.root} dispose={null} />;
}
/** Original emergency visual only; loading never flashes a placeholder cup. */
function FallbackCup() {
  const profile = useMemo(() => [[0.09, 0], [0.09, 0.2], [0.3, 0.32], [0.46, 0.65], [0.5, 0.95], [0.48, 1]].map(([x, y]) => new Vector2(x, y)), []);
  return <group>
    <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.34, 0.36, 0.08, 16]} /><meshStandardMaterial color="#193b46" /></mesh>
    <mesh><latheGeometry args={[profile, 20]} /><meshStandardMaterial color="#e9bd60" metalness={0.45} roughness={0.3} side={2} /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * 0.48, 0.72, 0]} scale={[0.7, 1, 1]}><torusGeometry args={[0.24, 0.05, 6, 18]} /><meshStandardMaterial color="#e9bd60" metalness={0.45} roughness={0.3} /></mesh>)}
  </group>;
}
class TrophyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.warn('Supplied trophy unavailable; using the original display cup.', error.message); }
  render() { return this.state.failed ? <FallbackCup /> : this.props.children; }
}

/** Cosmetic display stand, deliberately clear of the kart plinths and their plaques. */
export function TrophyVisual({ elapsed, reduced, solo }: { elapsed: { current: number }; reduced: boolean; solo: boolean }) {
  const turntable = useRef<Group>(null), layout = solo ? podiumConfig.trophy.solo : podiumConfig.trophy.podium;
  const { standHeight, yaw } = podiumConfig.trophy;
  useFrame(() => {
    if (turntable.current) turntable.current.rotation.y = yaw + (reduced ? 0 : Math.sin(Math.min(elapsed.current, podiumConfig.duration) * 0.6) * 0.08);
  }, -1);
  return <group position={[...layout.position]}>
    <mesh position={[0, standHeight / 2, 0]}><cylinderGeometry args={[layout.standRadius, layout.standRadius + 0.035, standHeight, 40]} /><meshStandardMaterial color="#20444d" roughness={0.7} /></mesh>
    <mesh position={[0, standHeight + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[layout.standRadius - 0.045, layout.standRadius - 0.025, 48]} /><meshBasicMaterial color="#e8c17b" /></mesh>
    <group ref={turntable} position={[0, standHeight + 0.01, 0]} rotation={[0, yaw, 0]} scale={layout.height}>
      <TrophyBoundary><Suspense fallback={null}><SuppliedCup /></Suspense></TrophyBoundary>
    </group>
  </group>;
}
