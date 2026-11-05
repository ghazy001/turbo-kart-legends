import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PCFShadowMap } from 'three';
import { cameraConfig, sceneConfig } from '../config/kartConfig';
import { NEUTRAL_INPUT } from '../core/types';
import { ChaseCamera } from './ChaseCamera';
import { Environment } from './Environment';
import { KartVisual } from './KartVisual';
import { TrackVisual } from './TrackVisual';
import type { GameRuntime } from './runtime';

function GameLoop({ runtime }: { runtime: GameRuntime }) {
  useFrame((_, delta) => {
    runtime.simulation.advance(delta, runtime.keyboard?.sample() ?? NEUTRAL_INPUT, runtime.mode === 'playing');
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

export function GameCanvas({ runtime, onError }: { runtime: GameRuntime; onError: () => void }) {
  return <SceneBoundary onError={onError}>
    <Canvas shadows={{ type: PCFShadowMap }} dpr={[1, sceneConfig.dprMax]}
      camera={{ fov: cameraConfig.fov, near: 0.1, far: 450 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      fallback={<div className="webgl-fallback">Interactive 3D circuit. A desktop browser with WebGL support is required.</div>}
      aria-label="Sunshine Circuit 3D kart game">
      <GameLoop runtime={runtime} />
      <Environment track={runtime.simulation.track} runtime={runtime} />
      <TrackVisual track={runtime.simulation.track} />
      <KartVisual runtime={runtime} />
      <ChaseCamera runtime={runtime} />
    </Canvas>
  </SceneBoundary>;
}
