import { describe, expect, it } from 'vitest';
import { boostTiers, driftConfig } from '../config/driftConfig';
import { kartConfig } from '../config/kartConfig';
import { FixedStepClock } from '../core/fixedStep';
import { createKart, Simulation, stepKart } from '../core/simulation';
import { NEUTRAL_INPUT, type KartInput, type KartState } from '../core/types';
import { chargeTier } from '../kart/driftController';
import { moveKart } from '../kart/kartController';
import { sunshineCircuit as track } from '../tracks/sunshineCircuit';
import { nearestRoadPoint, offsetSample } from '../tracks/trackSampling';

const dt = 1 / 60;
const drifting: KartInput = { throttle: 1, brake: 0, steer: 1, drift: true };
const gas: KartInput = { ...NEUTRAL_INPUT, throttle: 1 };
const moving = (): KartState => ({ ...createKart(track), forwardSpeed: 15 });
function run(state: KartState, input: KartInput, seconds: number): KartState {
  let next = state;
  for (let i = 0; i < Math.round(seconds / dt); i++) next = moveKart(next, input, dt);
  return next;
}
function charged(charge: number): KartState {
  let state = moving();
  for (let tick = 0; tick < 300 && state.driftCharge + 1e-8 < charge; tick++) state = moveKart(state, drifting, dt);
  expect(state.driftCharge).toBeCloseTo(charge, 6);
  return state;
}

