import { describe, expect, it } from 'vitest';
import { raceConfig } from '../config/raceConfig';
import { NEUTRAL_INPUT } from '../core/types';
import { RaceSession } from '../race/RaceSession';
import { advanceRaceProgress, bestLap, createRaceProgress } from '../race/raceProgress';
import { createCheckpoints, crossingFraction, pointAtDistance } from '../race/trackProgress';
import { sunshineCircuit as track } from '../tracks/sunshineCircuit';
import { offsetSample } from '../tracks/trackSampling';
import { waypointInput } from '../ai/waypointController';

const gates = createCheckpoints(track);
const sides = (index: number, lateral = 0) => {
  const gate = gates[index]; const center = offsetSample(gate, lateral);
  return [{ x: center.x - gate.tx * 0.2, z: center.z - gate.tz * 0.2 }, { x: center.x + gate.tx * 0.2, z: center.z + gate.tz * 0.2 }] as const;
};
function pass(progress: ReturnType<typeof createRaceProgress>, index: number, elapsed: number, reverse = false) {
  const points = sides(index);
  advanceRaceProgress(progress, points[reverse ? 1 : 0], points[reverse ? 0 : 1], elapsed, 1 / 60, track, gates);
}

describe('ordered race progress', () => {
  it('aligns gates to the sampled road and the visible finish-line distance', () => {
    expect(gates).toHaveLength(raceConfig.checkpoints);
    expect(gates[0]).toMatchObject(pointAtDistance(track, 10));
    expect(pointAtDistance(track, -2)).toEqual(pointAtDistance(track, track.length - 2));
  });
  it('requires the initial start crossing, then every gate in order for each of three laps', () => {
    const progress = createRaceProgress();
    pass(progress, 0, 1); expect(progress.started).toBe(true); expect(progress.completedLaps).toBe(0);
    for (let lap = 0; lap < 3; lap++) {
      for (let index = 1; index < gates.length; index++) pass(progress, index, lap * 60 + index * 4 + 2);
      pass(progress, 0, (lap + 1) * 60);
      expect(progress.completedLaps).toBe(lap + 1);
    }
    expect(progress.lapTimes).toHaveLength(3); expect(bestLap(progress)).toBeCloseTo(60 - 1 / 120);
    expect(progress.finishTime).toBeCloseTo(180 - 1 / 120);
    const finished = JSON.stringify(progress); pass(progress, 1, 200); expect(JSON.stringify(progress)).toBe(finished);
  });
  it('rejects skipped gates, reverse crossings, outside-width crossings and teleport sweeps', () => {
    const progress = createRaceProgress();
    pass(progress, 0, 1); pass(progress, 2, 2); pass(progress, 0, 3);
    expect(progress.nextCheckpoint).toBe(1); expect(progress.completedLaps).toBe(0);
    pass(progress, 1, 4, true); expect(progress.nextCheckpoint).toBe(1);
    const outside = sides(1, 7); expect(crossingFraction(gates[1], ...outside)).toBeNull();
    const gate = gates[1];
    expect(crossingFraction(gate, { x: gate.x - gate.tx * 10, z: gate.z - gate.tz * 10 }, { x: gate.x + gate.tx * 10, z: gate.z + gate.tz * 10 })).toBeNull();
    pass(progress, 1, 5); pass(progress, 1, 6); expect(progress.nextCheckpoint).toBe(2);
    expect(progress.distance).toBeLessThan(track.length * 2 / gates.length);
  });
  it('cannot award laps by oscillating across the finish or resetting in the final sector', () => {
    const progress = createRaceProgress(); pass(progress, 0, 1);
    for (let i = 0; i < 100; i++) { pass(progress, 0, i + 2, true); pass(progress, 0, i + 3); }
    expect(progress.completedLaps).toBe(0); expect(progress.nextCheckpoint).toBe(1);
    const race = new RaceSession(track); race.start('time-trial'); race.phase = 'racing';
    Object.assign(race.player.progress, { started: true, nextCheckpoint: 0, completedLaps: 2 });
    race.recover(); expect(race.player.progress.finishTime).toBeNull(); expect(race.player.progress.completedLaps).toBe(2);
    expect(race.player.progress.distance).toBeLessThan(track.length * 3);
  });
  it('detects sustained wrong-way movement and clears the warning on a correct heading', () => {
    const progress = createRaceProgress(); const [before, after] = sides(0);
    for (let i = 0; i < 60; i++) advanceRaceProgress(progress, after, before, i / 60, 1 / 60, track, gates);
    expect(progress.wrongWayTime).toBeGreaterThan(raceConfig.wrongWayDelay);
    for (let i = 0; i < 60; i++) advanceRaceProgress(progress, before, after, 1 + i / 60, 1 / 60, track, gates);
    expect(progress.wrongWayTime).toBe(0);
  });
});

