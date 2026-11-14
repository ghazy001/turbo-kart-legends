import { describe, expect, it } from 'vitest';
import { CupSession, cupPoints } from '../race/CupSession';
import { RaceSession } from '../race/RaceSession';
import { sunshineCup, trackCatalog, trackDefinition } from '../tracks/trackCatalog';
import { waypointInput } from '../ai/waypointController';
import { NEUTRAL_INPUT } from '../core/types';
import { nearestRoadPoint } from '../tracks/trackSampling';

/** Unit fixture provides finishing order; the integration test below drives every gate. */
function finish(cup: CupSession, order = ['player', 'breeze', 'nova', 'moss']) {
  cup.race.phase = 'finished';
  for (const [index, id] of order.entries()) cup.race.racers.find(racer => racer.id === id)!.progress.finishTime = 120 + index;
}
describe('Sunshine Cup championship bookkeeping', () => {
  it('requires courses, starts round one on the configured course, and cannot advance early', () => {
    expect(() => new CupSession({ ...sunshineCup, tracks: [] })).toThrow('at least one');
    const cup = new CupSession(sunshineCup);
    expect(cup.round).toBe(0); expect(cup.race.track).toBe(trackCatalog[0].track); expect(cup.race.phase).toBe('countdown');
    expect(cup.recordFinish(cup.race)).toBe(false); expect(cup.nextRound()).toBeNull(); expect(cup.standings()).toEqual([]);
  });
  it('awards 10/7/4/1 exactly once, snapshots results, and rejects foreign or stale races', () => {
    const cup = new CupSession(sunshineCup); finish(cup);
    const previous = cup.race;
    expect(cup.recordFinish(new RaceSession(previous.track))).toBe(false);
    expect(cup.recordFinish(previous)).toBe(true); expect(cup.recordFinish(previous)).toBe(false);
    expect(cup.rounds[0].finishes.map(f => f.points)).toEqual(cupPoints);
    previous.player.progress.finishTime = 999; expect(cup.rounds[0].finishes[0].finishTime).toBe(120);
    expect(cup.restartRound()).toBe(false); const next = cup.nextRound()!;
    expect(cup.recordFinish(previous)).toBe(false); expect(next).not.toBe(previous);
    expect(next.track).toBe(trackCatalog[1].track); expect(next.elapsed).toBe(0); expect(next.player.progress.completedLaps).toBe(0);
    expect(next.racers.map(r => r.id)).toEqual(previous.racers.map(r => r.id));
    expect(next.player.simulation.current.boostRemaining).toBe(0); expect(next.player.simulation.current.forwardSpeed).toBe(0);
    expect(cup.standings()[0].points).toBe(10);
  });
  it('preserves earlier points across a round restart and completes without an extra round', () => {
    const cup = new CupSession(sunshineCup); finish(cup); cup.recordFinish(cup.race); cup.nextRound();
    cup.race.advance(1 / 60, NEUTRAL_INPUT, true); expect(cup.restartRound()).toBe(true);
    expect(cup.rounds).toHaveLength(1); expect(cup.standings()[0].points).toBe(10);
    finish(cup); cup.recordFinish(cup.race);
    expect(cup.complete).toBe(false);
    while (!cup.complete) { cup.nextRound(); finish(cup); cup.recordFinish(cup.race); }
    expect(cup.complete).toBe(true); expect(cup.standings().map(entry => entry.points)).toEqual(cupPoints.map(points => points * sunshineCup.tracks.length));
    expect(cup.nextRound()).toBeNull(); expect(cup.recordFinish(cup.race)).toBe(false);
    const fresh = new CupSession(sunshineCup); expect(fresh.rounds).toHaveLength(0); expect(fresh.round).toBe(0);
  });
  it('breaks tied points by place countback then final-round finishing order', () => {
    const cup = new CupSession(sunshineCup); finish(cup); cup.recordFinish(cup.race); cup.nextRound();
    finish(cup, ['breeze', 'player', 'moss', 'nova']); cup.recordFinish(cup.race);
    expect(cup.standings().map(entry => [entry.id, entry.points])).toEqual([['breeze', 17], ['player', 17], ['moss', 5], ['nova', 5]]);
    const three = new CupSession({ ...sunshineCup, tracks: ['sunshine-circuit', 'sugar-rush-valley', 'sunshine-circuit'] });
    for (const order of [['player', 'nova', 'breeze', 'moss'], ['nova', 'moss', 'breeze', 'player'], ['moss', 'nova', 'breeze', 'player']]) {
      finish(three, order); three.recordFinish(three.race); three.nextRound();
    }
    expect(three.standings().map(entry => [entry.id, entry.points])).toEqual([['nova', 24], ['moss', 18], ['player', 12], ['breeze', 12]]);
  });
  it('classifies unfinished opponents by existing validated progress without inventing finish times', () => {
    const cup = new CupSession(sunshineCup); cup.race.phase = 'finished'; cup.race.player.progress.finishTime = 130;
    cup.race.opponents[0].progress.distance = 100; cup.race.opponents[1].progress.distance = 500;
    cup.recordFinish(cup.race);
    expect(cup.rounds[0].finishes.map(r => r.id)).toEqual(['player', 'nova', 'breeze', 'moss']);
    expect(cup.rounds[0].finishes.slice(1).every(r => r.finishTime === null)).toBe(true);
  });
  it('drives every cup round through every checkpoint with normal inputs, AI traffic, and safe boundaries', () => {
    const cup = new CupSession(sunshineCup);
    for (let round = 0; round < sunshineCup.tracks.length; round++) {
      const race = cup.race, track = race.track;
      expect(track).toBe(trackDefinition(sunshineCup.tracks[round]).track);
      let maximumRoadDistance = 0;
      for (let tick = 0; tick < 18000 && race.phase !== 'finished'; tick++) {
        const input = waypointInput(race.player.simulation.current, track, { id: 'player', lane: 0, targetSpeed: 18.2 }, race.racers.filter(r => r.progress.finishTime === null).map(r => ({ id: r.id, state: r.simulation.current })));
        race.advance(1 / 60, input, true);
        if (tick % 30 === 0) for (const racer of race.racers) maximumRoadDistance = Math.max(maximumRoadDistance, nearestRoadPoint(track, racer.simulation.current).distance);
      }
      expect(race.phase, track.definition.name).toBe('finished');
      expect(race.player.progress.lapTimes).toHaveLength(3); expect(race.player.progress.recoveries).toBe(0);
      expect(maximumRoadDistance).toBeLessThan(3.67); expect(cup.recordFinish(race)).toBe(true);
      if (round < sunshineCup.tracks.length - 1) expect(cup.nextRound()).not.toBeNull();
    }
    expect(cup.complete).toBe(true); expect(cup.rounds).toHaveLength(sunshineCup.tracks.length);
    expect(cup.standings().reduce((sum, entry) => sum + entry.points, 0)).toBe(cupPoints.reduce((sum, points) => sum + points, 0) * sunshineCup.tracks.length);
  // Every configured full CPU race shares workers with other exhaustive regression checks.
  }, 180000);
});
