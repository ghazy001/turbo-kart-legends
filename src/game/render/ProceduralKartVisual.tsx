import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { KartVisualRuntime } from './runtime';
import { KartEffects } from './KartEffects';

function RoundedPart({ size, position, color, radius = 0.12 }: {
  size: [number, number, number]; position: [number, number, number]; color: string; radius?: number;
}) {
  const [x, y, z] = size;
  const geometry = useMemo(() => new RoundedBoxGeometry(x, y, z, 2, radius), [x, y, z, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={position} castShadow receiveShadow>
    <meshStandardMaterial color={color} roughness={0.45} />
  </mesh>;
}

function Wheel({ x, z, front, runtime }: { x: number; z: number; front: boolean; runtime: KartVisualRuntime }) {
  const steer = useRef<Group>(null);
  const spin = useRef<Group>(null);
  useFrame(() => {
    if (steer.current) steer.current.rotation.y = front ? -runtime.simulation.pose.steering * 0.43 : 0;
    if (spin.current) spin.current.rotation.x = runtime.simulation.pose.wheelSpin;
  }, -1);
  return <group position={[x, 0.43, z]} ref={steer}><group ref={spin}>
    <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.39, 0.39, 0.36, 16]} />
      <meshStandardMaterial color="#173440" roughness={0.8} />
    </mesh>
    <mesh position={[Math.sign(x) * 0.19, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.23, 0.23, 0.035, 12]} /><meshStandardMaterial color="#fff2ca" metalness={0.25} roughness={0.4} />
    </mesh>
    <mesh position={[Math.sign(x) * 0.215, 0, 0]}>
      <boxGeometry args={[0.025, 0.08, 0.36]} /><meshStandardMaterial color="#ef684c" />
    </mesh>
  </group></group>;
}

/** Original Tangerine kart and Pip, a small teal-helmeted driver. Forward +Z. */
export function ProceduralKartVisual({ runtime, bodyColor = '#ff7051', helmetColor = '#2faea4' }: { runtime: KartVisualRuntime; bodyColor?: string; helmetColor?: string }) {
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
  return <group ref={rig}>
    <RoundedPart size={[1.75, 0.23, 2.65]} position={[0, 0.47, 0]} color="#153c48" />
    <group ref={body}>
      <RoundedPart size={[1.62, 0.46, 2.15]} position={[0, 0.75, 0.08]} color={bodyColor} radius={0.18} />
      <RoundedPart size={[1.48, 0.42, 0.85]} position={[0, 0.89, 0.81]} color={bodyColor} radius={0.19} />
      <RoundedPart size={[0.27, 0.025, 0.91]} position={[0, 1.11, 0.84]} color="#fff1ca" radius={0.01} />
      <RoundedPart size={[1.9, 0.19, 0.29]} position={[0, 0.52, 1.35]} color="#fff0ce" radius={0.08} />
      <RoundedPart size={[1.82, 0.22, 0.25]} position={[0, 0.57, -1.29]} color="#ffb54e" />
      <RoundedPart size={[0.83, 0.7, 0.28]} position={[0, 1.1, -0.65]} color="#173c48" />
      <RoundedPart size={[0.68, 0.18, 0.65]} position={[0, 0.92, -0.3]} color="#254b53" />
      <mesh position={[0, 1.3, -0.17]} scale={[0.42, 0.48, 0.32]} castShadow>
        <sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#fff1ca" />
      </mesh>
      <mesh position={[0, 1.92, -0.12]} castShadow>
        <sphereGeometry args={[0.46, 20, 16]} /><meshStandardMaterial color={helmetColor} roughness={0.4} />
      </mesh>
      <RoundedPart size={[0.14, 0.09, 0.79]} position={[0, 2.32, -0.08]} color="#ffda67" radius={0.04} />
      <mesh position={[0, 1.91, 0.21]} scale={[0.9, 0.51, 0.35]}>
        <sphereGeometry args={[0.47, 16, 12]} /><meshStandardMaterial color="#173c48" roughness={0.24} />
      </mesh>
      <mesh position={[-0.16, 1.98, 0.36]} scale={[0.17, 0.06, 0.02]} rotation={[0, 0, -0.25]}>
        <sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#abebdb" />
      </mesh>
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * 0.38, 1.35, 0.23]} rotation={[0.6, 0, side * 0.3]} castShadow>
          <capsuleGeometry args={[0.12, 0.4, 3, 8]} /><meshStandardMaterial color="#fff1ca" />
        </mesh>
        <mesh position={[side * 0.37, 1.17, 0.43]}><sphereGeometry args={[0.15, 10, 8]} /><meshStandardMaterial color="#ffba63" /></mesh>
        <RoundedPart size={[0.23, 0.16, 0.1]} position={[side * 0.53, 0.94, 1.22]} color="#fff5c7" radius={0.04} />
      </group>)}
      <mesh position={[0, 1.22, 0.46]} rotation={[-0.55, 0, 0]}>
        <torusGeometry args={[0.3, 0.045, 6, 16]} /><meshStandardMaterial color="#173c48" />
      </mesh>
      <RoundedPart size={[1.66, 0.12, 0.4]} position={[0, 1.14, -1.08]} color="#ffb84d" radius={0.04} />
    </group>
    {[-1, 1].flatMap(side => [-0.86, 0.87].map(z => <Wheel key={`${side}-${z}`} x={side * 0.93} z={z} front={z > 0} runtime={runtime} />))}
    <KartEffects runtime={runtime} />
  </group>;
}
