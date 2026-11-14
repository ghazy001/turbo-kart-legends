import { describe, expect, it } from 'vitest';
import { aiDifficulties, defaultRaceOptions, lapChoices, normalizeRaceOptions, type RaceOptions } from '../config/raceOptions';
import { aiProfiles } from '../config/raceConfig';
import { loadVSOptions, saveVSOptions } from '../config/vsPreferences';
import { RaceSession } from '../race/RaceSession';
import { CupSession } from '../race/CupSession';
import { sunshineCup, trackCatalog } from '../tracks/trackCatalog';
import { waypointInput } from '../ai/waypointController';
import { NEUTRAL_INPUT } from '../core/types';
import { nearestRoadPoint } from '../tracks/trackSampling';
import { defaultSelection } from '../config/visualAssets';
import { createRaceFlowStore } from '../ui/menu/raceFlowStore';

const preferences = { audioEnabled: true, mode: 'vs-race' as const, selectedTrack: trackCatalog[0].id };
function optionsFlow(initial: RaceOptions = defaultRaceOptions) {
  const flow = createRaceFlowStore(defaultSelection, preferences, initial); flow.begin('vs-race');
  flow.next(); flow.next(); flow.next(); return flow;
}

describe('validated VS options and preferences', () => {
  it('accepts only supported lap targets and difficulties, falling back independently without coercion', () => {
    for (const laps of lapChoices) for (const difficulty of aiDifficulties) expect(normalizeRaceOptions({ laps, difficulty: difficulty.id })).toEqual({ laps, difficulty: difficulty.id });
    for (const value of [null, [], '5', Infinity, { laps: 2, difficulty: '__proto__' }, { laps: '1', difficulty: 'Hard' }]) expect(normalizeRaceOptions(value)).toEqual(defaultRaceOptions);
    expect(normalizeRaceOptions({ laps: 5, difficulty: 'unknown' })).toEqual({ laps: 5, difficulty: 'normal' });
    expect(normalizeRaceOptions({ laps: NaN, difficulty: 'hard' })).toEqual({ laps: 3, difficulty: 'hard' });
  });
  it('round-trips a versioned preference, handles corruption/denial and rejects unsupported schema versions', () => {
    let saved = ''; const selected: RaceOptions = { laps: 5, difficulty: 'hard' };
    expect(saveVSOptions(selected, { setItem: (_key, value) => { saved = value; } })).toBe(true);
    expect(loadVSOptions({ getItem: () => saved })).toEqual(selected);
    for (const value of ['{bad', 'null', '{"version":2,"laps":5,"difficulty":"hard"}', '{"version":1,"laps":999,"difficulty":"__proto__"}']) expect(loadVSOptions({ getItem: () => value })).toEqual(defaultRaceOptions);
    expect(loadVSOptions({ getItem: () => { throw new Error('denied'); } })).toEqual(defaultRaceOptions);
    expect(saveVSOptions(selected, { setItem: () => { throw new Error('denied'); } })).toBe(false);
  });
  it('navigates two rows with arrows, wraps values, retains drafts on back, and cancels uncommitted changes', () => {
    const flow = optionsFlow(); expect(flow.getSnapshot().currentStep).toBe('options');
    flow.move('left'); expect(flow.getSnapshot().vsOptions.laps).toBe(1);
    flow.move('left'); expect(flow.getSnapshot().vsOptions.laps).toBe(5);
    flow.move('down'); flow.move('right'); expect(flow.getSnapshot().vsOptions).toEqual({ laps: 5, difficulty: 'hard' });
    flow.move('right'); expect(flow.getSnapshot().vsOptions.difficulty).toBe('easy');
    flow.move('up'); expect(flow.getSnapshot().optionsIndex).toBe(0);
    flow.next(); expect(flow.getSnapshot().currentStep).toBe('ready'); flow.back();
    expect(flow.getSnapshot().vsOptions).toEqual({ laps: 5, difficulty: 'easy' });
    flow.back(); expect(flow.getSnapshot().currentStep).toBe('track'); flow.next();
    expect(flow.getSnapshot().vsOptions.laps).toBe(5); flow.home(); flow.begin('vs-race');
    expect(flow.getSnapshot().vsOptions).toEqual(defaultRaceOptions);
  });
  it('commits VS defaults in memory, isolates launch snapshots, and never applies them to other modes or cup rounds', () => {
    const flow = optionsFlow(); flow.configureVS({ laps: 5, difficulty: 'hard' }); const launch = flow.launch();
    flow.configureVS({ laps: 1 }); expect(launch.options.laps).toBe(5); flow.commit(); flow.home(); flow.begin('vs-race');
    expect(flow.getSnapshot().vsOptions).toEqual({ laps: 1, difficulty: 'hard' });
    for (const mode of ['quick-race', 'time-trial', 'grand-prix'] as const) {
      flow.begin(mode); flow.configureVS({ laps: 5, difficulty: 'easy' }); expect(flow.launch().options).toEqual(defaultRaceOptions);
    }
    const cup = new CupSession(sunshineCup); expect(cup.race.options).toEqual(defaultRaceOptions);
    cup.race.phase = 'finished'; cup.race.player.progress.finishTime = 100; cup.recordFinish(cup.race); cup.nextRound();
    expect(cup.race.options).toEqual(defaultRaceOptions);
  });
  it('keeps options out of pause cosmetic editing and restores loaded VS defaults', () => {
    const flow = optionsFlow({ laps: 5, difficulty: 'easy' }); flow.home(); flow.begin('vs-race', 'cosmetic');
    flow.configureVS({ laps: 1 }); expect(flow.getSnapshot().vsOptions).toEqual({ laps: 5, difficulty: 'easy' });
    flow.next(); expect(flow.next()).toBe('save'); flow.commit(); flow.home(); flow.begin('vs-race');
    expect(flow.getSnapshot().vsOptions).toEqual({ laps: 5, difficulty: 'easy' });
  });
});

