import { useEffect, useState } from 'react';
import type { GameRuntime } from '../render/runtime';

/** Explicit development-only QA mode. Movement still uses normal normalized inputs. */
export function RaceDiagnostics({ runtime }: { runtime: GameRuntime }) {
  const [automatic, setAutomatic] = useState(false);
  useEffect(() => { runtime.demoDriving = automatic; return () => { runtime.demoDriving = false; }; }, [automatic, runtime]);
  return <aside className="race-diagnostics"><span>DEVELOPMENT · RACE QA</span><label><input type="checkbox" checked={automatic} onChange={event => setAutomatic(event.currentTarget.checked)} /> Autodrive with normal inputs</label></aside>;
}
