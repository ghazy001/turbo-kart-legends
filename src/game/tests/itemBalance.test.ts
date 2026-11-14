import { describe, expect, it } from 'vitest';
import { itemBalance } from '../config/itemBalance';
import { itemConfig, type ItemId } from '../config/itemConfig';
import { nextItemRoll, pickWeightedItem, racerItemSeed, rewardBand, type RewardContext } from '../items/itemRewards';
import { itemWorld } from './helpers/itemWorld';
import { ItemSystem } from '../items/ItemSystem';
import { trackCatalog } from '../tracks/trackCatalog';

const dt = 1 / 60;
describe('position-weighted item rewards', () => {
  it('gives leaders more defense and trailing racers more bolts, keeping every item possible', () => {
    for (const [position, band] of [[1, 'leading'], [2, 'middle'], [4, 'trailing']] as const) {
      const context = { position, fieldSize: 4 }, counts: Record<ItemId, number> = { 'spark-bolt': 0, 'banana-trap': 0, 'bubble-guard': 0 };
      expect(rewardBand(context)).toBe(band);
      for (let i = 0; i < 1000; i++) counts[pickWeightedItem(context, (i + 0.5) / 1000)]++;
      for (const item of Object.keys(counts) as ItemId[]) expect(counts[item]).toBe(itemBalance.weights[band][item] * 10);
    }
    expect(rewardBand({ position: 1, fieldSize: 1 })).toBe('leading');
    expect(pickWeightedItem({ position: 1, fieldSize: 4 }, 0.5)).toBe('bubble-guard');
    expect(pickWeightedItem({ position: 4, fieldSize: 4 }, 0.5)).toBe('spark-bolt');
  });
  it('clamps out-of-range rolls and produces stable, bounded seeded streams', () => {
    let seed = racerItemSeed(123, 'track', 'player'); const original = seed, counts = new Set<number>();
    for (let i = 0; i < 1000; i++) { const next = nextItemRoll(seed); expect(next.roll).toBeGreaterThanOrEqual(0); expect(next.roll).toBeLessThan(1); seed = next.seed; counts.add(seed); }
    expect(counts.size).toBe(1000); expect(nextItemRoll(original)).toEqual(nextItemRoll(original));
    expect(racerItemSeed(123, 'track', 'other')).not.toBe(original); expect(racerItemSeed(124, 'track', 'player')).not.toBe(original);
    for (const roll of [NaN, -1, 1, Infinity]) expect(Object.keys(itemBalance.weights.leading)).toContain(pickWeightedItem({ position: 1, fieldSize: 4 }, roll));
  });
  it('samples the configured frequencies across a seeded stream', () => {
    for (const position of [1, 2, 4]) {
      let seed = 12345; const counts: Record<ItemId, number> = { 'spark-bolt': 0, 'banana-trap': 0, 'bubble-guard': 0 };
      const context = { position, fieldSize: 4 };
      for (let i = 0; i < 10000; i++) { const next = nextItemRoll(seed); seed = next.seed; counts[pickWeightedItem(context, next.roll)]++; }
      for (const item of Object.keys(counts) as ItemId[]) expect(Math.abs(counts[item] / 100 - itemBalance.weights[rewardBand(context)][item])).toBeLessThan(2);
    }
  });
  it('uses current validated standings at collection, including finishers ahead', () => {
    const contexts: RewardContext[] = [];
    const world = itemWorld({ rewardPicker: context => { contexts.push(context); return pickWeightedItem(context, 0.5); } });
    expect(world.collect(0)).toBe('bubble-guard');
    world.items.recover('player'); world.step(61); world.items.pickups[1].respawn = 0;
    world.racers[0].progress.distance = -100; world.racers[1].progress.finishTime = 50;
    expect(world.collect(0)).toBe('spark-bolt'); expect(contexts).toEqual([{ position: 1, fieldSize: 4 }, { position: 4, fieldSize: 4 }]);
    expect(world.items.events.at(-1)?.position).toBe(4);
  });
  it('keeps per-racer rolls independent of unrelated pickups and reproduces reset results', () => {
    const sequence = (otherCollects: boolean, seed = 77) => {
      const world = itemWorld({ seed }); const result: ItemId[] = [];
      for (let i = 0; i < 8; i++) {
        if (otherCollects) { world.items.recover('one'); world.step(61); world.items.pickups[0].respawn = 0; world.collect(1, 0); }
        world.items.recover('player'); world.step(61); world.items.pickups[1].respawn = 0;
        result.push(world.collect(0)!);
      }
      world.items.reset(true, world.racers); world.items.pickups[1].respawn = 0;
      expect(world.collect(0)).toBe(result[0]);
      expect(Object.values(world.items.rewards).reduce((a, b) => a + b, 0)).toBe(1);
      return result;
    };
    expect(sequence(false)).toEqual(sequence(true)); expect(sequence(false)).not.toEqual(sequence(false, 78));
  });
  it.each(trackCatalog)('$name: all nine boxes roll by collector context instead of containing fixed items', ({ track }) => {
    const items = new ItemSystem(track);
    expect(items.pickups).toHaveLength(9); expect(items.pickups.every(box => !('item' in box))).toBe(true);
  });
});