describe('per-session race configuration', () => {
  it('freezes a validated snapshot, changes only opponent target pace, and preserves the original Normal profiles', () => {
    const requested: { laps: RaceOptions['laps']; difficulty: RaceOptions['difficulty'] } = { laps: 5, difficulty: 'hard' };
    const hard = new RaceSession(trackCatalog[0].track, requested); requested.laps = 1;
    expect(hard.options.laps).toBe(5); expect(Object.isFrozen(hard.options)).toBe(true);
    const normal = new RaceSession(trackCatalog[0].track), easy = new RaceSession(trackCatalog[0].track, { laps: 1, difficulty: 'easy' });
    expect(normal.opponents.map(r => r.profile)).toEqual(aiProfiles);
    for (let i = 0; i < aiProfiles.length; i++) {
      expect(hard.opponents[i].profile!.targetSpeed).toBeGreaterThan(normal.opponents[i].profile!.targetSpeed);
      expect(easy.opponents[i].profile!.targetSpeed).toBeLessThan(normal.opponents[i].profile!.targetSpeed);
      expect(hard.opponents[i].profile!.lane).toBe(aiProfiles[i].lane);
    }
    hard.start('quick-race'); hard.player.progress.completedLaps = 2; hard.start('quick-race');
    expect(hard.options).toEqual({ laps: 5, difficulty: 'hard' }); expect(hard.player.progress.completedLaps).toBe(0);
    expect(new RaceSession(trackCatalog[0].track).options).toEqual(defaultRaceOptions);
  });
  it('keeps 30/60/144 FPS results identical under custom settings and freezes/resets correctly', () => {
    const sessions = [30, 60, 144].map(fps => {
      const race = new RaceSession(trackCatalog[1].track, { laps: 5, difficulty: 'hard' }); race.start('quick-race');
      for (let i = 0; i < fps * 5; i++) race.advance(1 / fps, { ...NEUTRAL_INPUT, throttle: 1 }, true);
      return race;
    });
    const states = sessions.map(race => race.racers.map(r => ({ kart: r.simulation.current, progress: r.progress })));
    expect(states[0]).toEqual(states[1]); expect(states[1]).toEqual(states[2]);
    const race = sessions[0], elapsed = race.elapsed; race.pause(); race.advance(20, NEUTRAL_INPUT, false);
    expect(race.elapsed).toBe(elapsed); race.recover(); expect(race.player.simulation.current.forwardSpeed).toBe(0);
    expect(race.options).toEqual({ laps: 5, difficulty: 'hard' });
  }, 15000);
  for (const course of trackCatalog) for (const [index, difficulty] of aiDifficulties.entries()) {
    const laps = lapChoices[index];
    it(`${course.name}: ${laps}-lap ${difficulty.name} VS completes with ordered laps and bounded player/traffic`, () => {
      const race = new RaceSession(course.track, { laps, difficulty: difficulty.id }); race.start('quick-race');
      let maximumDistance = 0;
      for (let tick = 0; tick < 36000 && race.phase !== 'finished'; tick++) {
        const traffic = race.racers.filter(r => r.progress.finishTime === null).map(r => ({ id: r.id, state: r.simulation.current }));
        const input = waypointInput(race.player.simulation.current, course.track, { id: 'player', lane: 0, targetSpeed: 18.2 }, traffic);
        race.advance(1 / 60, input, true);
        if (tick % 60 === 0) for (const racer of race.racers) maximumDistance = Math.max(maximumDistance, nearestRoadPoint(course.track, racer.simulation.current).distance);
        if (race.player.progress.completedLaps < laps) expect(race.player.progress.finishTime).toBeNull();
      }
      expect(race.phase).toBe('finished'); expect(race.player.progress.lapTimes).toHaveLength(laps);
      expect(race.player.progress.completedLaps).toBe(laps); expect(race.player.progress.recoveries).toBe(0);
      expect(maximumDistance).toBeLessThan(3.67);
      const time = race.elapsed; race.advance(1, NEUTRAL_INPUT, true); expect(race.elapsed).toBe(time);
    }, course.theme.winter ? 120000 : 60000);
  }
  for (const course of trackCatalog) for (const difficulty of aiDifficulties.filter(entry => entry.id !== 'normal')) {
    it(`${course.name}: every ${difficulty.name} CPU completes a one-lap race without chronic recovery`, () => {
      const race = new RaceSession(course.track, { laps: 1, difficulty: difficulty.id }); race.start('quick-race');
      for (let tick = 0; tick < 12000 && race.opponents.some(r => r.progress.finishTime === null); tick++) race.advance(1 / 60, NEUTRAL_INPUT, true);
      for (const racer of race.opponents) { expect(racer.progress.completedLaps).toBe(1); expect(racer.progress.recoveries).toBeLessThanOrEqual(1); }
      // Full-course CPU simulations share workers with exhaustive asset checks.
    }, course.theme.winter ? 120000 : 60000);
  }
});
