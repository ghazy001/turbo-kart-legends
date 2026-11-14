import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshBasicMaterial, type Group } from 'three';
import { timeTrialConfig } from '../config/timeTrialConfig';
import { sampleGhost } from '../timeTrial/ghostPlayback';
import type { GhostPose } from '../timeTrial/types';
import type { GameRuntime } from './runtime';

/** Original lightweight hologram; no cloned GLB materials, shadows, effects or physical contacts. */
export function TimeTrialGhost({ runtime }: { runtime: GameRuntime }) {
  const root = useRef<Group>(null), front = useRef<(Group | null)[]>([]), wheels = useRef<(Group | null)[]>([]);
  const material = useMemo(() => new MeshBasicMaterial({ color: '#85fff0', transparent: true, opacity: timeTrialConfig.ghostOpacity, depthWrite: false }), []);
  const pose = useMemo<GhostPose>(() => ({ x: 0, y: 0, z: 0, heading: 0, steering: 0, wheelSpin: 0 }), []);
  useFrame(() => {
    if (!root.current) return;
    const race = runtime.race, frames = race.trial.reference?.ghost;
    root.current.visible = race.kind === 'time-trial' && runtime.mode !== 'menu' && race.phase !== 'finished'
      && !race.trial.invalid && runtime.trialGhostVisible && !!frames && sampleGhost(frames, race.renderTime, pose);
    if (!root.current.visible) return;
    root.current.position.set(pose.x, pose.y + 0.055, pose.z); root.current.rotation.y = pose.heading;
    const player = runtime.simulation.pose;
    material.opacity = timeTrialConfig.ghostOpacity * Math.min(1, Math.max(0.15, Math.hypot(pose.x - player.x, pose.z - player.z) / 4));
    for (const pivot of front.current) if (pivot) pivot.rotation.y = pose.steering;
    for (const wheel of wheels.current) if (wheel) wheel.rotation.x = pose.wheelSpin;
  }, -2);
  if (runtime.race.kind !== 'time-trial' || !runtime.race.trial.reference?.ghost) return null;
  return <group ref={root} visible={false} name="personal-best-ghost">
    <mesh material={material} position={[0, 0.52, 0]}><boxGeometry args={[1.65, 0.5, 2.4]} /></mesh>
    <mesh material={material} position={[0, 0.8, 0.68]}><boxGeometry args={[1.35, 0.28, 1.05]} /></mesh>
    <mesh material={material} position={[0, 1.1, -0.4]}><capsuleGeometry args={[0.33, 0.3, 4, 8]} /></mesh>
    {[-0.85, 0.85].flatMap((z, axle) => [-1, 1].map((side, sideIndex) => {
      const index = axle * 2 + sideIndex;
      return <group key={index} position={[side * 1.03, 0.42, z]} ref={node => { if (axle === 1) front.current[sideIndex] = node; }}>
        <group ref={node => { wheels.current[index] = node; }}><mesh material={material} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.39, 0.39, 0.3, 10]} /></mesh></group>
      </group>;
    }))}
    <mesh material={material} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.45, 1.5, 32]} /></mesh>
  </group>;
}
