import { describe, expect, it } from 'vitest';
import { itemBalance } from '../config/itemBalance';
import { itemConfig, type ItemId } from '../config/itemConfig';
import { NEUTRAL_INPUT, type KartInput, type SampledTrack, type TrackSample } from '../core/types';
import { FixedStepClock } from '../core/fixedStep';
import { Simulation } from '../core/simulation';
import { ItemSystem, type ItemRacer } from '../items/ItemSystem';
import { RaceSession } from '../race/RaceSession';

const dt = 1 / 60;
const corners = [[0, 0, 0, 1], [0, 200, 1, 0], [200, 200, 0, -1], [200, 0, -1, 0]];
const samples: TrackSample[] = corners.flatMap(([x, z, tx, tz], side) => Array.from({ length: 40 }, (_, i) => ({ x: x + tx * i * 5, z: z + tz * i * 5, tx, tz, distance: side * 200 + i * 5 })));
const track: SampledTrack = { definition: { id: 'guard-test', name: 'Guard loop', closed: true, roadWidth: 11, points: samples }, samples, length: 800, spawn: { x: 0, z: 60, heading: 0 } };
function setup() {
  const racers: (ItemRacer & { simulation: Simulation })[] = ['player', 'attacker', 'other'].map(id => ({ id, simulation: new Simulation(track), progress: { finishTime: null } }));
  let reward: ItemId = 'bubble-guard';
  const items = new ItemSystem(track, { rewardPicker: () => reward }); items.reset(true, racers);
  const place = (index: number, x: number, z: number, heading = 0) => racers[index].simulation.reset({ x, z, heading });
  const tick = (ticks = 1, input: ReadonlyMap<string, KartInput> = new Map()) => { for (let i = 0; i < ticks; i++) items.step(dt, racers, input); };
  const use = (index = 0) => tick(1, new Map([[racers[index].id, { ...NEUTRAL_INPUT, useItem: true }]]));
  const collect = (index: number, item: ItemId) => {
    reward = item;
    const box = items.pickups.find(pickup => pickup.respawn === 0)!;
    place(index, box.x, box.z); tick(); expect(items.slot(racers[index].id)?.held).toBe(item);
  };
  place(0, 0, 60); place(1, 0, 40); place(2, 0, 150);
  collect(0, 'bubble-guard'); place(0, 0, 60);
  collect(1, 'spark-bolt'); place(1, 0, 40);
  return { items, racers, place, tick, use, collect };
}
describe('Bubble Guard protection', () => {
  it('activates on a fresh action, consumes inventory and leaves movement/abilities intact', () => {
    const { items, racers, use } = setup(); const before = { ...racers[0].simulation.current };
    use(); expect(items.slot('player')).toMatchObject({ held: null, shieldRemaining: itemConfig.shieldSeconds });
    expect(items.stats.guards).toBe(1); expect(items.stats.shots).toBe(0); expect(items.stats.drops).toBe(0);
    expect(racers[0].simulation.current).toEqual(before); expect(items.events.at(-1)?.kind).toBe('guard');
  });
  it('absorbs one bolt without losing speed, drift, turbo or applying stun/immunity', () => {
    const { items, racers, use, tick } = setup();
    Object.assign(racers[0].simulation.current, { forwardSpeed: 20, lateralSpeed: 2, driftDirection: 1, driftCharge: 1, boostTier: 2, boostRemaining: 1 });
    const before = { ...racers[0].simulation.current }; use(); use(1); tick(40);
    expect(items.stats.blocks).toBe(1); expect(items.stats.hits).toBe(0); expect(items.projectiles).toHaveLength(0);
    expect(items.slot('player')).toMatchObject({ shieldRemaining: 0, immunity: 0, slowRemaining: 0 });
    expect(racers[0].simulation.current).toEqual(before);
    expect(items.events.find(event => event.kind === 'guard-break')).toMatchObject({ target: 'player', source: 'attacker', item: 'spark-bolt' });
  });
  it('absorbs and consumes an armed banana, including a returning own trap', () => {
    for (const owner of ['attacker', 'player']) {
      const { items, racers, use, tick } = setup(); use(); const state = { ...racers[0].simulation.current };
      items.traps.push({ id: 100, owner, x: state.x, z: state.z, heading: 0, life: 10, armRemaining: 0, ownerGrace: 0 }); tick();
      expect(items.traps).toHaveLength(0); expect(items.stats.blocks).toBe(1); expect(items.stats.hits).toBe(0);
      expect(racers[0].simulation.current).toEqual(state); expect(items.events.at(-1)?.item).toBe('banana-trap');
    }
  });
  it('protects exactly one of two same-tick hits, then permits the normal damage response', () => {
    const { items, use, tick } = setup(); use(); use(1);
    items.projectiles.push({ ...items.projectiles[0], id: 999, owner: 'other' }); tick(40);
    expect(items.stats.blocks).toBe(1); expect(items.stats.hits).toBe(1);
    expect(items.slot('player')?.slowRemaining).toBeGreaterThan(0);
  });
  it('expires at five simulation seconds and emits one expiry event', () => {
    const { items, use, tick } = setup(); use(); tick(299);
    expect(items.slot('player')!.shieldRemaining).toBeGreaterThan(0); tick();
    expect(items.slot('player')!.shieldRemaining).toBe(0); tick(100);
    expect(items.events.filter(event => event.kind === 'guard-expire')).toHaveLength(1); expect(items.stats.blocks).toBe(0);
    use(1); tick(40); expect(items.stats.hits).toBe(1);
  });
  it('does not refresh/stack an active shield or consume the next held guard', () => {
    const { items, place, use, tick, collect } = setup(); use(); tick(Math.ceil(itemBalance.useCooldown / dt) + 1); collect(0, 'bubble-guard'); place(0, 0, 60);
    const remaining = items.slot('player')!.shieldRemaining; use();
    expect(items.slot('player')!.shieldRemaining).toBeLessThan(remaining); expect(items.slot('player')?.held).toBe('bubble-guard'); expect(items.stats.guards).toBe(1);
    tick(300); use(); expect(items.stats.guards).toBe(2);
  });
  it('does not waste protection on a hit already prevented by recovery immunity', () => {
    const { items, collect, place, use, tick } = setup(); items.recover('player'); tick(61); collect(0, 'bubble-guard'); place(0, 0, 60); use();
    items.projectiles.push({ id: 77, owner: 'attacker', x: 0, z: 60, previousX: 0, previousZ: 60, y: 0.8, dx: 0, dz: 38, life: 1 }); tick();
    expect(items.stats.blocks).toBe(0); expect(items.stats.hits).toBe(0); expect(items.slot('player')!.shieldRemaining).toBeGreaterThan(4);
    expect(items.events.at(-1)?.kind).toBe('blocked');
  });
  it('does not heal an existing slowdown when activated after a hit', () => {
    const { items, racers, use, tick } = setup(); use(1); tick(32);
    expect(items.stats.hits).toBe(1); const remaining = items.slot('player')!.slowRemaining, speed = racers[0].simulation.current.forwardSpeed;
    use(); expect(items.slot('player')!.shieldRemaining).toBe(itemConfig.shieldSeconds);
    expect(items.slot('player')!.slowRemaining).toBeLessThan(remaining); expect(racers[0].simulation.current.forwardSpeed).toBe(speed);
  });
  it('requires release after pause and clears protection on recovery and restart', () => {
    const { items, racers, tick, use } = setup(); items.disarm(); use(); expect(items.stats.guards).toBe(0);
    tick(); use(); items.recover('player'); expect(items.slot('player')?.shieldRemaining).toBe(0);
    items.reset(true, racers); expect(items.stats.guards).toBe(0); expect(items.stats.blocks).toBe(0);
    const race = new RaceSession(track, undefined, { rewardPicker: () => 'bubble-guard' }); race.start('quick-race'); race.phase = 'racing';
    const box = race.items.pickups[2];
    race.player.simulation.reset({ ...box, heading: 0 }); race.advance(dt, NEUTRAL_INPUT, true); race.advance(dt, { ...NEUTRAL_INPUT, useItem: true }, true);
    expect(race.items.slot('player')!.shieldRemaining).toBeGreaterThan(4);
    race.pause(); const frozen = race.items.slot('player')!.shieldRemaining; race.advance(10, NEUTRAL_INPUT, false);
    expect(race.items.slot('player')!.shieldRemaining).toBe(frozen);
    race.recover(); expect(race.items.slot('player')!.shieldRemaining).toBe(0);
    race.start('quick-race'); expect(race.items.slot('player')!.shieldRemaining).toBe(0);
  });
  it('gives identical guard timers and effects at 30, 60 and 144 Hz', () => {
    const results = [30, 60, 144].map(fps => {
      const { items, racers } = setup(); const clock = new FixedStepClock(); let tick = 0;
      for (let i = 0; i < fps * 6; i++) clock.advance(1 / fps, delta => items.step(delta, racers, new Map([['player', { ...NEUTRAL_INPUT, useItem: tick++ === 0 }]])));
      return { slot: items.slot('player'), stats: items.stats, events: items.events };
    }); expect(results[0]).toEqual(results[1]); expect(results[1]).toEqual(results[2]);
  });
});
describe('defensive AI item decisions', () => {
  it('reacts to an incoming bolt but not one moving away, out of lane, above it or expiring early', () => {
    const { items, racers, use, tick } = setup(); tick(20); expect(items.shouldFire('player', racers)).toBe(false);
    const bolt = { id: 1, owner: 'attacker', x: 0, z: 40, previousX: 0, previousZ: 40, y: 0.8, dx: 0, dz: 38, life: 2 };
    items.projectiles.push(bolt); expect(items.shouldFire('player', racers)).toBe(true);
    bolt.dz = -38; expect(items.shouldFire('player', racers)).toBe(false);
    bolt.dz = 38; bolt.x = 5; expect(items.shouldFire('player', racers)).toBe(false);
    bolt.x = 0; bolt.y = 5; expect(items.shouldFire('player', racers)).toBe(false);
    bolt.y = 0.8; bolt.life = 0.1; expect(items.shouldFire('player', racers)).toBe(false);
    bolt.life = 2; bolt.owner = 'player'; expect(items.shouldFire('player', racers)).toBe(false);
    bolt.owner = 'attacker'; use(); expect(items.shouldFire('player', racers)).toBe(false);
  });
  it('anticipates an armed ground trap ahead, ignoring harmless paths and owner grace', () => {
    const { items, racers, tick } = setup(); tick(20); racers[0].simulation.current.forwardSpeed = 12;
    const trap = { id: 1, owner: 'attacker', x: 0, z: 68, heading: 0, life: 10, armRemaining: 0, ownerGrace: 0 };
    items.traps.push(trap); expect(items.shouldFire('player', racers)).toBe(true);
    trap.z = 52; expect(items.shouldFire('player', racers)).toBe(false);
    trap.z = 68; trap.x = 4; expect(items.shouldFire('player', racers)).toBe(false);
    trap.x = 0; trap.armRemaining = 2; expect(items.shouldFire('player', racers)).toBe(false);
    trap.armRemaining = 0; trap.owner = 'player'; trap.ownerGrace = 2; expect(items.shouldFire('player', racers)).toBe(false);
    trap.ownerGrace = 0; expect(items.shouldFire('player', racers)).toBe(true);
    racers[0].simulation.current.y = 1; expect(items.shouldFire('player', racers)).toBe(false);
  });
  it('submits the same normalized item action for an AI racer and does not activate after finishing', () => {
    const { items, racers, collect, place, tick } = setup(); collect(2, 'bubble-guard'); place(2, 0, 60); tick(20);
    const bolt = { id: 1, owner: 'attacker', x: 0, z: 40, previousX: 0, previousZ: 40, y: 0.8, dx: 0, dz: 38, life: 2 };
    items.projectiles.push(bolt); expect(items.shouldFire('other', racers)).toBe(true);
    tick(1, new Map([['other', { ...NEUTRAL_INPUT, useItem: items.shouldFire('other', racers) }]]));
    expect(items.slot('other')!.shieldRemaining).toBe(5);
    racers[0].progress.finishTime = 100; expect(items.shouldFire('player', racers)).toBe(false);
  });
});
