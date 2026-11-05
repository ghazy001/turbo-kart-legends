import { describe, expect, it, vi } from 'vitest';
import { createKeyboard } from '../controls/keyboard';

function setup() {
  const host = new EventTarget();
  const visibility = Object.assign(new EventTarget(), { hidden: false });
  const options = { enabled: () => true, onReset: vi.fn(), onPause: vi.fn(), onFocusLost: vi.fn() };
  const keyboard = createKeyboard(host, visibility, options);
  const key = (code: string, type = 'keydown', repeat = false) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { code, repeat });
    host.dispatchEvent(event); return event;
  };
  return { host, visibility, options, keyboard, key };
}

describe('keyboard adapter', () => {
  it('maps WASD/arrows to the same normalized input and cancels opposites', () => {
    const { key, keyboard } = setup();
    expect(key('KeyW').defaultPrevented).toBe(true);
    key('ArrowRight');
    expect(keyboard.sample()).toEqual({ throttle: 1, brake: 0, steer: 1 });
    key('KeyA');
    expect(keyboard.sample().steer).toBe(0);
    key('KeyW', 'keyup'); key('ArrowUp'); key('ArrowDown');
    expect(keyboard.sample()).toEqual({ throttle: 1, brake: 1, steer: 0 });
    keyboard.dispose();
  });
  it('clears held throttle on blur and visibility loss, and requests pause', () => {
    const { key, keyboard, host, visibility, options } = setup();
    key('KeyW'); host.dispatchEvent(new Event('blur'));
    expect(keyboard.sample().throttle).toBe(0);
    key('KeyW'); visibility.hidden = true; visibility.dispatchEvent(new Event('visibilitychange'));
    expect(keyboard.sample().throttle).toBe(0);
    expect(options.onFocusLost).toHaveBeenCalledTimes(2);
    keyboard.dispose();
  });
  it('does not drive behind menus and ignores shortcut auto-repeat', () => {
    const { key, keyboard, options } = setup();
    key('Escape'); key('Escape', 'keydown', true);
    key('KeyR'); key('KeyR', 'keydown', true);
    expect(options.onPause).toHaveBeenCalledTimes(1);
    expect(options.onReset).toHaveBeenCalledTimes(1);
    options.enabled = () => false;
    expect(key('ArrowUp').defaultPrevented).toBe(false);
    expect(keyboard.sample().throttle).toBe(0);
    keyboard.dispose();
  });
  it('removes all listeners when disposed', () => {
    const { key, keyboard, options, host, visibility } = setup();
    keyboard.dispose(); key('KeyW'); key('Escape'); host.dispatchEvent(new Event('blur'));
    visibility.hidden = true; visibility.dispatchEvent(new Event('visibilitychange'));
    expect(keyboard.sample().throttle).toBe(0);
    expect(options.onPause).not.toHaveBeenCalled();
    expect(options.onFocusLost).not.toHaveBeenCalled();
  });
});
