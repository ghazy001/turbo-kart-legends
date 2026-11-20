import { AdaptiveQuality } from './AdaptiveQuality';
import { GraphicsContextGuard } from './GraphicsContextGuard';
import { LoadingScreen } from '../ui/LoadingScreen';
import { SceneWarmup } from './SceneWarmup';
import type { PreparationProgress } from './models/sceneWarmup';
import { performanceConfig } from '../config/performanceConfig';
import { environmentSlotsForTrack } from '../config/environmentAssets';
import { surfaceHeightAt } from '../tracks/trackSurface';
import { TrackFeaturesVisual } from './TrackFeaturesVisual';
import { RenderStats, type RenderSample } from '../dev/RenderStats';
import { driverAssets, kartAssets } from '../config/visualAssets';
import { Component, Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { createPortal } from 'react-dom';
import { PCFShadowMap } from 'three';
import { cameraConfig, sceneConfig } from '../config/kartConfig';
import { NEUTRAL_INPUT } from '../core/types';
import { ChaseCamera } from './ChaseCamera';
import { Environment } from './Environment';
import { KartVisual } from './KartVisual';
import { preloadAssembly } from './KartAssembly';
import { RaceAssetLoading, itemVisualSlots } from './models/RaceAssetLoading';
import { opponentSelections } from '../config/visualSelection';
import { TrackVisual } from './TrackVisual';
import type { GameRuntime } from './runtime';
import { ItemVisuals } from './ItemVisuals';
import { OpponentVisuals } from './OpponentVisuals';
import { RaceTrackVisual } from './RaceTrackVisual';
import { waypointInput } from '../ai/waypointController';
import { mixHumanInputs } from '../controls/inputSources';
import { TimeTrialGhost } from './TimeTrialGhost';

function GameLoop({ runtime, onFinish }: { runtime: GameRuntime; onFinish: () => void }) {
  const firstReadyFrame = useRef(true);
  useFrame((_, delta) => {
    const pad = runtime.gamepad?.poll() ?? NEUTRAL_INPUT;
    if (!runtime.assetsReady) {
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
    runtime.audio.update(runtime.simulation.current, runtime.mode === 'playing' && runtime.race.phase !== 'countdown', surfaceHeightAt(runtime.simulation.track, runtime.simulation.current), input);
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

export function GameCanvas({ runtime, onError, onFinish, suspended = false, sceneRevision = 0, onCancel, onSuspend }: { onSuspend: () => void; onCancel: () => void; runtime: GameRuntime; onError: () => void; onFinish: () => void; suspended?: boolean; sceneRevision?: number }) {
  // Keep Canvas's declared DPR in sync; unrelated React updates must not restore the maximum.
  const [dpr, setDpr] = useState(() => Math.max(1, Math.min(window.devicePixelRatio || 1, sceneConfig.dprMax)));
  const [renderSample, setRenderSample] = useState<RenderSample | null>(null);
  const stats = import.meta.env.DEV && new URLSearchParams(window.location.search).has('render-stats');
  const race = runtime.race, selection = runtime.selection, kind = race.kind;
  const lineup = useMemo(() => {
    const choices = opponentSelections(selection);
    return [{ id: 'player', selection }, ...(kind === 'quick-race' ? race.opponents.map((racer, i) => ({ id: racer.id, selection: choices[i] })) : [])];
  }, [race, kind, selection]);
  const assets = useMemo(() => new RaceAssetLoading([...lineup.map(entry => entry.id), ...environmentSlotsForTrack(race.track.definition.id), ...itemVisualSlots(race.items.enabled)]), [lineup, race.track, race.items.enabled]);
  const assetStatus = useSyncExternalStore(assets.subscribe, assets.getSnapshot);
  const [contextLost, setContextLost] = useState(false), [contextEpoch, setContextEpoch] = useState(0);
  const [prepared, setPrepared] = useState<RaceAssetLoading | null>(null), [released, setReleased] = useState<RaceAssetLoading | null>(null);
  const [preparation, setPreparation] = useState<{ owner: RaceAssetLoading; progress?: PreparationProgress; error?: string } | null>(null);
  const onProgress = useCallback((progress: PreparationProgress) => setPreparation({ owner: assets, progress }), [assets]);
  const onPrepared = useCallback(() => setPrepared(assets), [assets]);
  const preparationError = useCallback((error: string) => setPreparation({ owner: assets, error }), [assets]);
  const renderReady = !contextLost && prepared === assets && assetStatus.ready, ready = renderReady && released === assets;
  const progress = preparation?.owner === assets ? preparation.progress : undefined;
  const error = contextLost ? 'Graphics paused. Waiting for your browser to restore the display, or reload to try again.' : preparation?.owner === assets ? preparation.error : undefined;
  const lostContext = useCallback(() => { setContextLost(true); setPrepared(null); setReleased(null); onSuspend(); }, [onSuspend]);
  const restoredContext = useCallback(() => { setContextLost(false); setPrepared(null); setReleased(null); setPreparation(null); setContextEpoch(value => value + 1); }, []);
  useLayoutEffect(() => { runtime.assetsReady = ready; }, [runtime, ready]);
  useEffect(() => {
    if (!renderReady || suspended) return;
    const timer = window.setTimeout(() => setReleased(assets), performanceConfig.revealMs);
    return () => window.clearTimeout(timer);
  }, [renderReady, suspended, assets]);
  useEffect(() => { for (const entry of lineup) preloadAssembly(kartAssets[entry.selection.kartId], driverAssets[entry.selection.racerId]); }, [lineup]);
  return <SceneBoundary onError={onError}>
    <Canvas frameloop={suspended ? 'never' : 'always'} shadows={{ type: PCFShadowMap }} dpr={dpr}
      style={{ visibility: renderReady ? 'visible' : 'hidden' }}
      camera={{ fov: cameraConfig.fov, near: 0.1, far: 450 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      fallback={<div className="webgl-fallback">Interactive 3D circuit. A desktop browser with WebGL support is required.</div>}
      aria-label={`${runtime.race.track.definition.name} 3D kart game`}>
      <AdaptiveQuality runtime={runtime} onChange={setDpr} /><GraphicsContextGuard runtime={runtime} onLost={lostContext} onRestored={restoredContext} />
      {stats && <RenderStats onSample={setRenderSample} />}
      <Fragment key={`${sceneRevision}:${selection.kartId}:${selection.racerId}:${kind}`}>
        <GameLoop runtime={runtime} onFinish={onFinish} />
        <SceneWarmup key={contextEpoch} enabled={!suspended && !contextLost && assetStatus.ready && !renderReady && !error} onProgress={onProgress} onReady={onPrepared} onError={preparationError} />
        <Environment track={runtime.simulation.track} runtime={runtime} statusFor={assets.reporter} />
        <TrackVisual track={runtime.simulation.track} />
        <TrackFeaturesVisual track={runtime.simulation.track} active={runtime.mode === 'playing'} />
        <RaceTrackVisual runtime={runtime} />
        <OpponentVisuals runtime={runtime} statusFor={assets.reporter} />
        <TimeTrialGhost runtime={runtime} />
        <ItemVisuals runtime={runtime} statusFor={assets.reporter} />
        <KartVisual runtime={runtime} kart={kartAssets[selection.kartId]} driver={driverAssets[selection.racerId]} onStatus={assets.reporter('player')} />
        <ChaseCamera runtime={runtime} />
      </Fragment>
    </Canvas>
    {stats && renderSample && <output className="render-stats">Render: DPR {renderSample.dpr.toFixed(2)} · {renderSample.calls} calls · {renderSample.triangles.toLocaleString()} triangles · {renderSample.geometries} geometries · {renderSample.textures} textures · median {renderSample.medianMs.toFixed(1)} ms · p95 {renderSample.p95Ms.toFixed(1)} ms</output>}
    {!suspended && !ready && createPortal(<LoadingScreen title={race.track.definition.name}
      description={!assetStatus.ready ? 'Loading your lineup and the circuit' : progress?.phase === 'textures' ? 'Preparing the finishing touches' : 'Getting everything ready for a smooth start'}
      stage={renderReady ? 'ready' : assetStatus.ready ? 'prepare' : 'load'}
      progress={renderReady ? 1 : !assetStatus.ready ? assetStatus.settled / Math.max(1, assetStatus.total) * 0.75 : progress?.phase === 'textures' ? 0.75 + progress.completed / Math.max(1, progress.total) * 0.15 : 0.95}
      detail={!assetStatus.ready ? `${assetStatus.settled} / ${assetStatus.total} assets ready` : undefined} error={error} onCancel={onCancel} />, document.body)}
    {!suspended && assetStatus.failed > 0 && createPortal(<p className="asset-status" role="alert">{assetStatus.failed} asset{assetStatus.failed === 1 ? '' : 's'} unavailable. Racer fallbacks remain playable; missing scenery is omitted. Reload to retry.</p>, document.body)}
  </SceneBoundary>;
}
