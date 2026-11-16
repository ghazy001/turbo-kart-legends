import { sunshineAssetLayout } from '../tracks/sunshineAssetLayout';
import { SunshineAssetScenery } from './SunshineAssetScenery';
import type { AssetStatusReporter } from './models/RaceAssetLoading';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, MeshStandardMaterial, Object3D, Group } from 'three';
import type { SampledTrack } from '../core/types';
import { sunshineScenery, type ScenicInstance } from '../tracks/sunshineScenery';

function ScenicBatch({ instances, shape }: { instances: ScenicInstance[]; shape: 'box' | 'rock' }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const object = new Object3D(), color = new Color();
    instances.forEach((instance, i) => {
      object.position.set(...instance.position); object.scale.set(...instance.scale); object.rotation.set(...instance.rotation); object.updateMatrix();
      mesh.current!.setMatrixAt(i, object.matrix); mesh.current!.setColorAt(i, color.set(instance.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [instances]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, instances.length]} castShadow receiveShadow>
    {shape === 'box' ? <boxGeometry /> : <icosahedronGeometry args={[1, 0]} />}
    <meshStandardMaterial roughness={0.9} flatShading={shape === 'rock'} />
  </instancedMesh>;
}
function Lagoon({ runtime }: { runtime: { mode: string } }) {
  const water = useRef<MeshStandardMaterial>(null), wind = useRef<Group>(null), time = useRef(0);
  useFrame((_, delta) => {
    if (runtime.mode !== 'playing') return;
    time.current += Math.min(delta, 0.1);
    if (water.current) water.current.roughness = 0.39 + Math.sin(time.current * 0.45) * 0.035;
    if (wind.current) wind.current.rotation.y = time.current * 0.55;
  });
  return <group position={[0, 0, 12]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[59, 72, 1]} receiveShadow><circleGeometry args={[1, 80]} /><meshStandardMaterial color="#dbcba4" roughness={1} /></mesh>
    <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[54, 67, 1]}><circleGeometry args={[1, 80]} /><meshStandardMaterial ref={water} color="#50ada9" metalness={0.15} roughness={0.42} /></mesh>
    {[0, 1, 2].map(i => <mesh key={i} position={[0, 0.024 + i * 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[51 - i * 3, 64 - i * 3, 1]}><ringGeometry args={[0.995, 1, 80]} /><meshBasicMaterial color="#a9dbce" transparent opacity={0.3} depthWrite={false} /></mesh>)}
    <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[16, 32]} /><meshStandardMaterial color="#d9c89c" /></mesh>
    <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[13, 32]} /><meshStandardMaterial color="#9bb57c" /></mesh>
    <group position={[0, 0.1, 0]}>
      <mesh position={[0, 8, 0]} castShadow><cylinderGeometry args={[2.1, 3.3, 16, 12]} /><meshStandardMaterial color="#f3e8cc" /></mesh>
      {[5, 11].map(y => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[y === 5 ? 2.94 : 2.5, y === 5 ? 3.02 : 2.58, 1.2, 12]} /><meshStandardMaterial color="#dd9676" /></mesh>)}
      <mesh position={[0, 16.3, 0]} castShadow><cylinderGeometry args={[3.1, 3.1, 0.5, 12]} /><meshStandardMaterial color="#376970" /></mesh>
      <mesh position={[0, 17.8, 0]}><cylinderGeometry args={[1.9, 1.9, 2.5, 12]} /><meshStandardMaterial color="#b5ddd5" emissive="#b5a66c" emissiveIntensity={0.2} /></mesh>
      <mesh position={[0, 19.6, 0]} castShadow><coneGeometry args={[3.1, 1.6, 12]} /><meshStandardMaterial color="#d79870" /></mesh>
      <group ref={wind} position={[0, 21.5, 0]}>
        <mesh><cylinderGeometry args={[0.06, 0.06, 2.5, 6]} /><meshStandardMaterial color="#475f62" /></mesh>
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[4, 0.12, 0.12]} /><meshStandardMaterial color="#f0ca73" /></mesh>
        <mesh position={[1.6, 0.5, 0]}><coneGeometry args={[0.5, 0.9, 3]} /><meshStandardMaterial color="#f0ca73" /></mesh>
      </group>
    </group>
  </group>;
}
export function SunshineScenery({ track, runtime, statusFor }: { track: SampledTrack; runtime: { mode: string }; statusFor: (id: string) => AssetStatusReporter }) {
  const layout = useMemo(() => sunshineScenery(track), [track]);
  const placements = useMemo(() => sunshineAssetLayout(track), [track]);
  return <group name="sunshine-coastal-venue">
    <ScenicBatch instances={layout.boxes} shape="box" /><ScenicBatch instances={layout.rocks} shape="rock" />
    <SunshineAssetScenery placements={placements} statusFor={statusFor} />
    <Lagoon runtime={runtime} />
  </group>;
}
