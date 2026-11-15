import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import type { Racer } from '../race/RaceSession';
import type { GameRuntime, KartVisualRuntime } from './runtime';
import { KartVisual } from './KartVisual';
import { driverAssets, kartAssets, type VisualSelection } from '../config/visualAssets';
import { opponentSelections } from '../config/visualSelection';
import type { AssetStatusReporter } from './models/RaceAssetLoading';

function Opponent({ racer, runtime, selection, onStatus }: { racer: Racer; runtime: GameRuntime; selection: VisualSelection; onStatus?: AssetStatusReporter }) {
  const group = useRef<Group>(null);
  const visual = useMemo<KartVisualRuntime>(() => ({ simulation: racer.simulation, get mode() { return runtime.mode; } }), [racer, runtime]);
  useFrame(() => {
    if (group.current) group.current.visible = runtime.race.kind === 'quick-race' && runtime.mode !== 'menu' && racer.progress.finishTime === null;
  }, -2);
  return <group ref={group} visible={false}>
    <KartVisual runtime={visual} kart={kartAssets[selection.kartId]} driver={driverAssets[selection.racerId]} onStatus={onStatus} />
  </group>;
}
export function OpponentVisuals({ runtime, statusFor }: { runtime: GameRuntime; statusFor: (id: string) => AssetStatusReporter }) {
  if (runtime.mode === 'menu' || runtime.race.kind !== 'quick-race') return null;
  const choices = opponentSelections(runtime.selection);
  return <group>{runtime.race.opponents.map((racer, i) => <Opponent key={racer.id} racer={racer} runtime={runtime} selection={choices[i]} onStatus={statusFor(racer.id)} />)}</group>;
}
