import { describe, expect, it, vi } from 'vitest';
import { ActionInput } from '../controls/actionInput';
import { createKeyboard } from '../controls/keyboard';
import { sampleGamepad, GamepadController, type PadSnapshot } from '../controls/gamepad';
import { mixHumanInputs } from '../controls/inputSources';
import { NEUTRAL_INPUT } from '../core/types';
import { TouchInput } from '../../phone/TouchInput';
import { RemoteInput } from '../../phone/RemoteInput';
import { validPacket, validGameState, type ControlPacket } from '../../phone/protocol';

describe('normalized item controls', () => {
  it('buffers a short E/Shift tap, supports held aliases, and clears blur/menu actions', () => {
    const host = new EventTarget(), visibility = Object.assign(new EventTarget(), { hidden: false }); let enabled = true;
    const keyboard = createKeyboard(host, visibility, { enabled: () => enabled, onReset: vi.fn(), onPause: vi.fn(), onFocusLost: vi.fn() });
    const key = (code: string, type = 'keydown') => host.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { code, repeat: false }));
    key('KeyE'); key('KeyE', 'keyup'); expect(keyboard.sample().useItem).toBe(true); expect(keyboard.sample().useItem).toBe(false);
    key('ShiftLeft'); expect(keyboard.sample().useItem).toBe(true); key('ShiftLeft', 'keyup'); expect(keyboard.sample().useItem).toBe(false);
    key('ShiftRight'); host.dispatchEvent(new Event('blur')); expect(keyboard.sample().useItem).toBe(false);
    enabled = false; key('KeyE'); expect(keyboard.sample().useItem).toBe(false); keyboard.dispose();
  });
  it('maps standard X/square without stealing A/RB drift and requires neutral after reconnect', () => {
    const pad: PadSnapshot = { id: 'item-pad', index: 0, mapping: 'standard', connected: true, axes: [0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 2, value: i === 2 ? 1 : 0 })) };
    expect(sampleGamepad(pad).useItem).toBe(true); expect(sampleGamepad(pad).drift).toBe(false);
    let current = pad; const controller = new GamepadController(() => [current], { enabled: () => true, onReset: vi.fn(), onPause: vi.fn(), onDisconnect: vi.fn() });
    expect(controller.poll().useItem).toBe(false); expect(controller.poll().useItem).toBe(false);
    current = { ...pad, buttons: pad.buttons.map(() => ({ pressed: false, value: 0 })) }; controller.poll(); current = pad; expect(controller.poll().useItem).toBe(true);
    controller.clear(); expect(controller.poll().useItem).toBe(false);
  });
  it('retains phone item taps shorter than a transmit interval alongside multi-touch pedals', () => {
    const touch = new TouchInput(); touch.button('throttle', 1, true); touch.button('drift', 2, true);
    touch.button('useItem', 3, true); touch.button('useItem', 3, false);
    expect(touch.sample()).toMatchObject({ throttle: 1, drift: true, useItem: true }); expect(touch.sample().useItem).toBe(false);
    touch.button('useItem', 4, true); touch.clear(); expect(touch.sample()).toEqual(NEUTRAL_INPUT);
  });
  it('validates optional legacy packets and boolean actions; disarms stale/held remote fire', () => {
    let now = 0; const remote = new RemoteInput(() => now, vi.fn()); remote.connect();
    const packet = (seq: number, useItem = false): ControlPacket => ({ version: 1, seq, sentAt: now, active: true, input: { ...NEUTRAL_INPUT, useItem } });
    expect(validPacket(packet(0))).toBe(true);
    expect(validPacket({ ...packet(0), input: { ...NEUTRAL_INPUT, useItem: 'fire' } })).toBe(false);
    expect(validGameState({ mode: 'playing', enabled: true, itemsEnabled: 'yes' })).toBe(false);
    const legacy = { ...NEUTRAL_INPUT }; delete legacy.useItem; expect(validPacket({ ...packet(0), input: legacy })).toBe(true);
    remote.receive(packet(0, true)); expect(remote.sample().useItem).toBe(false);
    remote.receive(packet(1)); remote.receive(packet(2, true)); expect(remote.sample().useItem).toBe(true);
    now = 500; expect(remote.sample().useItem).toBe(false); remote.receive(packet(3, true)); expect(remote.sample().useItem).toBe(false);
  });
  it('mixes item actions from all devices and routes accessible HUD clicks through normalized input', () => {
    const ui = new ActionInput(); ui.pressItem(); expect(mixHumanInputs(NEUTRAL_INPUT, NEUTRAL_INPUT, NEUTRAL_INPUT, ui.sample()).useItem).toBe(true);
    expect(ui.sample().useItem).toBe(false); ui.pressItem(); ui.clear(); expect(ui.sample()).toEqual(NEUTRAL_INPUT);
    const input = mixHumanInputs({ ...NEUTRAL_INPUT, steer: -1 }, NEUTRAL_INPUT, { ...NEUTRAL_INPUT, throttle: 1, useItem: true });
    expect(input).toMatchObject({ steer: -1, throttle: 1, useItem: true });
  });
});
