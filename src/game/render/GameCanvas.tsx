import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PCFShadowMap } from 'three';
import { cameraConfig, sceneConfig } from '../config/kartConfig';
import { NEUTRAL_INPUT } from '../core/types';
import { ChaseCamera } from './ChaseCamera';
import { Environment } from './Environment';
import { KartVisual, type AssetStatus } from './KartVisual';
import { TrackVisual } from './TrackVisual';
import type { GameRuntime } from './runtime';
import { OpponentVisuals } from './OpponentVisuals';
import { RaceTrackVisual } from './RaceTrackVisual';
import { waypointInput } from '../ai/waypointController';
import { combineInputs } from '../controls/gamepad';

function GameLoop({ runtime, onFinish }: { runtime: GameRuntime; onFinish: () => void }) {
  useFrame((_, delta) => {
    const pad = runtime.gamepad?.poll() ?? NEUTRAL_INPUT;
    const human = combineInputs(runtime.keyboard?.sample() ?? NEUTRAL_INPUT, pad);
    const input = import.meta.env.DEV && runtime.demoDriving
      ? waypointInput(runtime.simulation.current, runtime.race.track, { id: 'player', lane: 0, targetSpeed: 18.2 }, runtime.race.racers.filter(racer => racer.progress.finishTime === null).map(racer => ({ id: racer.id, state: racer.simulation.current }))) : human;
    runtime.race.advance(delta, input, runtime.mode === 'playing');
    runtime.audio.update(runtime.simulation.current, runtime.mode === 'playing' && runtime.race.phase !== 'countdown');
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

export function GameCanvas({ runtime, onError, onFinish }: { runtime: GameRuntime; onError: () => void; onFinish: () => void }) {
  const [assetStatus, setAssetStatus] = useState<AssetStatus>('loading');
  return <SceneBoundary onError={onError}>
    <Canvas shadows={{ type: PCFShadowMap }} dpr={[1, sceneConfig.dprMax]}
      camera={{ fov: cameraConfig.fov, near: 0.1, far: 450 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      fallback={<div className="webgl-fallback">Interactive 3D circuit. A desktop browser with WebGL support is required.</div>}
      aria-label="Sunshine Circuit 3D kart game">
      <GameLoop runtime={runtime} onFinish={onFinish} />
      <Environment track={runtime.simulation.track} runtime={runtime} />
      <TrackVisual track={runtime.simulation.track} />
      <RaceTrackVisual runtime={runtime} />
      <OpponentVisuals runtime={runtime} />
      <KartVisual runtime={runtime} onStatus={setAssetStatus} />
      <ChaseCamera runtime={runtime} />
    </Canvas>
    {assetStatus !== 'ready' && <p className="asset-status" role={assetStatus === 'error' ? 'alert' : 'status'}>
      {assetStatus === 'error' ? 'Model unavailable. Using the original kart. Reload to retry.' : 'Loading kart & driver…'}
    </p>}
  </SceneBoundary>;
}
