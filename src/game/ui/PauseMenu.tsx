import { Controls } from './Controls';
import { GameButton } from './GameButton';
import { useDialogFocus } from './useDialogFocus';
import type { ReactNode } from 'react';
import type { GameRuntime } from '../render/runtime';
import { RaceDetails } from './RaceHUD';

export function PauseMenu({ onResume, onCustomize, onReset, onRestart, onMenu, runtime, tools, sessionName }: {
  onCustomize: () => void; onResume: () => void; onReset: () => void; onRestart: () => void; onMenu: () => void; runtime: GameRuntime; tools: ReactNode; sessionName: string;
}) {
  const { ref, trapFocus } = useDialogFocus();
  return <div className="pause-scrim"><div ref={ref} className="pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title" onKeyDown={trapFocus}>
    <span className="eyebrow">PIT STOP</span><h2 id="pause-title">Take a breather<span>.</span></h2>
    <p className="pause-session">{sessionName}</p>
    <GameButton className="primary" onClick={onResume}>Resume drive</GameButton>
    <RaceDetails runtime={runtime} />
    <details className="pause-help"><summary>Controls & driving tips</summary><Controls />
    <p className="pause-tip">At speed, steer + hold Space to hop into a drift. Countersteer to widen the turn; release Space for a charged mini-turbo.<br />Brake, rails and pause cancel a charging drift. CPU races: collect a box, then E / Shift uses the held item: Spark Bolt forward, Banana Trap behind, a five-second Bubble Guard, or Turbo Charge on a clear line.</p>
    <p className="gamepad-help">Controller: RT go · LT brake · left stick steer · A / RB drift · X / square item<br />Menu pause · View reset. Release triggers after resuming.</p>
    </details><div className="pause-actions"><GameButton tone="surface" size="small" onClick={onCustomize}>Change racer & kart</GameButton><GameButton tone="surface" size="small" onClick={onReset}>Recover kart</GameButton><GameButton tone="surface" size="small" onClick={onRestart}>Restart session</GameButton><GameButton tone="surface" size="small" onClick={onMenu}>Back to menu</GameButton></div>
    <div className="pause-utilities" aria-label="Race settings">{tools}</div>
    <span className="micro-label">ESC TO RESUME · PAUSES WHEN YOU SWITCH TABS</span>
  </div></div>;
}
