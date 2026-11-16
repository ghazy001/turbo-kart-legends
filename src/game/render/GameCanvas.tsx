import { sunshineAssetSlots } from './SunshineAssetScenery';
import { surfaceHeightAt } from '../tracks/trackSurface';
import { TrackFeaturesVisual } from './TrackFeaturesVisual';
import { RenderStats, type RenderSample } from '../dev/RenderStats';
import { driverAssets, kartAssets } from '../config/visualAssets';
import { Component, Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { createPortal } from 'react-dom';
import { PCFShadowMap } from 'three';
import { cameraConfig, sceneConfig } from '../config/kartConfig';
import { NEUTRAL_INPUT } from '../core/types';
import { ChaseCamera } from './ChaseCamera';
import { Environment } from './Environment';
import { KartVisual } from './KartVisual';
import { preloadAssembly } from './KartAssembly';
import { RaceAssetLoading } from './models/RaceAssetLoading';
import { opponentSelections } from '../config/visualSelection';
import { TrackVisual } from './TrackVisual';
import type { GameRuntime } from './runtime';
import { ItemVisuals } from './ItemVisuals';
import { OpponentVisuals } from './OpponentVisuals';
import { RaceTrackVisual } from './RaceTrackVisual';
import { waypointInput } from '../ai/waypointController';
import { mixHumanInputs } from '../controls/inputSources';
import { TimeTrialGhost } from './TimeTrialGhost';

function GameLoop({ runtime, onFinish, assets }: { runtime: GameRuntime; onFinish: () => void; assets: RaceAssetLoading }) {
  const firstReadyFrame = useRef(true);
  useFrame((_, delta) => {
    const pad = runtime.gamepad?.poll() ?? NEUTRAL_INPUT;
    if (!assets.getSnapshot().ready) {
      firstReadyFrame.current = true;
      runtime.race.pause(); runtime.audio.silence();
      runtime.keyboard?.clear(); runtime.gamepad?.clear(); runtime.phone.clear(); runtime.uiInput.clear();
      return;
    }
    // Loading/decoding time must not consume countdown or simulation time.
    if (firstReadyFrame.current) { runtime.race.pause(); delta = 0; firstReadyFrame.current = false; }
    const human = mixHumanInputs(runtime.keyboard?.sample() ?? NEUTRAL_INPUT, pad, runtime.phone.sample(runtime.mode === 'playing'), runtime.uiInput.sample());
    const input = import.meta.env.DEV && runtime.demoDriving
      ? waypointInput(runtime.simulation.current, runtime.race.track, { id: 'player', lane: runtime.demoLane ?? 0, targetSpeed: runtime.demoSpeed ?? 18.2 }, runtime.race.racers.filter(racer => racer.progress.finishTime === null).map(racer => ({ id: racer.id, state: racer.simulation.current }))) : human;
    if (import.meta.env.DEV && runtime.demoDriving) input.useItem = !!runtime.demoItems && runtime.race.items.shouldFire('player', runtime.race.racers) || !!human.useItem;
    runtime.race.advance(delta, input, runtime.mode === 'playing');
    runtime.audio.update(runtime.simulation.current, runtime.mode === 'playing' && runtime.race.phase !== 'countdown', surfaceHeightAt(runtime.simulation.track, runtime.simulation.current));
    runtime.audio.updateItems(runtime.race.items, runtime.mode === 'playing' && runtime.race.phase === 'racing');
    if (runtime.mode === 'playing' && runtime.race.phase === 'finished') onFinish();
  }, -3);
  return null;
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unable to render the circuit', error, info.componentStack);
    this.props.onError();
  }
  render() {
    return this.state.failed ? <div className="webgl-fallback" role="alert">
      <h2>The circuit couldn’t start</h2><p>Use a desktop browser with WebGL and hardware acceleration enabled.</p>
      <button onClick={() => window.location.reload()}>Try again</button>
    </div> : this.props.children;
  }
}

