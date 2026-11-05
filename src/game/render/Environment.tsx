import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DirectionalLight, InstancedMesh, Object3D } from 'three';
import type { SampledTrack } from '../core/types';
import { nearestRoadPoint } from '../tracks/trackSampling';
import { paintedTexture } from './paintedTexture';
import type { GameRuntime } from './runtime';

const random = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
interface Prop { x: number; z: number; scale: number; rotation: number }

function Forest({ track }: { track: SampledTrack }) {
  const trunks = useRef<InstancedMesh>(null);
  const leaves = useRef<InstancedMesh>(null);
  const rocks = useRef<InstancedMesh>(null);
  const props = useMemo(() => {
    const trees: Prop[] = [];
    const stones: Prop[] = [];
    for (let i = 0; i < 450; i++) {
      const x = (random(i + 4) - 0.5) * 390;
      const z = (random(i + 800) - 0.5) * 390;
      if (nearestRoadPoint(track, { x, z }).distance < 12) continue;
      const prop = { x, z, scale: 0.8 + random(i + 90) * 1.5, rotation: random(i + 30) * Math.PI * 2 };
      if (i % 5 === 0) stones.push(prop); else trees.push(prop);
    }
    return { trees, stones };
  }, [track]);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    props.trees.forEach((p, i) => {
      dummy.position.set(p.x, p.scale * 1.3, p.z);
      dummy.scale.set(p.scale * 0.25, p.scale * 2.6, p.scale * 0.25);
      dummy.rotation.set(0, p.rotation, 0); dummy.updateMatrix();
      trunks.current?.setMatrixAt(i, dummy.matrix);
      for (let layer = 0; layer < 2; layer++) {
        dummy.position.y = (2.7 + layer * 1.3) * p.scale;
        dummy.scale.set(p.scale * (1.7 - layer * 0.4), p.scale * (1.8 - layer * 0.2), p.scale * (1.7 - layer * 0.4));
        dummy.updateMatrix(); leaves.current?.setMatrixAt(i * 2 + layer, dummy.matrix);
        leaves.current?.setColorAt(i * 2 + layer, new Color(['#277f62', '#368e60', '#56a967', '#1d8c78'][i % 4]));
      }
    });
    props.stones.forEach((p, i) => {
      dummy.position.set(p.x, 0.4 * p.scale, p.z); dummy.rotation.set(0.2, p.rotation, 0.1);
      dummy.scale.set(p.scale * 1.2, p.scale * 0.8, p.scale); dummy.updateMatrix();
      rocks.current?.setMatrixAt(i, dummy.matrix);
    });
    [trunks.current, leaves.current, rocks.current].forEach(mesh => {
      if (mesh) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }
    });
    if (leaves.current?.instanceColor) leaves.current.instanceColor.needsUpdate = true;
  }, [props]);
  return <group>
    <instancedMesh ref={trunks} args={[undefined, undefined, props.trees.length]} castShadow>
      <cylinderGeometry args={[0.8, 1, 1, 6]} /><meshStandardMaterial color="#bb8659" />
    </instancedMesh>
    <instancedMesh ref={leaves} args={[undefined, undefined, props.trees.length * 2]} castShadow>
      <icosahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={1} />
    </instancedMesh>
    <instancedMesh ref={rocks} args={[undefined, undefined, props.stones.length]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#a7bba5" flatShading />
    </instancedMesh>
  </group>;
}

