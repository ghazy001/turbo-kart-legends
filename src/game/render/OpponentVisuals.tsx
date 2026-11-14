import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import type { Racer } from '../race/RaceSession';
import type { GameRuntime, KartVisualRuntime } from './runtime';
import { KartVisual } from './KartVisual';
import { driverAssets, kartAssets, type VisualSelection } from '../config/visualAssets';
import { opponentSelections } from '../config/visualSelection';

function Opponent({ racer, runtime, selection }: { racer: Racer; runtime: GameRuntime; selection: VisualSelection }) {
  const group = useRef<Group>(null);
  const visual = useMemo<KartVisualRuntime>(() => ({ simulation: racer.simulation, get mode() { return runtime.mode; } }), [racer, runtime]);
  useFrame(() => {
    if (group.current) group.current.visible = runtime.race.kind === 'quick-race' && runtime.mode !== 'menu' && racer.progress.finishTime === null;
  }, -2);
  return <group ref={group} visible={false}>
    <KartVisual runtime={visual} kart={kartAssets[selection.kartId]} driver={driverAssets[selection.racerId]} />
  </group>;
}
export function OpponentVisuals({ runtime }: { runtime: GameRuntime }) {
  if (runtime.mode === 'menu' || runtime.race.kind !== 'quick-race') return null;
  const choices = opponentSelections(runtime.selection);
  return <group>{runtime.race.opponents.map((racer, i) => <Opponent key={racer.id} racer={racer} runtime={runtime} selection={choices[i]} />)}</group>;
}
