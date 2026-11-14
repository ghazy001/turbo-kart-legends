import { describe, expect, it } from 'vitest';
import { ItemSystem, type ItemRacer } from '../items/ItemSystem';
import { itemConfig, type ItemId } from '../config/itemConfig';
import { sweepCircle, sweepKart, sweepRail } from '../items/itemCollision';
import { NEUTRAL_INPUT, type KartInput, type SampledTrack, type TrackSample } from '../core/types';
import { Simulation } from '../core/simulation';
import { FixedStepClock } from '../core/fixedStep';
import { RaceSession } from '../race/RaceSession';
import { trackCatalog } from '../tracks/trackCatalog';
import { nearestRoadPoint } from '../tracks/trackSampling';

const samples: TrackSample[] = [];
for (let i = 0; i < 40; i++) samples.push({ x: 0, z: i * 5, tx: 0, tz: 1, distance: i * 5 });
for (let i = 0; i < 40; i++) samples.push({ x: i * 5, z: 200, tx: 1, tz: 0, distance: 200 + i * 5 });
for (let i = 0; i < 40; i++) samples.push({ x: 200, z: 200 - i * 5, tx: 0, tz: -1, distance: 400 + i * 5 });
for (let i = 0; i < 40; i++) samples.push({ x: 200 - i * 5, z: 0, tx: -1, tz: 0, distance: 600 + i * 5 });
const track: SampledTrack = { definition: { id: 'item-test', name: 'Test loop', closed: true, roadWidth: 11, points: samples }, samples, length: 800, spawn: { x: 0, z: 20, heading: 0 } };
const dt = 1 / 60;
function setup(count = 2, reward: ItemId = 'spark-bolt') {
  const racers: ItemRacer[] = Array.from({ length: count }, (_, i) => ({ id: i === 0 ? 'player' : `bot-${i}`, simulation: new Simulation(track), progress: { finishTime: null } }));
  const items = new ItemSystem(track, { rewardPicker: () => reward }); items.reset(true, racers);
  const box = items.pickups[1];
  racers.forEach((racer, i) => racer.simulation.current = { ...racer.simulation.current, x: box.x, z: box.z + i * 14 });
  racers.forEach(racer => racer.simulation.previous = { ...racer.simulation.current });
  const step = (input: KartInput = NEUTRAL_INPUT, ticks = 1) => { for (let i = 0; i < ticks; i++) items.step(dt, racers, new Map([['player', input]])); };
  step(); return { items, racers, box, step };
}