function StartArea({ track }: { track: SampledTrack }) {
  const sign = useMemo(() => paintedTexture('SUNSHINE', '#143e49', '#fff3c9', 'C I R C U I T   /   T U R B O   K A R T   L E G E N D S'), []);
  const banner = useMemo(() => paintedTexture('LET’S ROLL!', '#ff7756', '#fff6da'), []);
  useEffect(() => () => { sign.dispose(); banner.dispose(); }, [sign, banner]);
  return <group position={[track.spawn.x, 0, track.spawn.z]} rotation={[0, track.spawn.heading, 0]}>
    <group position={[0, 0, 10]}>
      {[-1, 1].map(side => <group key={side} position={[side * 6.5, 0, 0]}>
        <mesh position={[0, 3.4, 0]} castShadow><cylinderGeometry args={[0.22, 0.32, 6.8, 8]} /><meshStandardMaterial color="#fff0c9" /></mesh>
        <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.1, 1, 1.1]} /><meshStandardMaterial color="#ff7958" /></mesh>
        <mesh position={[0, 7.1, 0]}><sphereGeometry args={[0.44, 10, 8]} /><meshStandardMaterial color="#ffbd58" /></mesh>
      </group>)}
      <mesh position={[0, 6.2, 0]} castShadow><boxGeometry args={[13.5, 1.9, 0.5]} /><meshStandardMaterial color="#153d49" /></mesh>
      <mesh position={[0, 6.25, -0.261]} rotation={[0, Math.PI, 0]}><planeGeometry args={[12.9, 1.65]} /><meshStandardMaterial map={sign} /></mesh>
      <mesh position={[0, 6.25, 0.261]}><planeGeometry args={[12.9, 1.65]} /><meshStandardMaterial map={sign} /></mesh>
    </group>
    {[-1, 1].map(side => <group key={side} position={[side * 10, 0, 25]}>
      {[0, 7].map(z => <mesh key={z} position={[0, 2.3, z]} castShadow><cylinderGeometry args={[0.07, 0.07, 4.6, 6]} /><meshStandardMaterial color="#f9e9bf" /></mesh>)}
      {[-1, 1].map(face => <mesh key={face} position={[face * 0.01, 3.35, 3.5]} rotation={[0, face * Math.PI / 2, 0]}><planeGeometry args={[7, 1.7]} /><meshStandardMaterial map={banner} /></mesh>)}
    </group>)}
    {[0, 1, 2, 3].map(i => <group key={i} position={[8.8, 0, -10 + i * 4]}>
      <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.055, 0.055, 4.4, 6]} /><meshStandardMaterial color="#fff2ce" /></mesh>
      <mesh position={[0, 3.8, 0.6]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.2, 0.9]} /><meshStandardMaterial color={i % 2 ? '#ffb95d' : '#ff7857'} side={2} /></mesh>
    </group>)}
  </group>;
}

export function Environment({ track, runtime }: { track: SampledTrack; runtime: GameRuntime }) {
  const light = useRef<DirectionalLight>(null);
  const lightTarget = useMemo(() => new Object3D(), []);
  useFrame(() => {
    const pose = runtime.simulation.pose;
    light.current?.position.set(pose.x - 35, 65, pose.z - 25);
    lightTarget.position.set(pose.x, 0, pose.z);
    lightTarget.updateMatrixWorld();
  }, -1);
  return <group>
    <color attach="background" args={['#b3e2e5']} />
    <fog attach="fog" args={['#b3e2e5', 100, 280]} />
    <hemisphereLight args={['#fff8de', '#5f9566', 2.1]} />
    <primitive object={lightTarget} />
    <directionalLight ref={light} target={lightTarget} position={[-45, 70, -40]} intensity={2.6} color="#fff0cf" castShadow
      shadow-mapSize={[1024, 1024]} shadow-camera-left={-30} shadow-camera-right={30}
      shadow-camera-top={30} shadow-camera-bottom={-30} shadow-camera-far={180} shadow-bias={-0.0005} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[1600, 1600]} /><meshStandardMaterial color="#a2c76b" roughness={1} /></mesh>
    <Forest track={track} />
    <StartArea track={track} />
    {Array.from({ length: 12 }, (_, i) => {
      const angle = i / 12 * Math.PI * 2;
      return <mesh key={i} position={[Math.cos(angle) * 245, 3, Math.sin(angle) * 245]} scale={[35 + random(i) * 40, 14 + random(i + 3) * 20, 40]}>
        <icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color={i % 2 ? '#8cba7d' : '#91c4a1'} flatShading />
      </mesh>;
    })}
    {Array.from({ length: 9 }, (_, i) => <group key={i} position={[(random(i + 80) - 0.5) * 460, 35 + random(i + 20) * 20, (random(i + 10) - 0.5) * 460]}>
      {[0, 1, 2].map(j => <mesh key={j} position={[j * 5, j === 1 ? 2 : 0, 0]} scale={[7, 3.2, 4]}>
        <sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial color="#fff7e6" />
      </mesh>)}
    </group>)}
  </group>;
}
