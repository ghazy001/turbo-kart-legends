import { describe, expect, it } from 'vitest';
import { boostTiers } from '../config/driftConfig';
import { itemBalance } from '../config/itemBalance';
import { itemConfig } from '../config/itemConfig';
import { kartConfig } from '../config/kartConfig';
import { FixedStepClock } from '../core/fixedStep';
import { NEUTRAL_INPUT, type KartInput } from '../core/types';
import { canActivateTurbo, turboBoost } from '../items/turboCharge';
import { RaceSession } from '../race/RaceSession';
import { previewItemReward } from '../dev/itemPreview';
import { itemTestTrack, itemWorld } from './helpers/itemWorld';
import { expectInsideRails } from './helpers/roadBounds';

const dt = 1 / 60;
const drive: KartInput = { ...NEUTRAL_INPUT, throttle: 1 };
function setup() {
  const world = itemWorld({ rewardPicker: () => 'turbo-charge' });
  expect(world.collect(0)).toBe('turbo-charge');
  world.racers[0].simulation.current.forwardSpeed = 16;
  return world;
}

describe('Turbo Charge item', () => {
  it('consumes one fresh action and grants the existing Flare without teleporting or instant speed', () => {
    const { items, racers, use } = setup(), before = { ...racers[0].simulation.current };
    use(); const after = racers[0].simulation.current;
    expect(items.slot('player')).toMatchObject({ held: null, cooldown: itemBalance.useCooldown, turboRemaining: boostTiers[2].duration });
    expect(after).toEqual({ ...before, boostTier: 3, boostRemaining: boostTiers[2].duration, boostSerial: before.boostSerial + 1 });
    expect(items.stats.turbos).toBe(1); expect(items.stats.shots).toBe(0);
    expect(items.events.at(-1)).toMatchObject({ kind: 'turbo', source: 'player', item: 'turbo-charge' });
    use(); expect(items.stats.turbos).toBe(1);
  });
  it('accelerates with the original cap, expires and returns smoothly to normal speed', () => {
    const { items, racers, use, step } = setup(); use(); const simulation = racers[0].simulation;
    let fastest = 0;
    for (let i = 0; i < 180; i++) { simulation.step(dt, drive); step(); fastest = Math.max(fastest, simulation.current.forwardSpeed); }
    expect(fastest).toBeGreaterThan(kartConfig.maxForwardSpeed);
    expect(fastest).toBeLessThanOrEqual(turboBoost.maxSpeed);
    expect(simulation.current.boostRemaining).toBe(0); expect(simulation.current.boostTier).toBe(0);
    expect(simulation.current.forwardSpeed).toBeLessThanOrEqual(kartConfig.maxForwardSpeed);
    expect(items.slot('player')!.turboRemaining).toBe(0);
  });
  it('retains the item when stopped, reversing, braking or slowed, and requires a new press', () => {
    for (const speed of [0, -6, itemConfig.turboMinSpeed - 0.1]) {
      const world = setup(); world.racers[0].simulation.current.forwardSpeed = speed; world.use();
      expect(world.items.slot('player')?.held).toBe('turbo-charge');
    }
    const { items, racers, step, use } = setup();
    const braking = { ...drive, brake: 1, useItem: true };
    step(1, new Map([['player', braking]])); expect(items.slot('player')?.held).toBe('turbo-charge');
    use(); expect(items.stats.turbos).toBe(0); step(); use(); expect(items.stats.turbos).toBe(1);
    expect(canActivateTurbo({ ...racers[0].simulation.current, boostRemaining: 0 }, drive, 0.5)).toBe(false);
    const slowed = setup(), state = slowed.racers[0].simulation.current;
    slowed.items.projectiles.push({ id: 99, owner: 'one', ...state, previousX: state.x, previousZ: state.z, y: 0.8, dx: 0, dz: 0, life: 1 });
    slowed.step(); slowed.use(); expect(slowed.items.slot('player')?.held).toBe('turbo-charge'); expect(slowed.items.stats.turbos).toBe(0);
  });
  it('does not replace or extend an active drift boost and cancels charging without double payout', () => {
    const { items, racers, step, use } = setup();
    Object.assign(racers[0].simulation.current, { boostTier: 1, boostRemaining: 0.4 });
    use(); expect(items.slot('player')?.held).toBe('turbo-charge'); expect(racers[0].simulation.current.boostRemaining).toBe(0.4);
    Object.assign(racers[0].simulation.current, { boostTier: 0, boostRemaining: 0, driftDirection: 1, driftCharge: 2.6, driftHeld: true });
    step(); use(); expect(racers[0].simulation.current).toMatchObject({ driftDirection: 0, driftCharge: 0, boostTier: 3, boostSerial: 1 });
    racers[0].simulation.step(dt, drive); step(); expect(racers[0].simulation.current.boostSerial).toBe(1);
  });
  it('keeps the countdown synchronized after brake, wall or damaging item cancellation', () => {
    for (const reason of ['brake', 'wall', 'item'] as const) {
      const { items, racers, use, step } = setup(); use(); const simulation = racers[0].simulation;
      if (reason === 'brake') simulation.step(dt, { ...drive, brake: 1 });
      if (reason === 'wall') { Object.assign(simulation.current, { x: 4.5, heading: Math.PI / 2 }); simulation.step(dt, drive); expectInsideRails(itemTestTrack, simulation.current); }
      if (reason === 'item') { const state = simulation.current; items.projectiles.push({ id: 99, owner: 'one', ...state, previousX: state.x, previousZ: state.z, y: 0.8, dx: 0, dz: 0, life: 1 }); }
      step(); expect(simulation.current.boostRemaining).toBe(0); expect(items.slot('player')!.turboRemaining).toBe(0);
    }
  });
  it('can coexist with Bubble Guard, which preserves the turbo on its one protected hit', () => {
    let reward: 'bubble-guard' | 'turbo-charge' = 'bubble-guard';
    const { items, racers, collect, use, step } = itemWorld({ rewardPicker: () => reward }); collect(0); use();
    step(70); reward = 'turbo-charge'; collect(0, 0); racers[0].simulation.current.forwardSpeed = 16; use();
    const state = racers[0].simulation.current;
    items.projectiles.push({ id: 99, owner: 'one', ...state, previousX: state.x, previousZ: state.z, y: 0.8, dx: 0, dz: 0, life: 1 }); step();
    expect(items.stats.blocks).toBe(1); expect(items.stats.hits).toBe(0); expect(state.boostRemaining).toBe(turboBoost.duration);
    expect(items.slot('player')!.turboRemaining).toBeGreaterThan(0);
  });
  it('freezes on pause, disarms held input and clears on recovery, restart and finish', () => {
    const race = new RaceSession(itemTestTrack, undefined, { rewardPicker: () => 'turbo-charge' }); race.start('quick-race'); race.phase = 'racing';
    race.player.simulation.reset({ ...race.items.pickups[1], heading: 0 }); race.player.simulation.current.forwardSpeed = 16;
    race.advance(dt, drive, true); race.advance(dt, { ...drive, useItem: true }, true);
    expect(race.items.stats.turbos).toBe(1); const remaining = race.items.slot('player')!.turboRemaining;
    race.pause(); race.advance(20, drive, false); expect(race.items.slot('player')!.turboRemaining).toBe(remaining);
    race.advance(dt, { ...drive, useItem: true }, true); expect(race.items.stats.turbos).toBe(1);
    race.recover(); expect(race.items.slot('player')!.turboRemaining).toBe(0); expect(race.player.simulation.current.boostRemaining).toBe(0);
    race.start('quick-race'); expect(race.items.stats.turbos).toBe(0); expect(race.items.slot('player')?.held).toBeNull();
    const world = setup(); world.use(); world.racers[0].progress.finishTime = 99; world.step();
    expect(world.items.slot('player')!.turboRemaining).toBe(0); expect(world.items.shouldFire('player', world.racers)).toBe(false);
  });
  it('has identical movement, timers and consumption at 30, 60 and 144 render Hz', () => {
    const results = [30, 60, 144].map(fps => {
      const { items, racers, step } = setup(); const clock = new FixedStepClock(); let tick = 0;
      for (let frame = 0; frame < fps * 2; frame++) clock.advance(1 / fps, delta => {
        const input = { ...drive, useItem: tick++ === 0 };
        racers[0].simulation.step(delta, input); step(1, new Map([['player', input]]));
      });
      return { state: racers[0].simulation.current, slot: items.slot('player'), stats: items.stats };
    });
    expect(results[0]).toEqual(results[1]); expect(results[1]).toEqual(results[2]);
  });
});

