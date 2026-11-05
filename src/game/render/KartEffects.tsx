import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D } from 'three';
import { boostTiers } from '../config/driftConfig';
import { chargeTier } from '../kart/driftController';
import type { KartVisualRuntime } from './runtime';

/** Pooled, local-space spark streaks and two original exhaust flares. */
export function KartEffects({ runtime }: { runtime: KartVisualRuntime }) {
  const sparks = useRef<InstancedMesh>(null);
  const flareGroup = useRef<Group>(null);
  const flareMaterials = useRef<(MeshBasicMaterial | null)[]>([]);
  const exhausts = useRef<(Mesh | null)[]>([]);
  const helpers = useMemo(() => ({ dummy: new Object3D(), color: new Color() }), []);
  const elapsed = useRef(0);
  const revision = useRef(-1);
  useFrame((_, delta) => {
    const pose = runtime.simulation.pose;
    if (revision.current !== runtime.simulation.revision) { elapsed.current = 0; revision.current = runtime.simulation.revision; }
    if (runtime.mode === 'playing') elapsed.current += Math.min(delta, 0.1);
    const tier = chargeTier(pose.driftCharge);
    if (sparks.current) {
      sparks.current.visible = pose.driftDirection !== 0 && pose.y < 0.02;
      helpers.color.set(tier ? boostTiers[tier - 1].color : '#ffebbd');
      for (let i = 0; i < 24; i++) {
        const phase = (elapsed.current * 2.8 + i / 24) % 1;
        const side = i % 2 ? 1 : -1;
        const spread = (i % 5) / 5;
        helpers.dummy.position.set(side * (1 + phase * (0.2 + spread)), 0.15 + Math.sin(phase * Math.PI) * (0.15 + spread * 0.2), -0.7 - phase * 2.3);
        helpers.dummy.rotation.set(0.2, side * phase, 0.7);
        const size = (1 - phase) * (tier ? 0.11 : 0.07);
        helpers.dummy.scale.set(size, size, size * 2.5);
        helpers.dummy.updateMatrix(); sparks.current.setMatrixAt(i, helpers.dummy.matrix);
        sparks.current.setColorAt(i, helpers.color);
      }
      sparks.current.instanceMatrix.needsUpdate = true;
      if (sparks.current.instanceColor) sparks.current.instanceColor.needsUpdate = true;
    }
    if (flareGroup.current) flareGroup.current.visible = pose.boostRemaining > 0;
    for (let i = 0; i < 2; i++) {
      const material = flareMaterials.current[i];
      const mesh = exhausts.current[i];
      if (material && pose.boostTier > 0) material.color.set(boostTiers[pose.boostTier - 1].color);
      if (mesh) mesh.scale.y = 0.8 + Math.sin(elapsed.current * 35) * 0.15 + pose.boostTier * 0.17;
    }
  }, -1);
  return <group>
    <instancedMesh ref={sparks} args={[undefined, undefined, 24]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} /><meshBasicMaterial toneMapped={false} />
    </instancedMesh>
    <group ref={flareGroup} visible={false}>
      {[-1, 1].map((side, i) => <group key={side} position={[side * 0.55, 0.57, -1.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh ref={node => { exhausts.current[i] = node; }} position={[0, 0.45, 0]}>
          <coneGeometry args={[0.25, 1.35, 10]} /><meshBasicMaterial ref={node => { flareMaterials.current[i] = node; }} color="#ffd069" transparent opacity={0.85} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.2, 0]}><coneGeometry args={[0.12, 0.65, 8]} /><meshBasicMaterial color="#fff8df" toneMapped={false} /></mesh>
      </group>)}
    </group>
  </group>;
}
