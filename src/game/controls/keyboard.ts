import type { KartInput } from '../core/types';

const drivingCodes = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE', 'ShiftLeft', 'ShiftRight']);
interface KeyboardOptions {
  enabled: () => boolean;
  onReset: () => void;
  onPause: () => void;
  onFocusLost: () => void;
}

/** Hosts are injectable so listener cleanup and lost-focus behavior can be tested headlessly. */
export function createKeyboard(
  host: EventTarget, visibility: EventTarget & { readonly hidden: boolean }, options: KeyboardOptions,
) {
  const pressed = new Set<string>();
  let itemPending = false;
  const clear = () => { pressed.clear(); itemPending = false; };
  const keydown = (event: Event) => {
    const key = event as KeyboardEvent;
    if (key.metaKey || key.ctrlKey || key.altKey) return;
    if (['Space', 'KeyE', 'ShiftLeft', 'ShiftRight'].includes(key.code) && typeof Element !== 'undefined' && key.target instanceof Element
      && (key.target.closest('input, select, textarea') || key.code === 'Space' && key.target.closest('button'))) return;
    if (key.code === 'Escape' && !key.repeat) { key.preventDefault(); clear(); options.onPause(); }
    if (key.code === 'KeyR' && !key.repeat && options.enabled()) { clear(); options.onReset(); }
    if (drivingCodes.has(key.code) && options.enabled()) { key.preventDefault(); pressed.add(key.code); if (['KeyE', 'ShiftLeft', 'ShiftRight'].includes(key.code) && !key.repeat) itemPending = true; }
  };
  const keyup = (event: Event) => { pressed.delete((event as KeyboardEvent).code); };
  const blur = () => { clear(); options.onFocusLost(); };
  const visibilityChange = () => { if (visibility.hidden) blur(); };
  host.addEventListener('keydown', keydown);
  host.addEventListener('keyup', keyup);
  host.addEventListener('blur', blur);
  visibility.addEventListener('visibilitychange', visibilityChange);
  const has = (a: string, b: string) => Number(pressed.has(a) || pressed.has(b));
  return {
    clear,
    sample(): KartInput {
      const useItem = itemPending || pressed.has('KeyE') || pressed.has('ShiftLeft') || pressed.has('ShiftRight'); itemPending = false;
      return { useItem, throttle: has('KeyW', 'ArrowUp'), brake: has('KeyS', 'ArrowDown'),
        steer: has('KeyD', 'ArrowRight') - has('KeyA', 'ArrowLeft'), drift: false };
    },
    dispose() {
      clear();
      host.removeEventListener('keydown', keydown);
      host.removeEventListener('keyup', keyup);
      host.removeEventListener('blur', blur);
      visibility.removeEventListener('visibilitychange', visibilityChange);
    },
  };
}
export type KeyboardController = ReturnType<typeof createKeyboard>;