describe('item pickups and inventory', () => {
  it.each(trackCatalog)('$name: places three nonblocking rows on the sampled road', ({ track }) => {
    const items = new ItemSystem(track); expect(items.pickups).toHaveLength(9);
    expect(new Set(items.pickups.map(box => box.id)).size).toBe(9);
    for (const box of items.pickups) expect(nearestRoadPoint(track, box).distance).toBeLessThan(3.05);
  });
  it('grants one item, hides only the collected box, and cannot overwrite a full slot', () => {
    const { items, racers, box, step } = setup();
    expect(items.slot('player')?.held).toBe('spark-bolt'); expect(box.respawn).toBe(itemConfig.respawnSeconds);
    const next = items.pickups[0]; Object.assign(racers[0].simulation.current, next); racers[0].simulation.previous = { ...racers[0].simulation.current }; step();
    expect(next.respawn).toBe(0); expect(items.stats.pickups).toBe(1);
  });
  it('respawns on game time and ignores finished or vertically out-of-range racers', () => {
    const { items, racers, box, step } = setup();
    racers[0].simulation.current.z += 30; racers[0].simulation.previous = { ...racers[0].simulation.current }; step(NEUTRAL_INPUT, 421);
    expect(box.respawn).toBe(0);
    items.reset(true, racers); racers[0].progress.finishTime = 10;
    Object.assign(racers[0].simulation.current, box); racers[0].simulation.previous = { ...racers[0].simulation.current }; step(); expect(items.stats.pickups).toBe(0);
    racers[0].progress.finishTime = null; racers[0].simulation.current.y = 4; racers[0].simulation.previous = { ...racers[0].simulation.current }; step(); expect(items.stats.pickups).toBe(0);
  });
  it('requires a fresh press after collecting while the item button is held', () => {
    const { items, racers, step } = setup(); items.reset(true, racers);
    step({ ...NEUTRAL_INPUT, useItem: true }); step({ ...NEUTRAL_INPUT, useItem: true }, 60);
    expect(items.slot('player')?.held).toBe('spark-bolt'); expect(items.stats.shots).toBe(0);
    step(); step({ ...NEUTRAL_INPUT, useItem: true }); step({ ...NEUTRAL_INPUT, useItem: true }, 60);
    expect(items.stats.shots).toBe(1); expect(items.slot('player')?.held).toBeNull();
  });
  it('resolves a contested pickup by earliest swept contact instead of racer array order', () => {
    const { items, racers, box, step } = setup(); items.reset(true, racers);
    Object.assign(racers[0].simulation.current, { x: box.x, z: box.z + 1 }); Object.assign(racers[0].simulation.previous, { x: box.x, z: box.z - 5 });
    Object.assign(racers[1].simulation.current, { x: box.x, z: box.z }); Object.assign(racers[1].simulation.previous, { x: box.x, z: box.z - 1 });
    step(); expect(items.slot(racers[1].id)?.held).toBe('spark-bolt'); expect(items.slot('player')?.held).toBeNull();
  });
});
describe('Spark Bolt combat', () => {
  it('fires forward, consumes one slot, hits once and keeps steering/position intact', () => {
    const { items, racers, step } = setup(); const target = racers[1].simulation.current;
    Object.assign(target, { forwardSpeed: 20, lateralSpeed: 2, driftCharge: 1, driftDirection: 1, boostRemaining: 1, boostTier: 2 });
    const position = { x: target.x, z: target.z, heading: target.heading };
    step({ ...NEUTRAL_INPUT, useItem: true }); expect(items.projectiles[0].dz).toBeGreaterThan(0);
    for (let i = 0; i < 60 && items.stats.hits === 0; i++) step();
    expect(items.stats.hits).toBe(1); expect(items.projectiles).toHaveLength(0);
    expect(target.forwardSpeed).toBe(20); // Pure controller replaced the current snapshot.
    const hit = racers[1].simulation.current;
    expect({ x: hit.x, z: hit.z, heading: hit.heading }).toEqual(position);
    expect(hit.forwardSpeed).toBeCloseTo(11); expect(hit.boostRemaining).toBe(0); expect(hit.driftCharge).toBe(0);
    expect(items.slot(racers[1].id)?.slowRemaining).toBeGreaterThan(0);
    step(NEUTRAL_INPUT, 60); expect(items.slot(racers[1].id)?.slowRemaining).toBe(0);
  });
  it('caps speed only during the short effect and allows acceleration afterward', () => {
    const { items, racers, step } = setup(); racers[1].simulation.current.forwardSpeed = 20;
    step({ ...NEUTRAL_INPUT, useItem: true }); for (let i = 0; i < 60 && !items.stats.hits; i++) step();
    racers[1].simulation.current.forwardSpeed = 30; step(); expect(racers[1].simulation.current.forwardSpeed).toBe(itemConfig.slowSpeed);
    step(NEUTRAL_INPUT, 60); racers[1].simulation.current.forwardSpeed = 20; step(); expect(racers[1].simulation.current.forwardSpeed).toBe(20);
  });
  it('does not hit its owner or an invisible finished racer; expires instead', () => {
    const { items, racers, step } = setup(); racers[1].progress.finishTime = 10;
    step({ ...NEUTRAL_INPUT, useItem: true }); step(NEUTRAL_INPUT, 180);
    expect(items.stats.hits).toBe(0); expect(items.projectiles).toHaveLength(0); expect(items.slot('player')?.slowRemaining).toBe(0);
  });
  it('stops at a rail before an opponent outside the road', () => {
    const { items, racers, step } = setup(); racers[0].simulation.current.heading = Math.PI / 2;
    Object.assign(racers[1].simulation.current, { x: 8, z: racers[0].simulation.current.z }); racers[1].simulation.previous = { ...racers[1].simulation.current };
    step({ ...NEUTRAL_INPUT, useItem: true }); step(NEUTRAL_INPUT, 30);
    expect(items.stats.hits).toBe(0); expect(items.events.some(event => event.kind === 'wall')).toBe(true); expect(items.projectiles).toHaveLength(0);
  });
  it('uses swept target motion, respects jump height and picks the nearest target', () => {
    const { items, racers, step } = setup(3);
    racers[1].simulation.current.y = 5; racers[1].simulation.previous.y = 5;
    step({ ...NEUTRAL_INPUT, useItem: true }); for (let i = 0; i < 90 && !items.stats.hits; i++) step();
    expect(items.events.find(event => event.kind === 'hit')?.target).toBe(racers[2].id);
    const pose = { ...racers[0].simulation.current, x: 0, z: 10, heading: Math.PI / 2 };
    expect(sweepKart({ x: -20, z: 10 }, { x: 20, z: 10 }, pose, pose, 0.22)).not.toBeNull();
    const previous = { ...pose, x: 0, z: -5, heading: 0 }, current = { ...previous, z: 5 };
    expect(sweepKart({ x: -5, z: 0 }, { x: 5, z: 0 }, previous, current, 0.22)).not.toBeNull();
    expect(sweepKart({ x: -5, z: 0 }, { x: 5, z: 0 }, current, current, 0.22)).toBeNull();
    expect(sweepCircle({ x: -10, z: 0 }, { x: 10, z: 0 }, { x: 0, z: 0 }, 0.2)).toBeCloseTo(0.49);
  });
  it('absorbs a second hit during immunity without refreshing or stacking the slowdown', () => {
    const { items, racers, step } = setup(3); racers[1].simulation.current.forwardSpeed = 20;
    step({ ...NEUTRAL_INPUT, useItem: true }); for (let i = 0; i < 60 && !items.stats.hits; i++) step();
    const second = racers[2], target = racers[1].simulation.current, box = items.pickups[2];
    Object.assign(second.simulation.current, { x: box.x, z: box.z, heading: Math.atan2(target.x - box.x, target.z - box.z) }); second.simulation.previous = { ...second.simulation.current }; step();
    expect(items.slot(second.id)?.held).toBe('spark-bolt'); const remaining = items.slot(racers[1].id)!.slowRemaining;
    items.step(dt, racers, new Map([[second.id, { ...NEUTRAL_INPUT, useItem: true }]]));
    for (let i = 0; i < 60 && !items.events.some(event => event.kind === 'blocked'); i++) step();
    expect(items.stats.hits).toBe(1); expect(items.events.some(event => event.kind === 'blocked')).toBe(true);
    expect(items.slot(racers[1].id)!.slowRemaining).toBeLessThan(remaining);
  });
  it('bounds projectile and event storage during repeated pickup/fire/respawn cycles', () => {
    const { items, racers, box, step } = setup(); racers[1].progress.finishTime = 100;
    for (let cycle = 0; cycle < 15; cycle++) {
      step(); step({ ...NEUTRAL_INPUT, useItem: true });
      racers[0].simulation.current.z = box.z - 10; racers[0].simulation.previous = { ...racers[0].simulation.current };
      step(NEUTRAL_INPUT, 430);
      Object.assign(racers[0].simulation.current, { x: box.x, z: box.z }); racers[0].simulation.previous = { ...racers[0].simulation.current }; step();
      expect(items.projectiles.length).toBeLessThanOrEqual(itemConfig.maxProjectiles); expect(items.events.length).toBeLessThanOrEqual(itemConfig.maxEvents);
    }
    expect(items.stats.shots).toBe(15); expect(items.events).toHaveLength(itemConfig.maxEvents);
  });
  it('lets AI fire only with an item, a clear forward target and a matching lane', () => {
    const { items, racers, step } = setup(); step(NEUTRAL_INPUT, 20); expect(items.shouldFire('player', racers)).toBe(true);
    racers[1].simulation.current.x += 4; expect(items.shouldFire('player', racers)).toBe(false);
    racers[1].simulation.current.x -= 4; racers[1].simulation.current.z -= 30; expect(items.shouldFire('player', racers)).toBe(false);
    expect(items.shouldFire(racers[1].id, racers)).toBe(false);
  });
  it('disarms pause/reset, removes owner shots on recovery and resets round state', () => {
    const { items, racers, step } = setup(); items.disarm(); step({ ...NEUTRAL_INPUT, useItem: true }); expect(items.stats.shots).toBe(0);
    step(); step({ ...NEUTRAL_INPUT, useItem: true }); expect(items.projectiles.length).toBe(1);
    const cooldown = items.pickups[1].respawn; items.recover('player'); expect(items.projectiles).toHaveLength(0); expect(items.slot('player')?.held).toBeNull(); expect(items.pickups[1].respawn).toBe(cooldown);
    items.reset(true, racers); expect(items.events).toHaveLength(0); expect(items.stats).toEqual({ pickups: 0, shots: 0, drops: 0, hits: 0, guards: 0, blocks: 0 }); expect(items.time).toBe(0);
  });
  it('gives the same hit/result at 30, 60 and 144 render intervals', () => {
    const states = [30, 60, 144].map(fps => {
      const { items, racers } = setup(); const clock = new FixedStepClock(); let tick = 0;
      for (let i = 0; i < fps * 5; i++) clock.advance(1 / fps, delta => { items.step(delta, racers, new Map([['player', { ...NEUTRAL_INPUT, useItem: tick++ === 1 }]])); });
      return { stats: items.stats, events: items.events, slots: racers.map(racer => items.slot(racer.id)), projectiles: items.projectiles };
    }); expect(states[0]).toEqual(states[1]); expect(states[1]).toEqual(states[2]);
  });
});
describe('race integration', () => {
  it('buffers an item tap that arrives between fixed ticks', () => {
    const race = new RaceSession(track, undefined, { rewardPicker: () => 'spark-bolt' }); race.start('quick-race'); race.phase = 'racing';
    race.opponents.forEach(racer => { racer.progress.finishTime = 100; });
    const box = race.items.pickups[1]; race.player.simulation.reset({ ...box, heading: 0 }); race.advance(dt, NEUTRAL_INPUT, true);
    expect(race.items.slot('player')?.held).toBe('spark-bolt');
    race.advance(0.001, { ...NEUTRAL_INPUT, useItem: true }, true); race.advance(0.001, NEUTRAL_INPUT, true);
    expect(race.items.stats.shots).toBe(0); race.advance(dt, NEUTRAL_INPUT, true); expect(race.items.stats.shots).toBe(1);
    const time = race.items.time, projectile = { ...race.items.projectiles[0] }; race.pause(); race.advance(20, NEUTRAL_INPUT, false);
    expect(race.items.time).toBe(time); expect(race.items.projectiles[0]).toEqual(projectile);
    race.recover(); expect(race.items.slot('player')?.held).toBeNull(); expect(race.items.projectiles).toHaveLength(0);
    race.start('quick-race'); expect(race.items.stats.shots).toBe(0);
  });
  it.each(['time-trial', 'free-drive'] as const)('%s keeps its original item-free movement', kind => {
    const race = new RaceSession(track, undefined, { rewardPicker: () => 'spark-bolt' }); race.start(kind); race.phase = kind === 'free-drive' ? kind : 'racing';
    const box = race.items.pickups[1]; race.player.simulation.reset({ ...box, heading: 0 });
    for (let i = 0; i < 60; i++) race.advance(dt, { ...NEUTRAL_INPUT, throttle: 1, useItem: true }, true);
    expect(race.items.enabled).toBe(false); expect(race.items.stats).toEqual({ pickups: 0, shots: 0, drops: 0, hits: 0, guards: 0, blocks: 0 });
    expect(race.player.simulation.current.forwardSpeed).toBeGreaterThan(3);
  });
  it('uses the sampled rail face on a continuous road', () => {
    expect(sweepRail(track, { x: 0, z: 60 }, { x: 0, z: 90 }, 0.22)).toBeNull();
    expect(sweepRail(track, { x: 0, z: 60 }, { x: 10, z: 60 }, 0.22)).toBeLessThan(0.6);
  });
});

