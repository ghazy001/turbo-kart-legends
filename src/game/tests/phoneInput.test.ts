import { describe, expect, it } from 'vitest';
import { NEUTRAL_INPUT } from '../core/types';
import { mixHumanInputs } from '../controls/inputSources';
import { RemoteInput } from '../../phone/RemoteInput';
import { validPacket, PHONE_CONFIG, type ControlPacket } from '../../phone/protocol';
import { TiltSteering, defaultTiltSettings, normalizeTilt, screenTilt, smoothSteering } from '../../phone/steering';
import { TouchInput } from '../../phone/TouchInput';
const packet = (seq: number, input = { ...NEUTRAL_INPUT }, active = true): ControlPacket => ({ version: 1, seq, sentAt: 0, active, input });

describe('phone input safety and coexistence', () => {
  it('validates normalized finite inputs, versions, sequences and boolean actions', () => {
    expect(validPacket(packet(1))).toBe(true);
    for (const invalid of [null, {}, { ...packet(0), version: 2 }, { ...packet(0), seq: -1 }, { ...packet(0), seq: 1.5 }, { ...packet(0), sentAt: Infinity }, { ...packet(0), active: 'yes' }, packet(1, { ...NEUTRAL_INPUT, throttle: 1.1 }), packet(1, { ...NEUTRAL_INPUT, steer: NaN })]) expect(validPacket(invalid)).toBe(false);
  });
  it('requires neutral on pairing, pause/reset and resuming stale input', () => {
    let now = 0, losses = 0; const source = new RemoteInput(() => now, () => losses++); source.connect();
    source.receive(packet(0, { ...NEUTRAL_INPUT, throttle: 1 })); expect(source.sample()).toEqual(NEUTRAL_INPUT);
    source.receive(packet(1)); source.receive(packet(2, { ...NEUTRAL_INPUT, throttle: 1, steer: 1 })); expect(source.sample().throttle).toBe(1);
    source.clear(); source.receive(packet(3, { ...NEUTRAL_INPUT, throttle: 1 })); expect(source.sample()).toEqual(NEUTRAL_INPUT);
    source.receive(packet(4)); source.receive(packet(5, { ...NEUTRAL_INPUT, throttle: 1 })); now += PHONE_CONFIG.inputTimeoutMs + 1;
    source.receive(packet(6, { ...NEUTRAL_INPUT, throttle: 1 })); expect(source.sample()).toEqual(NEUTRAL_INPUT); expect(losses).toBe(1);
    source.receive(packet(7)); source.receive(packet(8, { ...NEUTRAL_INPUT, steer: -1 })); expect(source.sample().steer).toBe(-1);
    expect(source.sample(false)).toEqual(NEUTRAL_INPUT); source.receive(packet(9, { ...NEUTRAL_INPUT, throttle: 1 })); expect(source.sample()).toEqual(NEUTRAL_INPUT);
  });
  it('neutralizes and notifies once on timeout, disconnect or hidden phone', () => {
    let now = 0, losses = 0; const source = new RemoteInput(() => now, () => losses++); source.connect(); source.receive(packet(0)); source.receive(packet(1, { ...NEUTRAL_INPUT, throttle: 1, drift: false }));
    now = 351; expect(source.sample()).toEqual(NEUTRAL_INPUT); source.sample(); expect(losses).toBe(1);
    source.connect(); source.receive(packet(2)); source.receive(packet(3, { ...NEUTRAL_INPUT, throttle: 1 })); source.receive(packet(4, { ...NEUTRAL_INPUT }, false)); expect(losses).toBe(2); expect(source.sample()).toEqual(NEUTRAL_INPUT);
    source.lose(); expect(losses).toBe(2);
  });
  it('accepts old v1 packets but never forwards their retired drift action into gameplay', () => {
    const source = new RemoteInput(() => 0, () => undefined); source.connect();
    source.receive(packet(0, { ...NEUTRAL_INPUT, drift: true }));
    source.receive(packet(1, { ...NEUTRAL_INPUT, drift: true, throttle: 1, steer: 0.4 }));
    expect(source.sample()).toMatchObject({ throttle: 1, steer: 0.4, drift: false });
    expect(mixHumanInputs({ ...NEUTRAL_INPUT, drift: true }, { ...NEUTRAL_INPUT, drift: true }, { ...NEUTRAL_INPUT, drift: true }).drift).toBe(false);
  });
  it('drops duplicate/reordered packets and keeps keyboard/gamepad steering priority', () => {
    const source = new RemoteInput(() => 0, () => undefined); source.connect(); source.receive(packet(1)); source.receive(packet(3, { ...NEUTRAL_INPUT, steer: 1 })); source.receive(packet(2, { ...NEUTRAL_INPUT, steer: -1 })); expect(source.sample().steer).toBe(1);
    expect(mixHumanInputs({ ...NEUTRAL_INPUT, steer: -1 }, { ...NEUTRAL_INPUT, throttle: 0.5 }, source.sample())).toEqual({ throttle: 0.5, brake: 0, steer: -1, drift: false, useItem: false });
    source.lose(); expect(mixHumanInputs({ ...NEUTRAL_INPUT, throttle: 1 }, NEUTRAL_INPUT, source.sample()).throttle).toBe(1);
  });
  it('supports simultaneous touch pedals, pointer capture cancellation and multiple fingers', () => {
    const touch = new TouchInput(); touch.button('throttle', 1, true); touch.button('throttle', 2, true); touch.steering(4, 0.7, true);
    touch.button('throttle', 1, false); expect(touch.sample()).toEqual({ throttle: 1, brake: 0, drift: false, steer: 0.7, useItem: false });
    touch.releaseSteering(4); touch.button('throttle', 2, false); expect(touch.sample().throttle).toBe(0); expect(touch.sample().steer).toBe(0);
    touch.clear(); touch.steering(4, 1); expect(touch.sample()).toEqual(NEUTRAL_INPUT);
  });
});
describe('motion steering', () => {
  it('has consistent right/left signs in portrait and both landscape orientations', () => {
    expect(screenTilt(0, 15, 0)).toBeCloseTo(15); expect(screenTilt(-15, 0, 90)).toBeCloseTo(15); expect(screenTilt(15, 0, 270)).toBeCloseTo(15);
    expect(screenTilt(15, 0, 90)).toBeCloseTo(-15); expect(screenTilt(-15, 0, 270)).toBeCloseTo(-15);
  });
  it('calibrates an arbitrary neutral and applies sensitivity, dead zones and inversion', () => {
    const tilt = new TiltSteering(); expect(tilt.calibrate()).toBe(false); tilt.update(-10, 0, 90, 0); expect(tilt.calibrate()).toBe(true);
    expect(tilt.sample(10, 1 / 30, defaultTiltSettings).steer).toBe(0);
    expect(normalizeTilt(11, 10, defaultTiltSettings)).toBe(0);
    expect(normalizeTilt(35, 10, defaultTiltSettings)).toBe(1); expect(normalizeTilt(35, 10, { ...defaultTiltSettings, inverted: true })).toBe(-1);
    expect(normalizeTilt(25, 10, { ...defaultTiltSettings, fullLockDegrees: 15 })).toBe(1);
    tilt.reset(); expect(tilt.calibrated).toBe(false);
  });
  it('uses delta-aware smoothing and rejects missing/stale sensor readings', () => {
    let a = 0, b = 0; for (let i = 0; i < 30; i++) a = smoothSteering(a, 1, 1 / 30, 0.08); for (let i = 0; i < 60; i++) b = smoothSteering(b, 1, 1 / 60, 0.08); expect(a).toBeCloseTo(b, 10);
    const tilt = new TiltSteering(); tilt.update(null, 0, 90, 0); expect(tilt.calibrate()).toBe(false); tilt.update(0, 0, 90, 0); tilt.calibrate(); expect(tilt.sample(501, 1 / 30, defaultTiltSettings).available).toBe(false);
  });
});