describe('drift, hop and mini-turbo', () => {
  it('cannot farm charge, hops or boosts while stationary or reversing', () => {
    for (const speed of [0, -5, driftConfig.minSpeed - 0.1]) {
      let state = { ...createKart(track), forwardSpeed: speed };
      for (let tick = 0; tick < 300; tick++) {
        state = moveKart(state, { ...drifting, throttle: 0, drift: tick % 2 === 0 }, dt);
      }
      expect(state.boostSerial).toBe(0);
      expect(state.jumpSerial).toBe(0);
      expect(state.driftCharge).toBe(0);
    }
  });
  it('requires a fresh drift press after accelerating out of standstill', () => {
    const state = run(createKart(track), drifting, 4);
    expect(state.forwardSpeed).toBeGreaterThan(driftConfig.minSpeed);
    expect(state.driftDirection).toBe(0);
    expect(state.boostSerial).toBe(0);
  });
  it('hops once, earns charge only on the road, and lands without sinking', () => {
    let state = moveKart(moving(), drifting, dt);
    expect(state.y).toBeGreaterThan(0);
    expect(state.driftCharge).toBe(0);
    expect(state.jumpSerial).toBe(1);
    let maxHeight = state.y;
    for (let i = 0; i < 30; i++) {
      state = moveKart(state, drifting, dt);
      maxHeight = Math.max(maxHeight, state.y);
      expect(state.y).toBeGreaterThanOrEqual(0);
    }
    expect(maxHeight).toBeGreaterThan(0.3);
    expect(maxHeight).toBeLessThan(0.4);
    expect(state.y).toBe(0);
    expect(state.verticalSpeed).toBe(0);
    expect(state.landingSerial).toBe(1);
    expect(state.jumpSerial).toBe(1);
    expect(state.driftCharge).toBeGreaterThan(0);
  });
  it('supports an uncharged straight hop without entering a drift', () => {
    const state = run(moving(), { ...gas, drift: true }, 1);
    expect(state.jumpSerial).toBe(1);
    expect(state.landingSerial).toBe(1);
    expect(state.driftDirection).toBe(0);
    expect(state.driftCharge).toBe(0);
  });
  it.each([1, 2, 3] as const)('releasing tier %i gives the configured duration and speed cap', tier => {
    let state = charged(boostTiers[tier - 1].charge);
    state = moveKart(state, gas, dt);
    expect(state.boostTier).toBe(tier);
    expect(state.boostRemaining).toBe(boostTiers[tier - 1].duration);
    expect(state.boostSerial).toBe(1);
    expect(state.driftCharge).toBe(0);
    expect(state.driftDirection).toBe(0);
    let maxSpeed = state.forwardSpeed;
    while (state.boostRemaining > 0) {
      state = moveKart(state, gas, dt);
      maxSpeed = Math.max(maxSpeed, state.forwardSpeed);
    }
    expect(maxSpeed).toBeGreaterThan(kartConfig.maxForwardSpeed);
    expect(maxSpeed).toBeLessThanOrEqual(boostTiers[tier - 1].maxSpeed);
    expect(state.boostTier).toBe(0);
    state = run(state, gas, 1.5);
    expect(state.forwardSpeed).toBe(kartConfig.maxForwardSpeed);
  });
  it('caps charge at tier 3 and never pays out an undercharged drift', () => {
    expect(run(moving(), drifting, 8).driftCharge).toBe(boostTiers[2].charge);
    const state = moveKart(run(moving(), drifting, 0.7), gas, dt);
    expect(state.boostTier).toBe(0);
    expect(state.boostSerial).toBe(0);
    expect(chargeTier(0.2)).toBe(0);
  });
  it('makes slides visible and countersteering widens a locked drift', () => {
    const state = run(moving(), drifting, 0.5);
    const tight = moveKart(state, drifting, dt);
    const wide = run(state, { ...drifting, steer: -1 }, 0.2);
    expect(state.lateralSpeed).toBeGreaterThan(0.2);
    expect(tight.yawRate).toBeLessThan(0);
    expect(wide.yawRate).toBeLessThan(0);
    expect(Math.abs(wide.yawRate)).toBeLessThan(Math.abs(tight.yawRate));
    expect(wide.driftDirection).toBe(1);
    expect(wide.driftCharge).toBeGreaterThan(state.driftCharge);
  });
  it('cancels charge when steering stops or braking begins', () => {
    const state = charged(boostTiers[1].charge);
    const straight = run(state, { ...drifting, steer: 0 }, 0.5);
    expect(straight.driftDirection).toBe(0);
    expect(moveKart(straight, gas, dt).boostTier).toBe(0);
    const braking = moveKart(state, { ...gas, brake: 1 }, dt);
    expect(braking.driftCharge).toBe(0);
    expect(braking.boostRemaining).toBe(0);
  });
  it('braking cancels an active boost immediately', () => {
    const boosted = moveKart(charged(boostTiers[2].charge), gas, dt);
    const state = moveKart(boosted, { ...gas, brake: 1 }, dt);
    expect(state.boostRemaining).toBe(0);
    expect(state.boostTier).toBe(0);
    expect(state.forwardSpeed).toBeLessThan(boosted.forwardSpeed);
  });
  it('cannot recharge or repeatedly hop while holding drift through a boost', () => {
    let state = moveKart(charged(boostTiers[0].charge), gas, dt);
    state = run(state, drifting, 5);
    expect(state.boostSerial).toBe(1);
    expect(state.jumpSerial).toBe(1);
    expect(state.driftCharge).toBe(0);
    expect(state.boostTier).toBe(0);
    state = moveKart(state, gas, dt);
    state = moveKart(state, drifting, dt);
    expect(state.jumpSerial).toBe(2);
    expect(state.boostSerial).toBe(1);
  });
  it('maintains road constraints in the air at boosted speed and cancels impact charge', () => {
    const sample = track.samples[0];
    const edge = offsetSample(sample, track.definition.roadWidth / 2 - kartConfig.collisionRadius - 0.02);
    const state = stepKart({ ...charged(boostTiers[2].charge), ...edge, y: 0.2,
      heading: Math.atan2(sample.tz, -sample.tx), forwardSpeed: 28,
    }, gas, dt, track);
    expect(nearestRoadPoint(track, state).distance).toBeLessThanOrEqual(track.definition.roadWidth / 2 - kartConfig.collisionRadius);
    expect(state.driftCharge).toBe(0);
    expect(state.boostTier).toBe(0);
  });
  it('pause cancels charging without a release payout; reset clears airborne/boost state', () => {
    const simulation = new Simulation(track);
    simulation.current = { ...charged(boostTiers[2].charge), x: track.spawn.x, z: track.spawn.z, heading: track.spawn.heading };
    simulation.cancelCharging();
    simulation.advance(2, drifting, false);
    simulation.advance(dt, gas, true);
    expect(simulation.current.boostSerial).toBe(0);
    expect(simulation.current.driftCharge).toBe(0);
    simulation.current = moveKart(charged(boostTiers[1].charge), gas, dt);
    simulation.reset();
    expect(simulation.current).toEqual(createKart(track));
    expect(simulation.pose).toEqual(simulation.current);
  });
  it('has matching drift, jump and turbo results at 30, 60 and 144 render FPS', () => {
    const simulate = (fps: number) => {
      const clock = new FixedStepClock();
      let state = moving();
      let tick = 0;
      for (let frame = 0; frame < fps * 4; frame++) clock.advance(1 / fps, step => {
        state = moveKart(state, tick < 100 ? drifting : gas, step);
        tick++;
      });
      return state;
    };
    const base = simulate(60);
    expect(base.boostSerial).toBe(1);
    expect(base.landingSerial).toBe(1);
    expect(simulate(30)).toEqual(base);
    expect(simulate(144)).toEqual(base);
  });
});