function trapSetup() {
  const result = setup(3, 'banana-trap'), { items, racers, step } = result;
  items.reset(true, racers);
  const box = items.pickups[0];
  Object.assign(racers[0].simulation.current, { x: box.x, z: box.z, heading: 0 });
  racers.forEach((racer, i) => {
    if (i > 0) Object.assign(racer.simulation.current, { x: 0, z: box.z + 50 + i * 10 });
    racer.simulation.previous = { ...racer.simulation.current };
  });
  step(); expect(items.slot('player')?.held).toBe('banana-trap');
  return { ...result, banana: box };
}
function placeRacer(racer: ItemRacer, x: number, z: number, y = 0) {
  Object.assign(racer.simulation.current, { x, z, y }); racer.simulation.previous = { ...racer.simulation.current };
}
describe('Banana Trap', () => {
  it('drops behind on one fresh press, consumes inventory and leaves kart pose unchanged', () => {
    const { items, racers, step } = trapSetup(), state = { ...racers[0].simulation.current };
    step({ ...NEUTRAL_INPUT, useItem: true }); step({ ...NEUTRAL_INPUT, useItem: true }, 10);
    expect(items.traps).toHaveLength(1); expect(items.projectiles).toHaveLength(0);
    expect(items.traps[0].z).toBeLessThan(state.z - 2); expect(items.slot('player')?.held).toBeNull();
    expect(racers[0].simulation.current).toEqual(state); expect(items.stats.drops).toBe(1);
    expect(items.events.at(-1)).toMatchObject({ kind: 'drop', item: 'banana-trap' });
  });
  it('telegraphs arming, then hits a grounded opponent once with the existing slowdown/immunity', () => {
    const { items, racers, step } = trapSetup(); step({ ...NEUTRAL_INPUT, useItem: true }); const trap = items.traps[0];
    placeRacer(racers[1], trap.x, trap.z); racers[1].simulation.current.forwardSpeed = 20;
    step(NEUTRAL_INPUT, 10); expect(items.stats.hits).toBe(0); expect(items.traps).toHaveLength(1);
    step(NEUTRAL_INPUT, 35); expect(items.traps).toHaveLength(0); expect(items.stats.hits).toBe(1);
    expect(racers[1].simulation.current.forwardSpeed).toBeCloseTo(11); expect(items.slot(racers[1].id)?.immunity).toBeGreaterThan(0);
    expect(items.events.find(event => event.kind === 'hit')).toMatchObject({ item: 'banana-trap', target: racers[1].id });
    step(NEUTRAL_INPUT, 90); expect(items.stats.hits).toBe(1);
  });
  it('sweeps fast crossings and awards a contested trap to the first contact', () => {
    const { items, racers, step } = trapSetup(); step({ ...NEUTRAL_INPUT, useItem: true }); step(NEUTRAL_INPUT, 40);
    const trap = items.traps[0];
    placeRacer(racers[1], trap.x, trap.z + 5); racers[1].simulation.previous.z = trap.z - 10;
    placeRacer(racers[2], trap.x, trap.z + 5); racers[2].simulation.previous.z = trap.z - 3;
    step(); expect(items.events.find(event => event.kind === 'hit')?.target).toBe(racers[2].id); expect(items.stats.hits).toBe(1);
  });
  it('allows a hop over a trap, ignores finishers, and catches a later grounded kart', () => {
    const { items, racers, step } = trapSetup(); step({ ...NEUTRAL_INPUT, useItem: true }); step(NEUTRAL_INPUT, 40);
    const trap = items.traps[0]; placeRacer(racers[1], trap.x, trap.z, 0.7); placeRacer(racers[2], trap.x, trap.z);
    racers[2].progress.finishTime = 100; step(); expect(items.stats.hits).toBe(0);
    placeRacer(racers[1], trap.x, trap.z); step(); expect(items.stats.hits).toBe(1);
  });
  it('protects the owner initially but allows returning into an armed own trap', () => {
    const { items, racers, step } = trapSetup(); step({ ...NEUTRAL_INPUT, useItem: true }); const trap = items.traps[0];
    placeRacer(racers[0], trap.x, trap.z); step(NEUTRAL_INPUT, 50); expect(items.stats.hits).toBe(0);
    step(NEUTRAL_INPUT, 80); expect(items.stats.hits).toBe(1); expect(items.traps).toHaveLength(0);
  });
  it('absorbs an immune target contact without stacking slowdown', () => {
    const { items, racers, step } = trapSetup(); step({ ...NEUTRAL_INPUT, useItem: true }); step(NEUTRAL_INPUT, 40);
    const trap = items.traps[0]; items.recover(racers[1].id); placeRacer(racers[1], trap.x, trap.z); step();
    expect(items.traps).toHaveLength(0); expect(items.stats.hits).toBe(0); expect(items.events.at(-1)?.kind).toBe('blocked');
  });
  it('retains the item for an airborne or off-road drop and permits a safe retry', () => {
    const { items, racers, step } = trapSetup(); racers[0].simulation.current.y = 1;
    step({ ...NEUTRAL_INPUT, useItem: true }); expect(items.slot('player')?.held).toBe('banana-trap');
    placeRacer(racers[0], 4.6, 100); racers[0].simulation.current.heading = -Math.PI / 2;
    step(); step({ ...NEUTRAL_INPUT, useItem: true }); expect(items.traps).toHaveLength(0);
    racers[0].simulation.current.heading = 0; step(); step({ ...NEUTRAL_INPUT, useItem: true }); expect(items.traps).toHaveLength(1);
  });
  it('expires traps on game time and respects the pool cap without losing the held item', () => {
    const { items, step } = trapSetup();
    for (let i = 0; i < itemConfig.maxTraps; i++) items.traps.push({ id: 100 + i, owner: 'other', x: 0, z: 40, heading: 0, life: 2, armRemaining: 0, ownerGrace: 0 });
    step({ ...NEUTRAL_INPUT, useItem: true }); expect(items.traps).toHaveLength(itemConfig.maxTraps); expect(items.slot('player')?.held).toBe('banana-trap');
    step(NEUTRAL_INPUT, 121); expect(items.traps).toHaveLength(0); step({ ...NEUTRAL_INPUT, useItem: true });
    step(NEUTRAL_INPUT, Math.ceil(itemConfig.trapLife / dt) + 1); expect(items.traps).toHaveLength(0);
  });
  it('lets AI drop for a pursuer rather than an opponent ahead', () => {
    const { items, racers, step } = trapSetup(); step(NEUTRAL_INPUT, 20); const state = racers[0].simulation.current; state.forwardSpeed = 15;
    placeRacer(racers[1], state.x, state.z - 20); racers[1].simulation.current.forwardSpeed = 18; expect(items.shouldFire('player', racers)).toBe(true);
    placeRacer(racers[1], state.x, state.z + 12); expect(items.shouldFire('player', racers)).toBe(false);
    placeRacer(racers[1], state.x + 3, state.z - 20); racers[1].simulation.current.forwardSpeed = 18; expect(items.shouldFire('player', racers)).toBe(false);
    placeRacer(racers[1], state.x, state.z - 20); racers[1].simulation.current.forwardSpeed = 18; state.y = 1; expect(items.shouldFire('player', racers)).toBe(false);
  });
  it('disarms held use, freezes under pause, and clears owner hazards on recovery/restart', () => {
    const { items, step } = trapSetup(); items.disarm(); step({ ...NEUTRAL_INPUT, useItem: true }); expect(items.traps).toHaveLength(0);
    step(); step({ ...NEUTRAL_INPUT, useItem: true }); const life = items.traps[0].life;
    items.disarm(); expect(items.traps[0].life).toBe(life); items.recover('player'); expect(items.traps).toHaveLength(0);
    const race = new RaceSession(track, undefined, { rewardPicker: () => 'spark-bolt' }); race.start('quick-race'); race.phase = 'racing';
    race.items.traps.push({ id: 1, owner: 'player', x: 0, z: 80, heading: 0, life: 10, armRemaining: 0.3, ownerGrace: 1 });
    race.pause(); race.advance(10, NEUTRAL_INPUT, false); expect(race.items.traps[0].life).toBe(10);
    race.start('quick-race'); expect(race.items.traps).toHaveLength(0);
  });
  it('has identical trap timing and hits at 30, 60 and 144 render rates', () => {
    const snapshots = [30, 60, 144].map(fps => {
      const { items, racers } = trapSetup(); const clock = new FixedStepClock(); let tick = 0;
      for (let frame = 0; frame < fps * 3; frame++) clock.advance(1 / fps, delta => {
        items.step(delta, racers, new Map([['player', { ...NEUTRAL_INPUT, useItem: tick++ === 0 }]]));
      });
      return { traps: items.traps, stats: items.stats, events: items.events, slot: items.slot('player') };
    }); expect(snapshots[0]).toEqual(snapshots[1]); expect(snapshots[1]).toEqual(snapshots[2]);
  });
});
