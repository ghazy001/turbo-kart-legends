import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { raceConfig } from '../config/raceConfig';
import { pointAtDistance } from '../race/trackProgress';
import { offsetSample } from '../tracks/trackSampling';
import type { GameRuntime } from './runtime';

/** Paint and off-road markers only. Gate validation uses these exact road samples. */
export function RaceTrackVisual({ runtime }: { runtime: GameRuntime }) {
  const group = useRef<Group>(null);
  const nextGate = useRef<Group>(null);
  const race = runtime.race;
  useFrame(() => {
    if (group.current) group.current.visible = runtime.mode !== 'menu' && race.kind !== 'free-drive';
    const gate = race.checkpoints[race.player.progress.nextCheckpoint];
    if (nextGate.current) {
      nextGate.current.position.set(gate.x, 0.075, gate.z);
      nextGate.current.rotation.y = Math.atan2(gate.tx, gate.tz);
      nextGate.current.visible = race.phase === 'racing';
    }
  }, -1);
  return <group ref={group} visible={false}>
    {race.checkpoints.slice(1).map(gate => <group key={gate.id} position={[gate.x, 0.065, gate.z]} rotation={[0, Math.atan2(gate.tx, gate.tz), 0]}>
      {[-1, 1].map(side => <group key={side} position={[side * (gate.halfWidth + 0.7), 0, 0]}>
        <mesh position={[0, 0.8, 0]} castShadow><cylinderGeometry args={[0.09, 0.12, 1.6, 6]} /><meshStandardMaterial color="#ffedbc" /></mesh>
        <mesh position={[side * 0.35, 1.35, 0]}><boxGeometry args={[0.7, 0.45, 0.04]} /><meshStandardMaterial color={gate.id % 4 === 0 ? '#ffb84d' : '#45a9a3'} /></mesh>
      </group>)}
    </group>)}
    <group ref={nextGate}>
      {[-1, 1].map(side => <mesh key={side} position={[side * 3.8, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.27, 0.45, 3]} /><meshBasicMaterial color="#bdf58b" transparent opacity={0.85} depthWrite={false} />
      </mesh>)}
    </group>
    {Array.from({ length: 4 }, (_, index) => {
      const point = pointAtDistance(race.track, (race.track.definition.startDistance ?? 0) - raceConfig.gridBack - Math.floor(index / 2) * raceConfig.gridSpacing);
      const position = offsetSample(point, (index % 2 ? 1 : -1) * raceConfig.gridLane);
      return <group key={index} position={[position.x, 0.067, position.z]} rotation={[0, Math.atan2(point.tx, point.tz), 0]}>
        {[-1, 1].map(side => <mesh key={side} position={[side * 1.3, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.09, 3]} /><meshStandardMaterial color="#fff1cf" /></mesh>)}
        <mesh position={[0, 0, -1.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.7, 0.09]} /><meshStandardMaterial color="#fff1cf" /></mesh>
      </group>;
    })}
  </group>;
}
