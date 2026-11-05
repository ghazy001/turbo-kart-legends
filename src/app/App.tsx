import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { createKeyboard } from '../game/controls/keyboard';
import type { GameMode } from '../game/core/types';
import { GameCanvas } from '../game/render/GameCanvas';
import type { GameRuntime } from '../game/render/runtime';
import { sunshineCircuit } from '../game/tracks/sunshineCircuit';
import { HUD } from '../game/ui/HUD';
import { PauseMenu } from '../game/ui/PauseMenu';
import { StartMenu } from '../game/ui/StartMenu';
import { ResultsMenu } from '../game/ui/ResultsMenu';
import { GamepadController } from '../game/controls/gamepad';
import { DrivingAudio } from '../game/render/DrivingAudio';
import { RaceSession, raceKindNames, type RaceKind } from '../game/race/RaceSession';

const Diagnostics = import.meta.env.DEV && new URLSearchParams(window.location.search).has('race-preview')
  ? lazy(() => import('../game/dev/RaceDiagnostics').then(module => ({ default: module.RaceDiagnostics }))) : null;

// Reload rather than retain a stale race/controller instance through Fast Refresh.
if (import.meta.hot) {
  import.meta.hot.accept([
    '../game/core/simulation', '../game/race/RaceSession', '../game/race/raceProgress',
    '../game/ai/waypointController', '../game/controls/keyboard', '../game/controls/gamepad',
    '../game/render/DrivingAudio', '../game/tracks/sunshineCircuit',
  ], () => window.location.reload());
}

export function App() {
  const [runtime] = useState<GameRuntime>(() => {
    const race = new RaceSession(sunshineCircuit);
    return { race, simulation: race.player.simulation, mode: 'menu', keyboard: null, gamepad: null, audio: new DrivingAudio(), demoDriving: false };
  });
  const [mode, setMode] = useState<GameMode>('menu');
  const [sceneFailed, setSceneFailed] = useState(false);
  const [muted, setMuted] = useState(false);
  const changeMode = useCallback((next: GameMode) => {
    runtime.keyboard?.clear(); runtime.gamepad?.clear();
    if (next === 'playing') runtime.audio.unlock();
    else { runtime.race.pause(); runtime.audio.silence(); }
    runtime.simulation.clock.reset(); runtime.mode = next; setMode(next);
  }, [runtime]);
  const reset = useCallback(() => {
    if (runtime.mode === 'results' || runtime.mode === 'menu') return;
    runtime.keyboard?.clear(); runtime.gamepad?.clear();
    runtime.race.recover(); runtime.audio.reset();
    if (runtime.mode === 'playing' && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [runtime]);
  const start = useCallback((kind: RaceKind) => {
    runtime.keyboard?.clear(); runtime.gamepad?.clear(); runtime.audio.reset();
    runtime.race.start(kind); changeMode('playing');
  }, [runtime, changeMode]);
  const restart = useCallback(() => start(runtime.race.kind), [runtime, start]);
  const backToMenu = useCallback(() => {
    runtime.race.start('free-drive'); changeMode('menu');
  }, [runtime, changeMode]);
  const pause = useCallback(() => { if (runtime.mode === 'playing') changeMode('paused'); }, [runtime, changeMode]);
  const finish = useCallback(() => changeMode('results'), [changeMode]);
  const sceneError = useCallback(() => { changeMode('menu'); setSceneFailed(true); }, [changeMode]);
  const toggleSound = useCallback(() => {
    runtime.audio.unlock(); runtime.audio.setMuted(!muted); setMuted(!muted);
    if (runtime.mode === 'playing' && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [runtime, muted]);
  useEffect(() => {
    const togglePause = () => {
      if (runtime.mode === 'playing' || runtime.mode === 'paused') changeMode(runtime.mode === 'playing' ? 'paused' : 'playing');
    };
    const loseFocus = () => { if (runtime.mode === 'playing') changeMode('paused'); };
    const keyboard = createKeyboard(window, document, {
      enabled: () => runtime.mode === 'playing', onReset: reset, onPause: togglePause, onFocusLost: loseFocus,
    });
    runtime.gamepad = new GamepadController(() => navigator.getGamepads?.() ?? [], {
      enabled: () => runtime.mode === 'playing', onPause: togglePause, onReset: reset, onDisconnect: loseFocus,
    });
    runtime.keyboard = keyboard;
    return () => { keyboard.dispose(); runtime.keyboard = null; runtime.gamepad = null; runtime.audio.dispose(); };
  }, [runtime, reset, changeMode]);
  useEffect(() => {
    if (mode === 'playing' && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [mode]);

  return <main className={`game-shell mode-${mode}`} data-race={runtime.race.kind}>
    <div className="scene"><GameCanvas runtime={runtime} onError={sceneError} onFinish={finish} /></div>
    {!sceneFailed && <>
      <header className="topbar"><div className="brand"><span className="brand-badge" aria-hidden="true">T<span>↗</span></span><span>TURBO KART<br /><strong>LEGENDS</strong></span></div>
        <div className="session-tag"><span className="status-dot" />{mode === 'menu' ? 'A SUNNY LITTLE ESCAPE' : 'SUNSHINE CIRCUIT'}<span className="session-type">{mode === 'menu' ? 'MILESTONE 03' : raceKindNames[runtime.race.kind]}</span></div>
      </header>
      {mode === 'menu' ? <StartMenu onPlay={start} /> : mode !== 'results' && <HUD key={runtime.race.revision} runtime={runtime} onPause={pause} onReset={reset} />}
      <button className="sound-toggle" aria-pressed={!muted} onClick={toggleSound}>Sound {muted ? 'off' : 'on'}</button>
      {mode === 'paused' && <PauseMenu onResume={() => changeMode('playing')} onReset={reset} onRestart={restart} onMenu={backToMenu} muted={muted} onToggleSound={toggleSound} />}
      {mode === 'results' && <ResultsMenu race={runtime.race} onRestart={restart} onMenu={backToMenu} />}
      {mode === 'menu' && <footer className="menu-footer"><span>YOUR LINE. YOUR LITTLE LEGEND.</span><span>DESKTOP PROTOTYPE <i /> MILESTONE 03</span></footer>}
      {Diagnostics && <Suspense fallback={null}><Diagnostics runtime={runtime} /></Suspense>}
    </>}
  </main>;
}
