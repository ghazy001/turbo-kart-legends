import { describe, expect, it } from 'vitest';
import { AbilityBurstPool, burstStyles, particlePhase } from '../render/effects/abilityBursts';
import { abilityVisualConfig } from '../config/abilityVisualConfig';
import type { ItemEvent } from '../items/ItemSystem';

const event = (id: number, kind: ItemEvent['kind'], time: number): ItemEvent => ({ id, kind, time, x: id, z: -id, source: 'player' });

describe('ability visual event sampling', () => {
  it('renders every existing action/impact with an independent expiring envelope', () => {
    for (const kind of Object.keys(burstStyles) as ItemEvent['kind'][]) {
      const pool = new AbilityBurstPool(), source = event(1, kind, 10), duration = burstStyles[kind].duration;
      pool.sample([source], 10); expect(pool.count).toBe(1); expect(pool.slots[0].fade).toBe(1);
      pool.sample([source], 10 + duration / 2); expect(pool.slots[0].progress).toBeCloseTo(0.5); expect(pool.slots[0].fade).toBeCloseTo(0.25);
      pool.sample([source], 10 + duration + 0.001); expect(pool.count).toBe(0);
      expect(source).toEqual(event(1, kind, 10));
    }
  });
  it('prioritizes newest feedback within its fixed capacity, without replacing pool objects', () => {
    const pool = new AbilityBurstPool(), slots = [...pool.slots], events = Array.from({ length: 24 }, (_, i) => event(i, 'hit', 0));
    pool.sample(events, 0.1);
    expect(pool.count).toBe(abilityVisualConfig.bursts.capacity);
    expect(pool.slots.slice(0, pool.count).map(slot => slot.event.id)).toEqual([23, 22, 21, 20, 19, 18, 17, 16]);
    pool.sample(events, 0.2); pool.slots.forEach((slot, i) => expect(slot).toBe(slots[i]));
  });
  it('ignores future/invalid events and clears effects on restart/time rewind', () => {
    const pool = new AbilityBurstPool();
    pool.sample([event(1, 'guard', 3), event(2, 'wall', NaN)], 3.1); expect(pool.count).toBe(1);
    pool.sample([event(1, 'guard', 3)], 0); expect(pool.count).toBe(0);
    pool.sample([], 0); expect(pool.count).toBe(0);
    pool.sample([event(1, 'guard', 0)], Infinity); expect(pool.count).toBe(0);
  });
  it('freezes during pause and has identical envelopes at 30/60/144 Hz', () => {
    const events = [event(1, 'guard-break', 0.1)], samples = [30, 60, 144].map(hz => {
      const pool = new AbilityBurstPool();
      for (let frame = 0; frame <= hz / 2; frame++) pool.sample(events, frame / hz);
      const value = { progress: pool.slots[0].progress, fade: pool.slots[0].fade };
      for (let i = 0; i < 20; i++) pool.sample(events, 0.5);
      expect(pool.slots[0].progress).toBe(value.progress); return value;
    });
    expect(samples[0]).toEqual(samples[1]); expect(samples[1]).toEqual(samples[2]);
  });
  it('keeps burst source positions separate from subsequent racer motion', () => {
    const pool = new AbilityBurstPool(), impact = event(1, 'hit', 0);
    pool.sample([impact], 0.1); const { x, z } = pool.slots[0].event;
    pool.sample([impact], 0.3); expect(pool.slots[0].event).toMatchObject({ x, z });
  });
  it('reduces continuous travel while retaining phase spacing and active-state visibility', () => {
    expect(particlePhase(100, 3, 12, 3.3, true)).toBe(0.25);
    expect(particlePhase(1, 3, 12, 3.3, false)).not.toBe(particlePhase(2, 3, 12, 3.3, false));
    for (let i = 0; i < 12; i++) expect(particlePhase(127.5, i, 12, 3.3, false)).toBeGreaterThanOrEqual(0);
  });
});
