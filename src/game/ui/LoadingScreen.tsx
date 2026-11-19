import { useEffect, useRef, type KeyboardEvent } from 'react';
import '../../styles/loading.css';

export function LoadingScreen({ title = 'A great race awaits.', description = 'Opening Turbo Kart Legends', progress, stage = 'load', detail, error, onCancel }: {
  title?: string; description?: string; progress?: number; stage?: 'load' | 'prepare' | 'ready'; detail?: string; error?: string; onCancel?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!onCancel) return;
    const previous = document.activeElement, root = document.getElementById('root');
    const blockRoot = !!root && !root.contains(ref.current), wasInert = root?.inert ?? false;
    if (blockRoot) root.inert = true;
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    return () => {
      if (blockRoot) root.inert = wasInert;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [onCancel]);
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.key === 'Escape' || event.key === 'Backspace') && onCancel) { event.preventDefault(); event.stopPropagation(); onCancel(); }
    if (event.key !== 'Tab') return;
    const buttons = ref.current?.querySelectorAll<HTMLButtonElement>('button');
    if (!buttons?.length) return;
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
    else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
  };
  return <div ref={ref} onKeyDownCapture={navigate} className="loading-screen" data-stage={stage} data-error={!!error} role={onCancel ? 'dialog' : error ? 'alert' : 'status'} aria-modal={onCancel ? true : undefined} aria-labelledby="loading-title" aria-live="polite" aria-busy={!error && stage !== 'ready'}>
    <div className="loading-content"><span className="loading-brand">TURBO KART <span>LEGENDS</span></span>
      <div className="loading-emblem" aria-hidden="true"><i /><i /><i /></div>
      <span className="loading-eyebrow">{error ? 'LET’S TRY THAT AGAIN' : stage === 'ready' ? 'READY TO ROLL' : 'YOUR NEXT ADVENTURE'}</span>
      <h2 id="loading-title">{title}</h2><p>{error ?? description}</p>
      <progress aria-label="Preparing the game" max={1} value={progress} />
      <div className="loading-stages" aria-hidden="true"><span data-active={stage === 'load'}>Load</span><i /><span data-active={stage === 'prepare'}>Prepare</span><i /><span data-active={stage === 'ready'}>Race</span></div>
      {detail && <small>{detail}</small>}
      <div className="loading-actions">{error && <button onClick={() => window.location.reload()}>Reload game</button>}{onCancel && <button className="loading-cancel" onClick={onCancel}>Back to menu</button>}</div>
    </div>
  </div>;
}
