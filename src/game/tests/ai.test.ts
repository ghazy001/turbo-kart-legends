import { describe, expect, it } from 'vitest';
import { waypointInput } from '../ai/waypointController';
import { aiProfiles, raceConfig } from '../config/raceConfig';
import { createKart } from '../core/simulation';
import { NEUTRAL_INPUT } from '../core/types';
import { RaceSession } from '../race/RaceSession';
import { pointAtDistance } from '../race/trackProgress';
import { resolveRacerContacts } from '../race/racerCollision';
import { sunshineCircuit as track } from '../tracks/sunshineCircuit';
import { nearestRoadPoint, offsetSample } from '../tracks/trackSampling';

describe('AI and kart traffic', () => {
  it('uses normalized input and bounded catch-up target speeds', () => {
    const kart = { ...createKart(track), forwardSpeed: 19 };
    for (const gap of [-10000, 0, 10000]) {
      const input = waypointInput(kart, track, aiProfiles[0], [], gap);
      expect(input.throttle).toBe(0); expect(input.brake).toBeGreaterThan(0);
      expect(Math.abs(input.steer)).toBeLessThanOrEqual(1); expect(input.drift).toBe(false);
    }
  });
  it('separates a closing pair, loses speed on impact and keeps both inside rails', () => {
    const a = { ...createKart(track), forwardSpeed: 15 };
    const b = { ...a, x: a.x + Math.sin(a.heading) * 2, z: a.z + Math.cos(a.heading) * 2, forwardSpeed: 3 };
    const states = [a, b]; resolveRacerContacts(states, track);
    expect(Math.hypot(states[0].x - states[1].x, states[0].z - states[1].z)).toBeGreaterThanOrEqual(raceConfig.racerRadius * 2 - 0.01);
    expect(states[0].forwardSpeed).toBeLessThan(a.forwardSpeed);
    for (const state of states) expect(nearestRoadPoint(track, state).distance).toBeLessThan(3.67);
  });
  it('does not treat invisible finished rivals as traffic obstacles', () => {
    const states = [5, 100].map(offset => {
      const race = new RaceSession(track); race.start('quick-race'); race.phase = 'racing';
      const target = pointAtDistance(track, 200); const finisher = pointAtDistance(track, 200 + offset);
      race.opponents[1].simulation.reset({ ...target, heading: Math.atan2(target.tx, target.tz) });
      race.opponents[1].simulation.current.forwardSpeed = 12;
      race.opponents[0].simulation.reset({ ...finisher, heading: Math.atan2(finisher.tx, finisher.tz) });
      race.opponents[0].progress.finishTime = 120;
      race.advance(1 / 60, NEUTRAL_INPUT, true);
      return race.opponents[1].simulation.current;
    });
    expect(states[0]).toEqual(states[1]);
  });
  it('resolves rail-side squeezing without escape and cancels abilities on rail projection', () => {
    const start = createKart(track); const sample = track.samples[0];
    const states = [
      { ...start, ...offsetSample(sample, 3.4), driftDirection: 1 as const, driftCharge: 1, boostRemaining: 1, boostTier: 1 as const },
      { ...start, ...offsetSample(sample, 1.4) },
    ];
    resolveRacerContacts(states, track);
    for (const state of states) expect(nearestRoadPoint(track, state).distance).toBeLessThan(3.661);
    expect(Math.hypot(states[0].x - states[1].x, states[0].z - states[1].z)).toBeGreaterThan(raceConfig.racerRadius * 2 - 0.02);
    expect(states[0].boostRemaining).toBe(0); expect(states[0].driftCharge).toBe(0);
  });
  it('recovers a stalled bot at its last valid gate without awarding a lap', () => {
    const race = new RaceSession(track); race.start('quick-race'); race.phase = 'racing';
    const bot = race.opponents[0]; bot.stuckTime = raceConfig.botStuckTime + 0.1;
    bot.progress.started = true; bot.progress.nextCheckpoint = 3; bot.progress.completedLaps = 1;
    race.advance(1 / 60, NEUTRAL_INPUT, true);
    expect(bot.progress.recoveries).toBe(1); expect(bot.stuckTime).toBe(0);
    expect(bot.progress.nextCheckpoint).toBe(3); expect(bot.progress.completedLaps).toBe(1);
    expect(bot.simulation.current.forwardSpeed).toBe(0);
  });
  it('finishes a complete Quick Race with the player and all traffic using normal inputs', () => {
    const race = new RaceSession(track); race.start('quick-race');
    for (let tick = 0; tick < 18000 && race.phase !== 'finished'; tick++) {
      const input = waypointInput(race.player.simulation.current, track, { id: 'player', lane: 0, targetSpeed: 18.2 }, race.racers.map(racer => ({ id: racer.id, state: racer.simulation.current })));
      race.advance(1 / 60, input, true);
    }
    expect(race.phase).toBe('finished'); expect(race.player.progress.lapTimes).toHaveLength(3);
    expect(race.player.progress.recoveries).toBe(0);
    expect(race.player.progress.finishTime).toBeLessThan(210);
    expect(race.standings()[0].progress.finishTime).not.toBeNull();
  }, 60000);
  it('all three opponents finish three validated laps with bounded wall contacts and no chronic recovery', () => {
    const race = new RaceSession(track); race.start('quick-race');
    let maximumRoadDistance = 0; let contactTicks = 0;
    for (let i = 0; i < 18000 && race.opponents.some(r => r.progress.finishTime === null); i++) {
      race.advance(1 / 60, NEUTRAL_INPUT, true);
      for (const bot of race.opponents) {
        const distance = nearestRoadPoint(track, bot.simulation.current).distance;
        maximumRoadDistance = Math.max(maximumRoadDistance, distance);
        if (distance > 3.5) contactTicks++;
      }
    }
    for (const bot of race.opponents) {
      expect(bot.progress.completedLaps, `${bot.id} laps; gate ${bot.progress.nextCheckpoint}, distance ${bot.progress.distance}`).toBe(3);
      expect(bot.progress.finishTime).toBeGreaterThan(100);
      expect(bot.progress.recoveries).toBeLessThanOrEqual(1);
    }
    expect(maximumRoadDistance).toBeLessThan(3.67);
    expect(contactTicks).toBeLessThan(100);
  }, 60000);
});
