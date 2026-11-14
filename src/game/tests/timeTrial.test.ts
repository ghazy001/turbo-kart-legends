import { describe, expect, it } from 'vitest';
import { timeTrialConfig } from '../config/timeTrialConfig';
import { createKart } from '../core/simulation';
import { FixedStepClock } from '../core/fixedStep';
import { NEUTRAL_INPUT, type SampledTrack } from '../core/types';
import { RaceSession } from '../race/RaceSession';
import { createRaceProgress } from '../race/raceProgress';
import { ghostTimeAtProgress, sampleGhost } from '../timeTrial/ghostPlayback';
import { TrialRecords, parseTrialRecord, trialStorageKey } from '../timeTrial/TrialRecords';
import { TrialRun } from '../timeTrial/TrialRun';
import { trialRules } from '../timeTrial/trialRules';
import type { GhostFrame, GhostPose } from '../timeTrial/types';
import { trackCatalog } from '../tracks/trackCatalog';
import { waypointInput } from '../ai/waypointController';

const track = trackCatalog[0].track, dt = 1 / 60;
function memoryStorage() {
  const data = new Map<string, string>(); let writes = 0;
  return { data, get writes() { return writes; }, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { writes++; data.set(key, value); } };
}
/** A synthetic, already validated finish exercises the observer, not gate validation (covered separately). */
function attempt(duration = 2.017, laps = [0.7, 0.7, duration - 1.4], fps = 60) {
  const run = new TrialRun(track, 3), clock = new FixedStepClock(), initial = createKart(track); let elapsed = 0;
  run.reset(true, initial, -6);
  for (let frame = 0; frame < fps * 4; frame++) clock.advance(1 / fps, delta => {
    if (run.attempt) return;
    const before = { ...initial, x: initial.x + elapsed }; elapsed += delta;
    const after = { ...initial, x: initial.x + elapsed, y: Math.sin(elapsed) * 0.3, heading: 3 + elapsed * 0.2 };
    const progress = createRaceProgress(); progress.started = true;
    const end = Math.min(elapsed, duration); progress.distance = end / duration * 3 * track.length;
    if (elapsed >= duration) { progress.finishTime = duration; progress.completedLaps = 3; progress.lapTimes = laps; }
    run.observe(elapsed, delta, before, after, Math.max(0, (elapsed - delta) / duration) * 3 * track.length, progress);
  });
  expect(run.attempt).not.toBeNull(); return run;
}

describe('Time Trial recording and playback', () => {
  it('captures bounded samples on the fixed clock, including the precise fractional finish', () => {
    const run = attempt(), frames = run.attempt!.frames;
    expect(frames[0][0]).toBe(0); expect(frames.at(-1)![0]).toBe(2.017); expect(frames).toHaveLength(22);
    expect(frames.at(-1)![7]).toBeCloseTo(track.length * 3, 2); expect(frames.at(-1)![1]).toBeCloseTo(track.spawn.x + 2.017, 3);
    expect(run.attempt!.lapTimes.reduce((a, b) => a + b, 0)).toBeCloseTo(run.attempt!.duration);
  });
  it('produces identical replay data at 30, 60 and 144 render FPS', () => {
    const runs = [30, 60, 144].map(fps => attempt(2.017, undefined, fps).attempt);
    expect(runs[0]).toEqual(runs[1]); expect(runs[1]).toEqual(runs[2]);
  });
  it('interpolates across the heading seam and follows height, steering and wheel rotation without mutating frames', () => {
    const frames: GhostFrame[] = [[0, 0, 0, 0, Math.PI - 0.1, -0.2, 0, 0], [0.1, 2, 1, 4, -Math.PI + 0.1, 0.2, 2, 10]];
    const before = JSON.stringify(frames), pose: GhostPose = { x: 0, y: 0, z: 0, heading: 0, steering: 0, wheelSpin: 0 };
    expect(sampleGhost(frames, 0.05, pose)).toBe(true);
    expect(pose).toMatchObject({ x: 1, y: 0.5, z: 2, steering: 0, wheelSpin: 1 }); expect(pose.heading).toBeCloseTo(Math.PI);
    expect(sampleGhost(frames, -1, pose)).toBe(false); expect(sampleGhost(frames, 0.11, pose)).toBe(false); expect(sampleGhost(frames, NaN, pose)).toBe(false);
    expect(JSON.stringify(frames)).toBe(before);
  });
  it('compares matching validated progress across laps, using first arrival through stationary plateaus', () => {
    const frames: GhostFrame[] = [[0, 0, 0, 0, 0, 0, 0, -6], [1, 0, 0, 0, 0, 0, 0, 10], [2, 0, 0, 0, 0, 0, 0, 10], [3, 0, 0, 0, 0, 0, 0, 20]];
    expect(ghostTimeAtProgress(frames, 10)).toBe(1); expect(ghostTimeAtProgress(frames, 15)).toBe(2.5);
    expect(ghostTimeAtProgress(frames, 21)).toBeNull(); expect(ghostTimeAtProgress(frames, -7)).toBeNull();
    const run = attempt(); run.reference = { version: 1, rules: run.rules, laps: 3, bestRace: 3, bestLap: 1, lapTimes: [1, 1, 1], ghost: frames };
    expect(run.delta(2, 10)).toBe(1); expect(run.delta(0.5, 10)).toBe(-0.5);
    run.reset(true, createKart(track), -6); run.invalidate('recovery'); expect(run.delta(2, 10)).toBeNull();
  });
  it('invalidates recoveries/discontinuities/overlong runs and restarts cleanly', () => {
    const run = new TrialRun(track, 3), state = createKart(track), progress = createRaceProgress(); run.reset(true, state, -6);
    run.observe(1, dt, state, { ...state, x: state.x + 10 }, 0, progress); expect(run.invalid).toBe('discontinuity');
    run.reset(true, state, -6); progress.recoveries = 1; run.observe(1, dt, state, state, 0, progress); expect(run.invalid).toBe('recovery');
    run.reset(true, state, -6); progress.recoveries = 0; run.observe(timeTrialConfig.maxSeconds + 1, dt, state, state, 0, progress); expect(run.invalid).toBe('limit');
    run.reset(true, state, -6); expect(run.invalid).toBeNull(); expect(run.attempt).toBeNull(); expect(run.outcome).toBeNull();
    run.reset(false, state, -6); run.observe(1, dt, state, state, 0, progress); expect(run.active).toBe(false); expect(run.attempt).toBeNull();
  });
});