describe('AI Turbo Charge timing', () => {
  it('waits for reaction time and clear road; rejects a turn, barrier, nearby opponent or existing boost', () => {
    const { items, racers, step, place } = setup();
    expect(items.shouldFire('player', racers)).toBe(false); step(20); expect(items.shouldFire('player', racers)).toBe(true);
    racers[0].simulation.current.steering = 0.8; expect(items.shouldFire('player', racers)).toBe(false);
    racers[0].simulation.current.steering = 0; racers[0].simulation.current.yawRate = 1; expect(items.shouldFire('player', racers)).toBe(false);
    racers[0].simulation.current.yawRate = 0; racers[0].simulation.current.heading = Math.PI / 2; expect(items.shouldFire('player', racers)).toBe(false);
    racers[0].simulation.current.heading = 0; place(1, 0, 57); expect(items.shouldFire('player', racers)).toBe(false);
    place(1, 0, 100); racers[0].simulation.current.boostRemaining = 0.5; expect(items.shouldFire('player', racers)).toBe(false);
  });
  it('lets an opponent use the same action on a clear straight, then keeps boost bounded', () => {
    const { items, racers, collect, step } = itemWorld({ rewardPicker: () => 'turbo-charge' }); collect(1);
    racers[1].simulation.current.forwardSpeed = 16; step(20); expect(items.shouldFire('one', racers)).toBe(true);
    step(1, new Map([['one', { ...drive, useItem: items.shouldFire('one', racers) }]]));
    expect(items.stats.turbos).toBe(1); expect(racers[1].simulation.current.boostTier).toBe(3);
  });
});


describe('labeled item preview configuration', () => {
  it('requires both development preview flags and an exact registered item', () => {
    expect(previewItemReward('?race-preview&item-preview&item-reward=turbo-charge')).toBe('turbo-charge');
    for (const search of ['?item-reward=turbo-charge', '?race-preview&item-reward=turbo-charge', '?item-preview&item-reward=turbo-charge', '?race-preview&item-preview&item-reward=unknown', '?race-preview&item-preview']) expect(previewItemReward(search)).toBeUndefined();
  });
});
