import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useDialogFocus } from '../useDialogFocus';
import { keyboardSelectionCommand, SelectionGamepad, type SelectionCommand } from '../selection/menuInput';

export function panelCommand(root: HTMLElement | null, action: SelectionCommand, onBack: () => void) {
  if (action === 'back') { onBack(); return; }
  const focused = document.activeElement;
  if (action === 'confirm') { if (focused instanceof HTMLElement && root?.contains(focused)) focused.click(); return; }
  const controls = Array.from(root?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary') ?? [])
    .filter(control => control.tabIndex >= 0 && control.getClientRects().length > 0);
  const index = controls.indexOf(focused as HTMLElement);
  controls[(index + (action === 'up' || action === 'left' ? controls.length - 1 : 1)) % controls.length]?.focus();
}

export function useMenuNavigation(command: (action: SelectionCommand) => void, revision: string, enabled = true, returnFocusElement?: HTMLElement | null) {
  const { ref, trapFocus } = useDialogFocus('[data-menu-current="true"], .selection-card[aria-checked="true"], button', returnFocusElement);
  const latest = useRef(command);
  useEffect(() => { latest.current = command; }, [command]);
  useEffect(() => {
    if (!enabled) return;
    const frame = requestAnimationFrame(() => {
      const selected = ref.current?.querySelector<HTMLElement>('[data-menu-current="true"], .selection-card[aria-checked="true"]') ?? ref.current?.querySelector<HTMLElement>('.selection-confirm');
      selected?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [revision, enabled, ref]);
  useEffect(() => {
    if (!enabled) return;
    const pad = new SelectionGamepad(); let frame = 0, allowed = true;
    const clear = () => pad.clear();
    const poll = (time: number) => {
      if (allowed && !document.hidden && document.hasFocus()) {
        try { const action = pad.poll(navigator.getGamepads?.() ?? [], time); if (action) latest.current(action); }
        catch (error) { console.warn('Menu gamepad unavailable.', error); allowed = false; }
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll); window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); };
  }, [enabled]);
  return { ref, onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    if (!enabled) return;
    trapFocus(event);
    if (event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
    const action = keyboardSelectionCommand(event.code); if (!action) return;
    // The focused preview owns rotation arrows; confirm/back retain the menu flow.
    if (action !== 'confirm' && action !== 'back' && event.target instanceof Element && event.target.closest('[data-preview-rotation]')) return;
    event.stopPropagation();
    if (event.target instanceof Element && event.target.closest('input, select, textarea') && action !== 'back') return;
    if (event.repeat && (action === 'confirm' || action === 'back')) { event.preventDefault(); return; }
    if (action === 'confirm' && event.target instanceof Element && event.target.closest('[data-selection-action]')) return;
    event.preventDefault(); command(action);
  } };
}
