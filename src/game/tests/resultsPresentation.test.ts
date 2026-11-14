import { describe, expect, it } from 'vitest';
import { defaultSelection } from '../config/visualAssets';
import { opponentSelections } from '../config/visualSelection';
import { CupSession } from '../race/CupSession';
import { RaceSession } from '../race/RaceSession';
import { sunshineCup, trackCatalog } from '../tracks/trackCatalog';
import { cupPodium, racePodium, resultBadge, resultCue } from '../ui/results/resultsPresentation';

describe('results presentation observes existing race/cup classification', () => {
  it.each(trackCatalog)('$name keeps unfinished times null, preserves racer identities/cosmetics, and cannot change race state', ({ track }) => {
    const race = new RaceSession(track, { laps: 1, difficulty: 'hard' }); race.start('quick-race');
    race.phase = 'finished'; race.player.progress.finishTime = 51;
    race.opponents[0].progress.finishTime = 50;
    race.opponents[1].progress.distance = 100; race.opponents[2].progress.distance = 200;
    const before = JSON.stringify(race), choices = opponentSelections(defaultSelection);
    const entries = racePodium(race, defaultSelection);
    expect(entries.map(entry => [entry.id, entry.place, entry.finishTime])).toEqual([['breeze', 1, 50], ['player', 2, 51], ['moss', 3, null]]);
    expect(entries.map(entry => entry.selection)).toEqual([choices[0], defaultSelection, choices[2]]);
    entries[1].selection.kartId = 'boat';
    expect(defaultSelection.kartId).not.toBe('boat'); expect(JSON.stringify(race)).toBe(before);
    expect(resultBadge(race)).toBe('RACE COMPLETE'); expect(resultCue(race)).toBe('finish');
  });
  it('does not add the player to the top three when they finish fourth', () => {
    const race = new RaceSession(trackCatalog[0].track); race.start('quick-race'); race.phase = 'finished';
    race.racers.forEach((racer, i) => { racer.progress.finishTime = i === 0 ? 120 : 100 + i; });
    expect(racePodium(race, defaultSelection).map(entry => entry.id)).toEqual(['breeze', 'nova', 'moss']);
    expect(resultCue(race)).toBe('finish');
  });
  it('uses scored snapshots for cup rounds and championship totals/countback for the final podium', () => {
    const cup = new CupSession({ ...sunshineCup, tracks: sunshineCup.tracks.slice(0, 3) });
    expect(cupPodium(cup, defaultSelection)).toEqual([]);
    const orders = [['player', 'breeze', 'nova', 'moss'], ['breeze', 'player', 'nova', 'moss'], ['breeze', 'nova', 'player', 'moss']];
    for (const [round, order] of orders.entries()) {
      cup.race.phase = 'finished';
      order.forEach((id, i) => { cup.race.racers.find(racer => racer.id === id)!.progress.finishTime = 100 + i; });
      cup.recordFinish(cup.race);
      if (round === 0) {
        cup.race.player.progress.finishTime = 999;
        expect(cupPodium(cup, defaultSelection)[0]).toMatchObject({ id: 'player', finishTime: 100, points: 10 });
        expect(resultCue(cup.race, cup)).toBe('victory');
      }
      if (!cup.complete) cup.nextRound();
    }
    const before = JSON.stringify(cup), entries = cupPodium(cup, defaultSelection);
    expect(entries.map(entry => [entry.id, entry.points])).toEqual([['breeze', 27], ['player', 21], ['nova', 15]]);
    expect(entries.every(entry => entry.finishTime === null)).toBe(true);
    expect(resultCue(cup.race, cup)).toBe('finish'); expect(JSON.stringify(cup)).toBe(before);
  });
  it('celebrates a cup champion based on total points, not just who won the last race', () => {
    const cup = new CupSession(sunshineCup);
    for (let round = 0; round < sunshineCup.tracks.length; round++) {
      cup.race.phase = 'finished';
      const order = round < sunshineCup.tracks.length - 1 ? ['player', 'breeze', 'nova', 'moss'] : ['breeze', 'player', 'nova', 'moss'];
      order.forEach((id, i) => { cup.race.racers.find(racer => racer.id === id)!.progress.finishTime = 100 + i; });
      cup.recordFinish(cup.race); if (!cup.complete) cup.nextRound();
    }
    expect(resultCue(cup.race)).toBe('finish'); expect(resultCue(cup.race, cup)).toBe('cup-champion');
    expect(cupPodium(cup, defaultSelection)[0]).toMatchObject({ id: 'player', points: 10 * (sunshineCup.tracks.length - 1) + 7 });
  });
  it('presents a solo Time Trial and celebrates only eligible new records', () => {
    const race = new RaceSession(trackCatalog[0].track); race.start('time-trial');
    expect(racePodium(race, defaultSelection).map(entry => entry.id)).toEqual(['player']);
    expect(resultCue(race)).toBe('finish'); expect(resultBadge(race)).toBe('PRACTICE COMPLETE');
    race.trial.outcome = { eligible: true, first: true, newRace: true, newLap: true, previousRace: null, previousLap: null, record: null, storage: 'memory-only' };
    expect(resultCue(race)).toBe('personal-best'); expect(resultBadge(race)).toBe('FIRST BENCHMARK');
    race.trial.outcome = { ...race.trial.outcome, first: false, newRace: false };
    expect(resultBadge(race)).toBe('NEW LAP RECORD');
    race.trial.outcome = { ...race.trial.outcome, eligible: false, reason: 'recovery' };
    expect(resultCue(race)).toBe('finish'); expect(resultBadge(race)).toBe('PRACTICE COMPLETE');
    race.trial.outcome = { ...race.trial.outcome, eligible: true, newLap: false };
    expect(resultCue(race)).toBe('finish'); expect(resultBadge(race)).toBe('RUN COMPLETE');
  });
});
