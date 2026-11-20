import { useEffect, useRef, type KeyboardEvent } from 'react';

export function useDialogFocus(initialSelector = 'button', returnFocusElement?: HTMLElement | null) {
  const ref = useRef<HTMLDivElement>(null);
  const returnTo = useRef<Element | null>(null), pendingRestore = useRef<number | null>(null);
  useEffect(() => {
    // StrictMode replays effects: a simulated cleanup must not steal the dialog's focus.
    if (pendingRestore.current !== null) { cancelAnimationFrame(pendingRestore.current); pendingRestore.current = null; }
    const previous = returnFocusElement ?? returnTo.current ?? document.activeElement;
    returnTo.current = previous;
    ref.current?.querySelector<HTMLElement>(initialSelector)?.focus();
    // Parent overlays may still be inert during unmount cleanup. Restore after that commit.
    return () => { pendingRestore.current = requestAnimationFrame(() => {
      pendingRestore.current = null; returnTo.current = null;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    }); };
  }, [initialSelector, returnFocusElement]);
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const buttons = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]') ?? []).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
    if (!buttons?.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return { ref, trapFocus };
}
