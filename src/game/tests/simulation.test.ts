import { describe, expect, it } from 'vitest';
import { loopConfig } from '../config/kartConfig';
import { FixedStepClock } from '../core/fixedStep';
import { createKart, Simulation, stepKart } from '../core/simulation';
import { NEUTRAL_INPUT } from '../core/types';
import { sunshineCircuit as track } from '../tracks/sunshineCircuit';

describe('fixed stepping and lifecycle', () => {
  it('produces the same pose at 30, 60 and 144 render FPS', () => {
    const run = (fps: number) => {
      const simulation = new Simulation(track);
      for (let i = 0; i < fps * 8; i++) simulation.advance(1 / fps, { drift: false, throttle: 1, brake: 0, steer: 0.1 }, true);
      return simulation.current;
    };
    const base = run(60);
    for (const fps of [30, 144]) {
      const pose = run(fps);
      expect(pose.x).toBeCloseTo(base.x, 8);
      expect(pose.z).toBeCloseTo(base.z, 8);
      expect(pose.heading).toBeCloseTo(base.heading, 8);
      expect(pose.forwardSpeed).toBeCloseTo(base.forwardSpeed, 8);
    }
  });
  it('caps catch-up work and rejects invalid frame times', () => {
    const clock = new FixedStepClock();
    let ticks = 0;
    clock.advance(100, () => ticks++);
    expect(ticks).toBe(loopConfig.maxSteps);
    clock.advance(NaN, () => ticks++);
    clock.advance(-1, () => ticks++);
    expect(ticks).toBe(loopConfig.maxSteps);
  });
  it('handles uneven frame intervals without losing simulation time', () => {
    const clock = new FixedStepClock();
    let seconds = 0;
    for (let i = 0; i < 100; i++) for (const dt of [0.01, 0.03, 0.005, 0.015]) clock.advance(dt, step => { seconds += step; });
    expect(seconds).toBeCloseTo(6, 8);
  });
  it('freezes while paused and discards paused time', () => {
    const simulation = new Simulation(track);
    simulation.advance(1 / 60, { drift: false, throttle: 1, brake: 0, steer: 0 }, true);
    const pose = { ...simulation.current };
    simulation.advance(100, { drift: false, throttle: 1, brake: 0, steer: 1 }, false);
    expect(simulation.current).toEqual(pose);
    simulation.advance(1 / 60, NEUTRAL_INPUT, true);
    expect(Math.hypot(simulation.current.x - pose.x, simulation.current.z - pose.z)).toBeLessThan(0.01);
  });
  it('restores position, heading, motion, interpolation and clock on reset', () => {
    const simulation = new Simulation(track);
    for (let i = 0; i < 100; i++) simulation.advance(1 / 60, { drift: false, throttle: 1, brake: 0, steer: -0.1 }, true);
    expect(simulation.current.forwardSpeed).toBeGreaterThan(0);
    simulation.reset();
    expect(simulation.current).toEqual(createKart(track));
    expect(simulation.previous).toEqual(simulation.current);
    expect(simulation.pose).toEqual(simulation.current);
    expect(simulation.revision).toBe(1);
  });
  it('recovers safely from corrupt and far-off-track state', () => {
    expect(stepKart({ ...createKart(track), x: NaN }, NEUTRAL_INPUT, 1 / 60, track)).toEqual(createKart(track));
    expect(stepKart({ ...createKart(track), x: 10000 }, NEUTRAL_INPUT, 1 / 60, track)).toEqual(createKart(track));
  });
});