describe('repeated-hit recovery and cooldown balance', () => {
  function damageWorld() {
    const world = itemWorld({ rewardPicker: () => 'spark-bolt' }); let serial = 0;
    const hit = () => {
      const state = world.racers[0].simulation.current;
      world.items.projectiles.push({ id: ++serial, owner: 'one', x: state.x, z: state.z, previousX: state.x, previousZ: state.z, y: state.y + 0.8, dx: 0, dz: 38, life: 1 }); world.step();
    };
    return { ...world, hit };
  }
  it('gives a real acceleration window after stun, with no extension from blocked spam', () => {
    const { items, racers, step, hit } = damageWorld(); racers[0].simulation.current.forwardSpeed = 20; hit();
    expect(racers[0].simulation.current.forwardSpeed).toBe(11); expect(items.slot('player')?.immunity).toBe(itemConfig.immunitySeconds);
    step(60); const before = items.slot('player')!.immunity; expect(items.slot('player')!.slowRemaining).toBe(0);
    hit(); expect(items.stats.hits).toBe(1); expect(items.slot('player')!.immunity).toBeLessThan(before);
    racers[0].simulation.current.forwardSpeed = 20; step(); expect(racers[0].simulation.current.forwardSpeed).toBe(20);
  });
  it('makes the next damaging hit within six seconds milder and clears the chain after quiet time', () => {
    const { items, racers, step, hit } = damageWorld(); hit(); step(Math.ceil(itemConfig.immunitySeconds / dt) + 1);
    racers[0].simulation.current.forwardSpeed = 20; const pose = { x: racers[0].simulation.current.x, z: racers[0].simulation.current.z, heading: racers[0].simulation.current.heading }; hit();
    expect(items.slot('player')).toMatchObject({ hitChain: 2, immunity: itemBalance.repeatImmunitySeconds, slowRemaining: itemBalance.repeatSlowSeconds });
    expect(racers[0].simulation.current.forwardSpeed).toBe(itemBalance.repeatSlowSpeed);
    expect({ x: racers[0].simulation.current.x, z: racers[0].simulation.current.z, heading: racers[0].simulation.current.heading }).toEqual(pose);
    step(Math.ceil(itemBalance.hitWindowSeconds / dt) + 1); racers[0].simulation.current.forwardSpeed = 20; hit();
    expect(items.slot('player')?.hitChain).toBe(1); expect(racers[0].simulation.current.forwardSpeed).toBe(11);
  });
  it('retains the next held item until cooldown and a fresh press permit use', () => {
    const { items, collect, use, step } = itemWorld({ rewardPicker: () => 'spark-bolt' }); collect(0); use();
    expect(items.slot('player')!.cooldown).toBe(itemBalance.useCooldown);
    expect(collect(0, 0)).toBeNull(); step(Math.ceil(itemBalance.useCooldown / dt) + 1); collect(0, 0); use();
    expect(items.stats.shots).toBe(2);
  });
  it('clears recovery history without resetting the independent reward stream', () => {
    const { items, step, hit } = damageWorld(); hit(); items.recover('player');
    expect(items.slot('player')).toMatchObject({ hitChain: 0, hitWindow: 0, slowRemaining: 0 });
    step(Math.ceil(itemConfig.immunitySeconds / dt) + 1); hit(); expect(items.slot('player')?.hitChain).toBe(1);
  });
});

describe('AI item timing and prediction', () => {
  it('prepares a held guard after a delay in a moving pack, without wasting it when isolated or stopped', () => {
    const { items, racers, collect, step, place } = itemWorld({ rewardPicker: () => 'bubble-guard' });
    collect(0); place(0, 0, 50); place(1, 0, 65); place(2, 15, 150); place(3, 15, 170);
    racers[0].simulation.current.forwardSpeed = 15;
    step(20); expect(items.shouldFire('player', racers)).toBe(false);
    step(180); expect(items.shouldFire('player', racers)).toBe(true);
    racers[0].simulation.current.forwardSpeed = 0; expect(items.shouldFire('player', racers)).toBe(false);
    racers[0].simulation.current.forwardSpeed = 15; place(1, 0, 150); expect(items.shouldFire('player', racers)).toBe(false);
  });
  function armed() {
    const world = itemWorld({ rewardPicker: () => 'spark-bolt' }); world.collect(0); world.place(0, 0, 50); world.place(1, 0, 65); world.place(2, 15, 150); world.place(3, 15, 170);
    return world;
  }
  it('waits for a human-sized reaction interval after collection', () => {
    const { items, racers, step } = armed(); expect(items.shouldFire('player', racers)).toBe(false);
    step(20); expect(items.shouldFire('player', racers)).toBe(true);
  });
  it('leads no shots: waits for crossing targets and rejects targets moving out of the straight path', () => {
    const { items, racers, step, place } = armed(); step(20);
    racers[1].simulation.current.lateralSpeed = 8; expect(items.shouldFire('player', racers)).toBe(false);
    place(1, 3, 65); racers[1].simulation.current.lateralSpeed = -6; expect(items.shouldFire('player', racers)).toBe(true);
  });
  it('does not shoot through a closer immune racer to reach an exposed target', () => {
    const { items, racers, step, place } = armed(); items.recover('one'); place(1, 0, 60); place(2, 0, 70); step(20);
    expect(items.shouldFire('player', racers)).toBe(false); step(140); expect(items.shouldFire('player', racers)).toBe(true);
  });
  it('drops only for a pursuer predicted to reach the trap after it arms', () => {
    const { items, racers, collect, step, place } = itemWorld({ rewardPicker: () => 'banana-trap' }); collect(0); place(0, 0, 60); place(1, 0, 40); step(20); racers[0].simulation.current.forwardSpeed = 15;
    expect(items.shouldFire('player', racers)).toBe(false);
    racers[1].simulation.current.forwardSpeed = 18; expect(items.shouldFire('player', racers)).toBe(true);
    racers[1].simulation.current.forwardSpeed = 80; expect(items.shouldFire('player', racers)).toBe(false);
  });
});
