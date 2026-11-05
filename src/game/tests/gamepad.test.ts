import { describe, expect, it, vi } from 'vitest';
import { combineInputs, GamepadController, sampleGamepad, type PadSnapshot } from '../controls/gamepad';
import { NEUTRAL_INPUT } from '../core/types';

function pad(): PadSnapshot {
  return { id: 'Test standard controller', index: 0, mapping: 'standard', connected: true,
    axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ value: 0, pressed: false })) };
}
function press(source: PadSnapshot, index: number, value: number): PadSnapshot {
  return { ...source, buttons: source.buttons.map((button, i) => i === index ? { value, pressed: value > 0.5 } : button) };
}

describe('standard gamepad input', () => {
  it('maps trigger, stick, D-pad and drift buttons to the player input shape', () => {
    let source: PadSnapshot = { ...pad(), axes: [0.6, 0] };
    source = press(press(press(source, 7, 0.8), 6, 0.3), 0, 1);
    const input = sampleGamepad(source);
    expect(input.throttle).toBe(0.8);
    expect(input.brake).toBe(0.3);
    expect(input.steer).toBeGreaterThan(0);
    expect(input.drift).toBe(true);
    expect(sampleGamepad(press(pad(), 14, 1)).steer).toBe(-1);
    expect(sampleGamepad(press(pad(), 5, 1)).drift).toBe(true);
  });
  it('uses a deadzone and ignores disconnected or unknown mappings', () => {
    expect(sampleGamepad({ ...pad(), axes: [0.12] })).toEqual(NEUTRAL_INPUT);
    expect(sampleGamepad({ ...press(pad(), 7, 1), connected: false })).toEqual(NEUTRAL_INPUT);
    expect(sampleGamepad({ ...press(pad(), 7, 1), mapping: '' })).toEqual(NEUTRAL_INPUT);
  });
  it('requires neutral after connection, pause and reset; actions only fire on button edges', () => {
    let source = press(pad(), 7, 1);
    const options = { enabled: () => true, onPause: vi.fn(), onReset: vi.fn(), onDisconnect: vi.fn() };
    const controller = new GamepadController(() => [source], options);
    expect(controller.poll()).toEqual(NEUTRAL_INPUT);
    source = pad(); controller.poll();
    source = press(source, 7, 1);
    expect(controller.poll().throttle).toBe(1);
    controller.clear();
    expect(controller.poll()).toEqual(NEUTRAL_INPUT);
    source = pad(); controller.poll();
    source = press(press(source, 9, 1), 8, 1);
    controller.poll(); controller.poll();
    expect(options.onPause).toHaveBeenCalledTimes(1);
    expect(options.onReset).toHaveBeenCalledTimes(1);
  });
  it('requests pause on disconnect and provides neutral input behind menus', () => {
    let source: PadSnapshot | null = pad();
    const onDisconnect = vi.fn();
    const controller = new GamepadController(() => [source], { enabled: () => false, onPause: vi.fn(), onReset: vi.fn(), onDisconnect });
    controller.poll(); source = press(pad(), 7, 1);
    expect(controller.poll()).toEqual(NEUTRAL_INPUT);
    source = null; controller.poll(); controller.poll();
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });
  it('keeps keyboard steering priority while allowing analog throttle and drift', () => {
    expect(combineInputs({ ...NEUTRAL_INPUT, steer: -1 }, { throttle: 0.7, brake: 0, steer: 1, drift: true }))
      .toEqual({ throttle: 0.7, brake: 0, steer: -1, drift: true });
  });
});
