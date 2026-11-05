import { Controls } from './Controls';
import { useDialogFocus } from './useDialogFocus';

export function PauseMenu({ onResume, onReset, onMenu }: {
  onResume: () => void; onReset: () => void; onMenu: () => void;
}) {
  const { ref, trapFocus } = useDialogFocus();
  return <div className="pause-scrim"><div ref={ref} className="pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title" onKeyDown={trapFocus}>
    <span className="eyebrow">PIT STOP</span><h2 id="pause-title">Take a breather<span>.</span></h2>
    <p>The sunshine isn’t going anywhere.</p>
    <button className="primary" onClick={onResume}>Resume drive <span aria-hidden="true">↗</span></button>
    <Controls />
    <p className="pause-tip">Hold brake to stop, then keep holding to reverse.<br />Caught a rail? Press R for a fresh start.</p>
    <div className="pause-actions"><button onClick={onReset}>Reset kart</button><button onClick={onMenu}>Back to menu</button></div>
    <span className="micro-label">ESC TO RESUME · PAUSES WHEN YOU SWITCH TABS</span>
  </div></div>;
}
