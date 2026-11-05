import { Controls } from './Controls';
import { useDialogFocus } from './useDialogFocus';

export function PauseMenu({ onResume, onReset, onRestart, onMenu, muted, onToggleSound }: {
  onResume: () => void; onReset: () => void; onRestart: () => void; onMenu: () => void; muted: boolean; onToggleSound: () => void;
}) {
  const { ref, trapFocus } = useDialogFocus();
  return <div className="pause-scrim"><div ref={ref} className="pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title" onKeyDown={trapFocus}>
    <span className="eyebrow">PIT STOP</span><h2 id="pause-title">Take a breather<span>.</span></h2>
    <p>The sunshine isn’t going anywhere.</p>
    <button className="primary" onClick={onResume}>Resume drive <span aria-hidden="true">↗</span></button>
    <Controls />
    <p className="pause-tip">At speed, steer + hold Space to hop into a drift. Countersteer to widen the turn; release Space for a charged mini-turbo.<br />Brake, rails and pause cancel a charging drift.</p>
    <p className="gamepad-help">Controller: RT go · LT brake · left stick steer · A / RB drift<br />Menu pause · View reset. Release triggers after resuming.</p>
    <div className="pause-actions"><button onClick={onReset}>Recover kart</button><button onClick={onRestart}>Restart session</button><button onClick={onMenu}>Back to menu</button><button aria-pressed={!muted} onClick={onToggleSound}>Sound {muted ? 'off' : 'on'}</button></div>
    <span className="micro-label">ESC TO RESUME · PAUSES WHEN YOU SWITCH TABS</span>
  </div></div>;
}
