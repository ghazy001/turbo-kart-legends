import { Controls } from './Controls';
import { GameButton } from './GameButton';
import { useDialogFocus } from './useDialogFocus';

export function PauseMenu({ onResume, onCustomize, onReset, onRestart, onMenu, muted, onToggleSound }: {
  onCustomize: () => void; onResume: () => void; onReset: () => void; onRestart: () => void; onMenu: () => void; muted: boolean; onToggleSound: () => void;
}) {
  const { ref, trapFocus } = useDialogFocus();
  return <div className="pause-scrim"><div ref={ref} className="pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title" onKeyDown={trapFocus}>
    <span className="eyebrow">PIT STOP</span><h2 id="pause-title">Take a breather<span>.</span></h2>
    <p>The sunshine isn’t going anywhere.</p>
    <GameButton className="primary" onClick={onResume}>Resume drive</GameButton>
    <Controls />
    <p className="pause-tip">At speed, steer + hold Space to hop into a drift. Countersteer to widen the turn; release Space for a charged mini-turbo.<br />Brake, rails and pause cancel a charging drift. CPU races: collect a box, then E / Shift uses the held item: Spark Bolt forward, Banana Trap behind, a five-second Bubble Guard, or Turbo Charge on a clear line.</p>
    <p className="gamepad-help">Controller: RT go · LT brake · left stick steer · A / RB drift · X / square item<br />Menu pause · View reset. Release triggers after resuming.</p>
    <div className="pause-actions"><GameButton tone="surface" size="small" onClick={onCustomize}>Change racer & kart</GameButton><GameButton tone="surface" size="small" onClick={onReset}>Recover kart</GameButton><GameButton tone="surface" size="small" onClick={onRestart}>Restart session</GameButton><GameButton tone="surface" size="small" onClick={onMenu}>Back to menu</GameButton><GameButton tone="surface" size="small" aria-pressed={!muted} onClick={onToggleSound}>Sound {muted ? 'off' : 'on'}</GameButton></div>
    <span className="micro-label">ESC TO RESUME · PAUSES WHEN YOU SWITCH TABS</span>
  </div></div>;
}