describe('versioned local records', () => {
  it('saves the first clean run and reloads its compatible best-race ghost', () => {
    const storage = memoryStorage(), records = new TrialRecords(storage), run = attempt(), result = records.complete(run);
    expect(result).toMatchObject({ eligible: true, first: true, newRace: true, newLap: true, storage: 'saved' });
    expect(records.complete(run)).toBe(result); expect(storage.writes).toBe(1);
    expect(new TrialRecords(storage).get(track, 3)).toEqual(result.record);
  });
  it('keeps race/lap records independent and never replaces the best ghost with a slower run', () => {
    const records = new TrialRecords(memoryStorage()), first = records.complete(attempt(2.1, [0.7, 0.7, 0.7]));
    const slower = records.complete(attempt(2.4, [0.6, 0.9, 0.9]));
    expect(slower).toMatchObject({ newRace: false, newLap: true }); expect(slower.record?.ghost).toBe(first.record?.ghost);
    expect(slower.record?.bestRace).toBe(2.1); expect(slower.record?.bestLap).toBe(0.6);
    const faster = records.complete(attempt(2.0, [0.65, 0.65, 0.7]));
    expect(faster).toMatchObject({ newRace: true, newLap: false }); expect(faster.record?.bestLap).toBe(0.6); expect(faster.record?.bestRace).toBe(2);
  });
  it('retains records on equal/slower/practice attempts, with no redundant writes', () => {
    const storage = memoryStorage(), records = new TrialRecords(storage); records.complete(attempt());
    expect(records.complete(attempt())).toMatchObject({ newRace: false, newLap: false }); expect(storage.writes).toBe(1);
    const invalid = new TrialRun(track, 3); invalid.reset(true, createKart(track), -6); invalid.invalidate('recovery');
    expect(records.complete(invalid)).toMatchObject({ eligible: false, newRace: false, reason: 'recovery' }); expect(storage.writes).toBe(1);
  });
  it('keeps tracks and timing rules separate and invalidates obsolete geometry/handling signatures', () => {
    const storage = memoryStorage(), records = new TrialRecords(storage); records.complete(attempt());
    expect(records.get(trackCatalog[1].track, 3)).toBeNull(); expect(records.get(track, 1)).toBeNull();
    const changed: SampledTrack = { ...track, definition: { ...track.definition, roadWidth: 12 } };
    expect(trialRules(changed, 3)).not.toBe(trialRules(track, 3)); expect(new TrialRecords(storage).get(changed, 3)).toBeNull();
    expect(storage.data.has(trialStorageKey(track.definition.id))).toBe(true);
  });
  it('rejects malformed schemas/non-finite times while salvaging valid times from a broken ghost', () => {
    const record = new TrialRecords(memoryStorage()).complete(attempt()).record!;
    const parse = (value: unknown) => parseTrialRecord(JSON.stringify(value), record.rules, 3, track.length);
    for (const value of [null, [], { ...record, version: 2 }, { ...record, bestRace: -1 }, { ...record, bestLap: Infinity }, { ...record, lapTimes: [1] }, { ...record, lapTimes: [1, 1, 1] }]) expect(parse(value)).toBeNull();
    expect(parseTrialRecord('{bad', record.rules, 3, track.length)).toBeNull();
    for (const ghost of [[], [[0, 0]], record.ghost!.map(frame => [NaN, ...frame.slice(1)]), [...record.ghost!].reverse(), [...record.ghost!, record.ghost!.at(-1)!]]) {
      expect(parse({ ...record, ghost })).toEqual({ ...record, ghost: null });
    }
    expect(parseTrialRecord(' '.repeat(timeTrialConfig.maxStorageChars + 1), record.rules, 3, track.length)).toBeNull();
  });
  it('retains a session ghost when quota allows only times, and handles completely denied storage', () => {
    const storage = memoryStorage(); const quota = { getItem: storage.getItem, setItem: (key: string, value: string) => { if (value.length > 400) throw new Error('quota'); storage.setItem(key, value); } };
    const records = new TrialRecords(quota), result = records.complete(attempt()); expect(result.storage).toBe('times-only');
    expect(records.get(track, 3)?.ghost).not.toBeNull(); expect(new TrialRecords(quota).get(track, 3)?.ghost).toBeNull();
    const denied = new TrialRecords({ getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
    expect(denied.complete(attempt())).toMatchObject({ storage: 'memory-only', eligible: true }); expect(denied.get(track, 3)?.ghost).not.toBeNull();
  });
});

describe('race integration', () => {
  it('has identical driving/progress with a saved ghost reference or without one', () => {
    const record = new TrialRecords(memoryStorage()).complete(attempt()).record!;
    const sessions = [null, record].map(reference => {
      const race = new RaceSession(track); race.start('time-trial'); race.trial.reference = reference;
      for (let tick = 0; tick < 600; tick++) race.advance(dt, { ...NEUTRAL_INPUT, throttle: 1, steer: tick > 300 ? 0.2 : 0 }, true);
      return { state: race.player.simulation.current, progress: race.player.progress, elapsed: race.elapsed };
    });
    expect(sessions[0]).toEqual(sessions[1]);
  });
  it('freezes recording/visual time with pause and clears eligibility on recovery, never enabling it in CPU races', () => {
    const race = new RaceSession(track); race.start('time-trial');
    for (let i = 0; i < 300; i++) race.advance(dt, { ...NEUTRAL_INPUT, throttle: 1 }, true);
    const elapsed = race.elapsed, renderTime = race.renderTime; race.pause(); race.advance(100, NEUTRAL_INPUT, false);
    expect(race.elapsed).toBe(elapsed); expect(race.renderTime).toBe(renderTime); expect(race.trial.invalid).toBeNull();
    race.recover(); expect(race.trial.invalid).toBe('recovery'); race.start('time-trial'); expect(race.trial.invalid).toBeNull(); expect(race.renderTime).toBe(0);
    for (const kind of ['quick-race', 'free-drive'] as const) { race.start(kind); expect(race.trial.active).toBe(false); }
  });
  for (const course of trackCatalog) it(`${course.name}: completes three laps, saves/reloads a ghost and preserves simulation during playback`, () => {
    const race = new RaceSession(course.track); race.start('time-trial');
    for (let i = 0; i < 18000 && race.phase !== 'finished'; i++) race.advance(dt, waypointInput(race.player.simulation.current, course.track, { id: 'player', lane: 0, targetSpeed: 18 }, []), true);
    expect(race.phase).toBe('finished'); expect(race.items.enabled).toBe(false); expect(race.player.progress.recoveries).toBe(0);
    const storage = memoryStorage(), outcome = new TrialRecords(storage).complete(race.trial);
    expect(outcome.eligible).toBe(true); expect(outcome.record!.ghost!.length).toBeGreaterThan(1000);
    const loaded = new TrialRecords(storage).get(course.track, 3); expect(loaded).toEqual(outcome.record);
    const before = { ...race.player.simulation.current }, pose: GhostPose = { x: 0, y: 0, z: 0, heading: 0, steering: 0, wheelSpin: 0 };
    for (let time = 0; time <= loaded!.bestRace; time += 0.037) expect(sampleGhost(loaded!.ghost!, time, pose)).toBe(true);
    expect(race.player.simulation.current).toEqual(before);
    console.info('TIME_TRIAL_QA', JSON.stringify({ track: course.id, seconds: outcome.record!.bestRace, laps: outcome.record!.lapTimes, frames: loaded!.ghost!.length, bytes: storage.data.get(trialStorageKey(course.id))!.length }));
  }, 60000);
});
