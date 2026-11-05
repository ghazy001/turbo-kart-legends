import { describe, expect, it } from 'vitest';
import { kartConfig } from '../config/kartConfig';
import { createKart } from '../core/simulation';
import { NEUTRAL_INPUT } from '../core/types';
import { integrateSpeed, moveKart } from '../kart/kartController';
import { sunshineCircuit as track } from '../tracks/sunshineCircuit';

const gas = { throttle: 1, brake: 0, steer: 0 };
const brake = { throttle: 0, brake: 1, steer: 0 };

describe('arcade controls', () => {
  it('accelerates toward the capped forward speed', () => {
    let speed = 0;
    for (let i = 0; i < 600; i++) speed = integrateSpeed(speed, gas, 1 / 60);
    expect(speed).toBe(kartConfig.maxForwardSpeed);
  });
  it('coasts to a complete stop without reversing', () => {
    let speed = 12;
    for (let i = 0; i < 600; i++) {
      speed = integrateSpeed(speed, NEUTRAL_INPUT, 1 / 60);
      expect(speed).toBeGreaterThanOrEqual(0);
    }
    expect(speed).toBe(0);
  });
  it('brakes before reversing and caps reverse speed', () => {
    let speed = 10;
    for (let i = 0; i < 20; i++) speed = integrateSpeed(speed, brake, 1 / 60);
    expect(speed).toBeGreaterThan(0);
    expect(speed).toBeLessThan(5);
    for (let i = 0; i < 300; i++) speed = integrateSpeed(speed, brake, 1 / 60);
    expect(speed).toBe(-kartConfig.maxReverseSpeed);
    for (let i = 0; i < 120; i++) speed = integrateSpeed(speed, gas, 1 / 60);
    expect(speed).toBeGreaterThan(0);
  });
  it('bounds normalized controls and gives brake priority', () => {
    expect(integrateSpeed(0, { throttle: 99, brake: 0, steer: 0 }, 1 / 60)).toBe(integrateSpeed(0, gas, 1 / 60));
    expect(integrateSpeed(10, { ...gas, brake: 1 }, 1 / 60)).toBeLessThan(10);
  });
  it('does not pivot at zero speed', () => {
    let kart = createKart(track);
    for (let i = 0; i < 120; i++) kart = moveKart(kart, { ...NEUTRAL_INPUT, steer: 1 }, 1 / 60);
    expect(kart.heading).toBeCloseTo(track.spawn.heading);
    expect(kart.x).toBe(track.spawn.x);
  });
  it('turns right and left predictably, and inverts yaw when reversing', () => {
    const kart = { ...createKart(track), forwardSpeed: 8 };
    const right = moveKart(kart, { ...gas, steer: 1 }, 1 / 60);
    const left = moveKart(kart, { ...gas, steer: -1 }, 1 / 60);
    const reverse = moveKart({ ...kart, forwardSpeed: -4 }, { ...brake, steer: 1 }, 1 / 60);
    expect(right.yawRate).toBeLessThan(0);
    expect(left.yawRate).toBeGreaterThan(0);
    expect(reverse.yawRate).toBeGreaterThan(0);
  });
  it('steers toward screen-right when viewed from behind the +Z-facing kart', () => {
    let kart = { ...createKart(track), x: 0, z: 0, heading: 0, forwardSpeed: 8 };
    for (let i = 0; i < 30; i++) kart = moveKart(kart, { ...gas, steer: 1 }, 1 / 60);
    // A rear camera at (0, height, -distance) sees world -X on its right.
    expect(kart.x).toBeLessThan(-0.2);
    expect(kart.z).toBeGreaterThan(0);
  });
  it('damps lateral slip with no steering input', () => {
    let kart = { ...createKart(track), lateralSpeed: 5 };
    for (let i = 0; i < 60; i++) kart = moveKart(kart, NEUTRAL_INPUT, 1 / 60);
    expect(Math.abs(kart.lateralSpeed)).toBeLessThan(0.001);
  });
});