export function GameCanvas({ runtime, onError, onFinish, suspended = false, sceneRevision = 0 }: { runtime: GameRuntime; onError: () => void; onFinish: () => void; suspended?: boolean; sceneRevision?: number }) {
  const [renderSample, setRenderSample] = useState<RenderSample | null>(null);
  const stats = import.meta.env.DEV && new URLSearchParams(window.location.search).has('render-stats');
  const race = runtime.race, selection = runtime.selection, kind = race.kind;
  const lineup = useMemo(() => {
    const choices = opponentSelections(selection);
    return [{ id: 'player', selection }, ...(kind === 'quick-race' ? race.opponents.map((racer, i) => ({ id: racer.id, selection: choices[i] })) : [])];
  }, [race, kind, selection]);
  const assets = useMemo(() => new RaceAssetLoading([...lineup.map(entry => entry.id), ...(race.track.definition.id === 'sunshine-circuit' ? sunshineAssetSlots : [])]), [lineup, race.track]);
  const assetStatus = useSyncExternalStore(assets.subscribe, assets.getSnapshot);
  useLayoutEffect(() => { runtime.assetsReady = assetStatus.ready; }, [runtime, assetStatus.ready]);
  useEffect(() => { for (const entry of lineup) preloadAssembly(kartAssets[entry.selection.kartId], driverAssets[entry.selection.racerId]); }, [lineup]);
  return <SceneBoundary onError={onError}>
    <Canvas frameloop={suspended ? 'never' : 'always'} shadows={{ type: PCFShadowMap }} dpr={[1, sceneConfig.dprMax]}
      style={{ visibility: assetStatus.ready ? 'visible' : 'hidden' }}
      camera={{ fov: cameraConfig.fov, near: 0.1, far: 450 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      fallback={<div className="webgl-fallback">Interactive 3D circuit. A desktop browser with WebGL support is required.</div>}
      aria-label={`${runtime.race.track.definition.name} 3D kart game`}>
      {stats && <RenderStats onSample={setRenderSample} />}
      <Fragment key={`${sceneRevision}:${selection.kartId}:${selection.racerId}:${kind}`}>
        <GameLoop runtime={runtime} onFinish={onFinish} assets={assets} />
        <Environment track={runtime.simulation.track} runtime={runtime} statusFor={assets.reporter} />
        <TrackVisual track={runtime.simulation.track} />
        <TrackFeaturesVisual track={runtime.simulation.track} active={runtime.mode === 'playing'} />
        <RaceTrackVisual runtime={runtime} />
        <OpponentVisuals runtime={runtime} statusFor={assets.reporter} />
        <TimeTrialGhost runtime={runtime} />
        <ItemVisuals runtime={runtime} />
        <KartVisual runtime={runtime} kart={kartAssets[selection.kartId]} driver={driverAssets[selection.racerId]} onStatus={assets.reporter('player')} />
        <ChaseCamera runtime={runtime} />
      </Fragment>
    </Canvas>
    {stats && renderSample && <output className="render-stats">Render: {renderSample.calls} calls · {renderSample.triangles.toLocaleString()} triangles · {renderSample.geometries} geometries · {renderSample.textures} textures · median {renderSample.medianMs.toFixed(1)} ms · p95 {renderSample.p95Ms.toFixed(1)} ms</output>}
    {!suspended && !assetStatus.ready && createPortal(<div className="race-loading" role="status" aria-live="polite">
      <span className="micro-label">TURBO KART LEGENDS</span><h1>Getting the grid ready<span>…</span></h1>
      <p>Loading racers, karts & scenery</p><progress aria-label="Race assets ready" value={assetStatus.settled} max={assetStatus.total} />
    </div>, document.body)}
    {!suspended && assetStatus.failed > 0 && createPortal(<p className="asset-status" role="alert">{assetStatus.failed} asset{assetStatus.failed === 1 ? '' : 's'} unavailable. Racer fallbacks remain playable; missing scenery is omitted. Reload to retry.</p>, document.body)}
  </SceneBoundary>;
}
