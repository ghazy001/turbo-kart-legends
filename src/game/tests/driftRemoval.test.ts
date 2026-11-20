import { describe, expect, it } from 'vitest';
import { boostTiers } from '../config/boostConfig';
import { kartConfig, sceneConfig } from '../config/kartConfig';
import { FixedStepClock } from '../core/fixedStep';
import { createKart, Simulation, stepKart } from '../core/simulation';
import { NEUTRAL_INPUT, type KartState } from '../core/types';
import { moveKart } from '../kart/kartController';
import { sunshineCircuit as track } from '../tracks/sunshineCircuit';
import { offsetSample } from '../tracks/trackSampling';
import { createAIDriverState, waypointInput } from '../ai/waypointController';
import { expectInsideRails } from './helpers/roadBounds';

const dt = 1 / 60, gas = { ...NEUTRAL_INPUT, throttle: 1 };
const moving = (): KartState => ({ ...createKart(track), forwardSpeed: 15 });
const retired = { driftDirection: 1 as const, driftCharge: 2.6, driftGrace: 0.1, driftHeld: true };

describe('drift removal and retained track/item boosts', () => {
  it('ignores held, released and repeated legacy drift presses without changing ordinary steering', () => {
    for (const speed of [0, -5, 15, 28]) {
      let actual = { ...moving(), forwardSpeed: speed }, expected = { ...actual };
      for (let tick = 0; tick < 240; tick++) {
        const controls = { ...gas, steer: Math.sin(tick / 40) };
        actual = moveKart(actual, { ...controls, drift: tick % 40 < 20 }, dt);
        expected = moveKart(expected, controls, dt);
      }
      expect(actual).toEqual(expected);
      expect(actual).toMatchObject({ driftCharge: 0, driftDirection: 0, driftHeld: false, jumpSerial: 0, boostSerial: 0 });
    }
  });
  it('discards retired charged snapshots without release payout, extra slip or a hop', () => {
    for (const drift of [true, false]) {
      expect(moveKart({ ...moving(), ...retired }, { ...gas, drift, steer: 0.5 }, dt))
        .toEqual(moveKart(moving(), { ...gas, steer: 0.5 }, dt));
    }
  });
  it.each([1, 2, 3] as const)('retains externally granted tier %i duration, speed cap and coast-down', tier => {
    let state: KartState = { ...moving(), boostTier: tier as KartState['boostTier'], boostRemaining: boostTiers[tier - 1].duration, boostSerial: 1 };
    let maximum = state.forwardSpeed;
    for (let tick = 0; tick < 300; tick++) {
      state = moveKart(state, { ...gas, drift: true }, dt);
      maximum = Math.max(maximum, state.forwardSpeed);
    }
    expect(maximum).toBeGreaterThan(kartConfig.maxForwardSpeed);
    expect(maximum).toBeLessThanOrEqual(boostTiers[tier - 1].maxSpeed);
    expect(state).toMatchObject({ forwardSpeed: kartConfig.maxForwardSpeed, boostTier: 0, boostRemaining: 0, boostSerial: 1, jumpSerial: 0 });
  });
  it('still cancels an external boost immediately on braking', () => {
    const state = moveKart({ ...moving(), boostTier: 3, boostRemaining: 1 }, { ...gas, brake: 1 }, dt);
    expect(state).toMatchObject({ boostTier: 0, boostRemaining: 0 }); expect(state.forwardSpeed).toBeLessThan(15);
  });
  it('still constrains an airborne boosted kart at the rail', () => {
    const sample = track.samples[0];
    const edge = offsetSample(sample, track.definition.roadWidth / 2 + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2 - kartConfig.collisionRadius - 0.02);
    const state = stepKart({ ...moving(), ...edge, ...retired, y: 0.2, heading: Math.atan2(sample.tz, -sample.tx),
      forwardSpeed: 28, boostTier: 3, boostRemaining: 1 }, gas, dt, track);
    expectInsideRails(track, state); expect(state.boostTier).toBe(0); expect(state.driftCharge).toBe(0);
  });
  it('clears retired snapshots on pause and restores a clean spawn on reset', () => {
    const simulation = new Simulation(track);
    simulation.current = { ...moving(), ...retired, boostTier: 3, boostRemaining: 1, y: 0.2 };
    simulation.cancelCharging(); simulation.advance(2, { ...gas, drift: true }, false);
    expect(simulation.current).toMatchObject({ driftCharge: 0, driftDirection: 0, boostSerial: 0, boostRemaining: 1 });
    simulation.reset(); expect(simulation.current).toEqual(createKart(track)); expect(simulation.pose).toEqual(simulation.current);
  });
  it('keeps boost expiry and ordinary steering identical at 30, 60 and 144 render FPS', () => {
    const run = (fps: number) => {
      const clock = new FixedStepClock(); let state = { ...moving(), boostTier: 3 as KartState['boostTier'], boostRemaining: 1.5 };
      for (let frame = 0; frame < fps * 4; frame++) clock.advance(1 / fps, step => { state = moveKart(state, { ...gas, steer: 0.25, drift: true }, step); });
      return state;
    };
    expect(run(30)).toEqual(run(60)); expect(run(144)).toEqual(run(60));
  });
  it('never requests drift at any AI difficulty anywhere on the circuit', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) for (const point of track.samples) {
      const state = { ...moving(), ...point, heading: Math.atan2(point.tx, point.tz) };
      const input = waypointInput(state, track, { id: 'test', lane: 0, targetSpeed: 20 }, [], 0,
        { brain: createAIDriverState(), difficulty, dt });
      expect(input.drift).toBe(false);
    }
  });
});
