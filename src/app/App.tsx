import { useCallback, useEffect, useState } from 'react';
import { createKeyboard } from '../game/controls/keyboard';
import { Simulation } from '../game/core/simulation';
import type { GameMode } from '../game/core/types';
import { GameCanvas } from '../game/render/GameCanvas';
import type { GameRuntime } from '../game/render/runtime';
import { sunshineCircuit } from '../game/tracks/sunshineCircuit';
import { HUD } from '../game/ui/HUD';
import { PauseMenu } from '../game/ui/PauseMenu';
import { StartMenu } from '../game/ui/StartMenu';

// Fast Refresh preserves the Simulation instance in React state. Reload when its
// dependencies change so an existing drive cannot keep an outdated controller.
if (import.meta.hot) {
  import.meta.hot.accept([
    '../game/core/simulation',
    '../game/controls/keyboard',
    '../game/tracks/sunshineCircuit',
  ], () => window.location.reload());
}

export function App() {
  const [runtime] = useState<GameRuntime>(() => ({ simulation: new Simulation(sunshineCircuit), mode: 'menu', keyboard: null }));
  const [mode, setMode] = useState<GameMode>('menu');
  const [sceneFailed, setSceneFailed] = useState(false);
  const changeMode = useCallback((next: GameMode) => {
    runtime.keyboard?.clear();
    runtime.simulation.clock.reset();
    runtime.mode = next;
    setMode(next);
  }, [runtime]);
  const reset = useCallback(() => { runtime.keyboard?.clear(); runtime.simulation.reset(); }, [runtime]);
  const pause = useCallback(() => changeMode('paused'), [changeMode]);
  const sceneError = useCallback(() => { changeMode('menu'); setSceneFailed(true); }, [changeMode]);

  useEffect(() => {
    const keyboard = createKeyboard(window, document, {
      enabled: () => runtime.mode === 'playing', onReset: reset,
      onPause: () => { if (runtime.mode !== 'menu') changeMode(runtime.mode === 'playing' ? 'paused' : 'playing'); },
      onFocusLost: () => { if (runtime.mode === 'playing') changeMode('paused'); },
    });
    runtime.keyboard = keyboard;
    return () => { keyboard.dispose(); runtime.keyboard = null; };
  }, [runtime, reset, changeMode]);

  return <main className={`game-shell mode-${mode}`}>
    <div className="scene"><GameCanvas runtime={runtime} onError={sceneError} /></div>
    {!sceneFailed && <>
      <header className="topbar"><div className="brand"><span className="brand-badge" aria-hidden="true">T<span>↗</span></span><span>TURBO KART<br /><strong>LEGENDS</strong></span></div>
        <div className="session-tag"><span className="status-dot" />{mode === 'menu' ? 'A SUNNY LITTLE ESCAPE' : 'SUNSHINE CIRCUIT'}<span className="session-type">FREE DRIVE</span></div>
      </header>
      {mode === 'menu' ? <StartMenu onPlay={() => { reset(); changeMode('playing'); }} /> : <HUD runtime={runtime} onPause={pause} onReset={reset} />}
      {mode === 'paused' && <PauseMenu onResume={() => changeMode('playing')} onReset={reset} onMenu={() => { reset(); changeMode('menu'); }} />}
      {mode === 'menu' && <footer className="menu-footer"><span>ORIGINAL WORLD. OPEN ROAD.</span><span>DESKTOP PROTOTYPE <i /> MILESTONE 01</span></footer>}
    </>}
  </main>;
}
