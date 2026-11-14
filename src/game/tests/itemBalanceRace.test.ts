import { describe, expect, it } from 'vitest';
import { itemBalance } from '../config/itemBalance';
import { itemConfig } from '../config/itemConfig';
import { waypointInput } from '../ai/waypointController';
import { RaceSession } from '../race/RaceSession';
import { trackCatalog } from '../tracks/trackCatalog';
import { expectInsideRails } from './helpers/roadBounds';

describe('three-lap races with balanced combat', () => {
  for (const [index, course] of trackCatalog.entries()) it(`${course.name}: player and AI use weighted items through a full race`, () => {
    const seed = 8241 + index;
    const race = new RaceSession(course.track, { laps: 3, difficulty: 'normal' }, { seed }); race.start('quick-race');
    const lastHit = new Map<string, number>(); let eventCursor = 0;
    for (let tick = 0; tick < 36000 && race.phase !== 'finished'; tick++) {
      const traffic = race.racers.filter(racer => racer.progress.finishTime === null).map(racer => ({ id: racer.id, state: racer.simulation.current }));
      const input = waypointInput(race.player.simulation.current, course.track, { id: 'player', lane: 0, targetSpeed: 17 }, traffic);
      input.useItem = race.items.shouldFire('player', race.racers);
      race.advance(1 / 60, input, true);
      for (const event of race.items.events) {
        if (event.id <= eventCursor || event.kind !== 'hit' || !event.target) continue;
        const previous = lastHit.get(event.target);
        if (previous !== undefined) expect(event.time - previous).toBeGreaterThanOrEqual(itemConfig.immunitySeconds - 0.02);
        lastHit.set(event.target, event.time);
        expect(race.items.slot(event.target)!.slowRemaining).toBeLessThanOrEqual(itemConfig.slowSeconds);
        expect(race.items.slot(event.target)!.immunity).toBeLessThanOrEqual(itemBalance.repeatImmunitySeconds);
      }
      eventCursor = race.items.eventSerial;
      if (tick % 180 === 0) for (const racer of race.racers) expectInsideRails(course.track, racer.simulation.current);
      expect(race.items.projectiles.length).toBeLessThanOrEqual(itemConfig.maxProjectiles);
      expect(race.items.traps.length).toBeLessThanOrEqual(itemConfig.maxTraps);
    }
    console.info('ITEM_BALANCE_QA', JSON.stringify({ track: course.id, seed, seconds: Number(race.elapsed.toFixed(3)), place: race.standings().findIndex(racer => racer.id === 'player') + 1,
      recoveries: race.racers.map(racer => racer.progress.recoveries), stats: race.items.stats, rewards: race.items.rewards }));
    expect(race.phase).toBe('finished'); expect(race.player.progress.completedLaps).toBe(3); expect(race.player.progress.lapTimes).toHaveLength(3);
    expect(race.player.progress.recoveries).toBe(0);
    for (const racer of race.opponents) { expect(racer.progress.completedLaps).toBeGreaterThanOrEqual(2); expect(racer.progress.recoveries).toBeLessThanOrEqual(1); }
    expect(race.items.stats.pickups).toBeGreaterThan(8);
    expect(race.items.stats.shots + race.items.stats.drops + race.items.stats.guards + race.items.stats.turbos).toBeGreaterThan(3);
    expect(Object.values(race.items.rewards).reduce((sum, count) => sum + count, 0)).toBe(race.items.stats.pickups);

  }, course.theme.winter || course.theme.volcanic ? 120000 : 60000);
});