describe('race session timing and recovery', () => {
  it('locks all karts during countdown, freezes while paused, and starts time at GO', () => {
    const race = new RaceSession(track); race.start('quick-race');
    const positions = race.racers.map(r => ({ ...r.simulation.current }));
    for (let i = 0; i < 120; i++) race.advance(1 / 60, { ...NEUTRAL_INPUT, throttle: 1 }, true);
    expect(race.phase).toBe('countdown'); expect(race.elapsed).toBe(0);
    expect(race.racers.map(r => r.simulation.current)).toEqual(positions);
    const countdown = race.countdown; race.advance(100, NEUTRAL_INPUT, false); expect(race.countdown).toBe(countdown);
    for (let i = 0; i < 60; i++) race.advance(1 / 60, NEUTRAL_INPUT, true);
    expect(race.phase).toBe('racing'); expect(race.elapsed).toBe(0);
    race.advance(1 / 60, { ...NEUTRAL_INPUT, throttle: 1 }, true);
    expect(race.elapsed).toBeCloseTo(1 / 60); expect(race.player.simulation.current.forwardSpeed).toBeGreaterThan(0);
  });
  it('pauses all racers and active boost time together after GO', () => {
    const race = new RaceSession(track); race.start('quick-race'); race.phase = 'racing';
    for (let tick = 0; tick < 300; tick++) race.advance(1 / 60, { ...NEUTRAL_INPUT, throttle: 1 }, true);
    race.player.simulation.current.boostTier = 1; race.player.simulation.current.boostRemaining = 0.5;
    race.pause();
    const states = race.racers.map(racer => ({ ...racer.simulation.current })); const elapsed = race.elapsed;
    for (let frame = 0; frame < 60; frame++) race.advance(1 / 30, { ...NEUTRAL_INPUT, throttle: 1, drift: true }, false);
    expect(race.elapsed).toBe(elapsed); expect(race.racers.map(racer => racer.simulation.current)).toEqual(states);
    expect(race.player.simulation.current.boostRemaining).toBe(0.5);
  });
  it('recovers at the last validated checkpoint without awarding progress or resetting time', () => {
    const race = new RaceSession(track); race.start('time-trial'); race.phase = 'racing'; race.elapsed = 20;
    pass(race.player.progress, 0, 1); pass(race.player.progress, 1, 10);
    race.player.simulation.current.forwardSpeed = 20;
    race.recover();
    expect(race.player.progress.nextCheckpoint).toBe(2); expect(race.player.progress.completedLaps).toBe(0);
    expect(race.player.simulation.current.forwardSpeed).toBe(0); expect(race.elapsed).toBe(20);
    const expected = pointAtDistance(track, gates[1].distance + raceConfig.recoveryOffset);
    expect(race.player.simulation.current.x).toBeCloseTo(expected.x);
    expect(race.player.progress.recoveries).toBe(1);
    race.start('time-trial'); expect(race.elapsed).toBe(0); expect(race.player.progress.nextCheckpoint).toBe(0);
    expect(race.player.progress.lapTimes).toEqual([]);
  });
  it('keeps free drive available and preserves its original reset behavior', () => {
    const race = new RaceSession(track); race.start('free-drive');
    for (let i = 0; i < 60; i++) race.advance(1 / 60, { ...NEUTRAL_INPUT, throttle: 1 }, true);
    expect(race.elapsed).toBe(0); expect(race.racers).toHaveLength(1);
    race.recover(); expect(race.player.simulation.current).toMatchObject(track.spawn);
  });
  it('ranks validated distance rather than a wrapped nearest-road shortcut', () => {
    const race = new RaceSession(track); race.start('quick-race');
    race.player.progress.distance = 200; race.opponents[0].progress.distance = 199;
    expect(race.standings()[0]).toBe(race.player);
    race.opponents[0].progress.finishTime = 160; expect(race.standings()[0]).toBe(race.opponents[0]);
    race.player.progress.finishTime = 159; expect(race.standings()[0]).toBe(race.player);
  });
  it('produces the same race and kart state at 30, 60 and 144 render FPS', () => {
    const states = [30, 60, 144].map(fps => {
      const race = new RaceSession(track); race.start('quick-race');
      for (let i = 0; i < fps * 8; i++) race.advance(1 / fps, { ...NEUTRAL_INPUT, throttle: 1 }, true);
      return race.racers.map(r => ({ kart: r.simulation.current, progress: r.progress }));
    });
    expect(states[0]).toEqual(states[1]); expect(states[1]).toEqual(states[2]);
  });
  it('finishes a complete time trial through ordinary controller inputs', () => {
    const race = new RaceSession(track); race.start('time-trial');
    for (let i = 0; i < 18000 && race.phase !== 'finished'; i++) {
      const input = waypointInput(race.player.simulation.current, track, { id: 'player', lane: 0, targetSpeed: 18 }, []);
      race.advance(1 / 60, input, true);
    }
    expect(race.phase).toBe('finished'); expect(race.player.progress.lapTimes).toHaveLength(3);
    expect(race.player.progress.finishTime).toBeGreaterThan(100); expect(race.player.progress.finishTime).toBeLessThan(210);
    const time = race.elapsed; race.advance(1, NEUTRAL_INPUT, true); expect(race.elapsed).toBe(time);
  }, 30000);
});
