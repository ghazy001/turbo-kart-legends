import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import type { Racer } from '../race/RaceSession';
import type { GameRuntime, KartVisualRuntime } from './runtime';
import { ProceduralKartVisual } from './ProceduralKartVisual';

function Opponent({ racer, runtime }: { racer: Racer; runtime: GameRuntime }) {
  const group = useRef<Group>(null);
  const visual = useMemo<KartVisualRuntime>(() => ({ simulation: racer.simulation, get mode() { return runtime.mode; } }), [racer, runtime]);
  useFrame(() => {
    if (group.current) group.current.visible = runtime.race.kind === 'quick-race' && runtime.mode !== 'menu' && racer.progress.finishTime === null;
  }, -2);
  return <group ref={group} visible={false}>
    <ProceduralKartVisual runtime={visual} bodyColor={racer.color} helmetColor={racer.color} />
  </group>;
}
export function OpponentVisuals({ runtime }: { runtime: GameRuntime }) {
  return <group>{runtime.race.opponents.map(racer => <Opponent key={racer.id} racer={racer} runtime={runtime} />)}</group>;
}
