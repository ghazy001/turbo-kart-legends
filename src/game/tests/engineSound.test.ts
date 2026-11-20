import { describe, expect, it } from 'vitest';
import { kartConfig } from '../config/kartConfig';
import { NEUTRAL_INPUT } from '../core/types';
import { createKart } from '../core/simulation';
import { engineCycleSample, engineSoundTargets } from '../render/audio/engineSound';
import { sunshineCircuit } from '../tracks/sunshineCircuit';

const kart = createKart(sunshineCircuit);
const throttle = { ...NEUTRAL_INPUT, throttle: 1 };

describe('original kart motor synthesis', () => {
  it('produces a seamless bounded audible waveform', () => {
    const samples = Array.from({ length: 1024 }, (_, index) => engineCycleSample(index / 1024));
    expect(samples.every(sample => Number.isFinite(sample) && Math.abs(sample) <= 0.68)).toBe(true);
    expect(Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length)).toBeGreaterThan(0.2);
    expect(engineCycleSample(0)).toBeCloseTo(engineCycleSample(1), 10);
    expect(Math.abs(samples[0] - samples.at(-1)!)).toBeLessThan(0.02);
  });
  it('responds immediately to throttle and rises with real kart speed', () => {
    const idle = engineSoundTargets(kart, NEUTRAL_INPUT);
    const rev = engineSoundTargets(kart, throttle);
    const fast = engineSoundTargets({ ...kart, forwardSpeed: kartConfig.maxForwardSpeed }, throttle);
    for (const property of ['frequency', 'gain', 'cutoff'] as const) {
      expect(rev[property]).toBeGreaterThan(idle[property]);
      expect(fast[property]).toBeGreaterThan(rev[property]);
    }
  });
  it('unloads the motor on forward braking and revs correctly for reverse', () => {
    const brake = { ...NEUTRAL_INPUT, brake: 1 };
    const forward = { ...kart, forwardSpeed: 8 };
    expect(engineSoundTargets(forward, brake).frequency).toBeLessThan(engineSoundTargets(forward, throttle).frequency);
    const reverse = { ...kart, forwardSpeed: -3 };
    expect(engineSoundTargets(reverse, brake).frequency).toBeGreaterThan(engineSoundTargets(reverse, NEUTRAL_INPUT).frequency);
    expect(engineSoundTargets(kart, { ...throttle, brake: 1 })).toEqual(engineSoundTargets(kart, NEUTRAL_INPUT));
  });
  it('caps pitch and volume for boosts, excessive speed and malformed input', () => {
    const top = engineSoundTargets({ ...kart, forwardSpeed: kartConfig.maxForwardSpeed, boostRemaining: 1 }, throttle);
    expect(engineSoundTargets({ ...kart, forwardSpeed: 10000, boostRemaining: 1 }, { ...throttle, throttle: 10000 })).toEqual(top);
    const malformed = engineSoundTargets({ ...kart, forwardSpeed: NaN }, { ...throttle, throttle: NaN, brake: Infinity });
    expect(malformed).toEqual(engineSoundTargets(kart, NEUTRAL_INPUT));
    expect(top.gain).toBeLessThan(0.6);
  });
  it('observes input and kart state without changing driving data', () => {
    const state = Object.freeze({ ...kart, forwardSpeed: 12 });
    const input = Object.freeze({ ...throttle });
    const before = { ...state };
    engineSoundTargets(state, input);
    expect(state).toEqual(before); expect(input).toEqual(throttle);
  });
});
