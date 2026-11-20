import { describe, expect, it } from 'vitest';
import { createAIDriverState, waypointInput } from '../ai/waypointController';
import { planTraffic } from '../ai/trafficPlanner';
import { plannedSpeed, racingLane, roadCurvature } from '../ai/racingLine';
import { aiConfig, aiSkills } from '../config/aiConfig';
import { kartConfig } from '../config/kartConfig';
import { defaultRaceOptions, difficultyDefinition } from '../config/raceOptions';
import { createKart, Simulation } from '../core/simulation';
import { NEUTRAL_INPUT, type KartState } from '../core/types';
import { RaceSession } from '../race/RaceSession';
import { pointAtDistance } from '../race/trackProgress';
import { sunshineCircuit as track } from '../tracks/sunshineCircuit';
import { sugarRushValley } from '../tracks/sugarRushValley';
import { offsetSample } from '../tracks/trackSampling';

function at(distance = 40, lane = 0, speed = 18): KartState {
  const point = pointAtDistance(track, distance);
  return { ...createKart(track), ...offsetSample(point, lane), heading: Math.atan2(point.tx, point.tz), forwardSpeed: speed };
}
function relative(state: KartState, ahead: number, sideways = 0, speed = 10): KartState {
  return { ...state, x: state.x + Math.sin(state.heading) * ahead + Math.cos(state.heading) * sideways,
    z: state.z + Math.cos(state.heading) * ahead - Math.sin(state.heading) * sideways, forwardSpeed: speed };
}

describe('fair competitive AI racecraft', () => {
  it('plans a real braking envelope, with later Hard braking and no change to the kart limits', () => {
    const corner = sugarRushValley.samples.reduce((a, b) => Math.abs(roadCurvature(sugarRushValley, a.distance)) > Math.abs(roadCurvature(sugarRushValley, b.distance)) ? a : b);
    const limits = Object.values(aiSkills).map(skill => plannedSpeed(sugarRushValley, corner.distance, 20, skill.cornerMargin, skill.braking));
    expect(limits[0]).toBeLessThan(limits[1]); expect(limits[1]).toBeLessThanOrEqual(limits[2]);
    expect(limits[2]).toBeLessThanOrEqual(kartConfig.maxForwardSpeed);
    const race = new RaceSession(track, { laps: 3, difficulty: 'hard' });
    for (const bot of race.opponents) expect(bot.profile!.targetSpeed).toBeLessThanOrEqual(kartConfig.maxForwardSpeed);
  });
  it('generates a bounded continuous racing line across the start/finish seam', () => {
    expect(racingLane(track, 0)).toBeCloseTo(racingLane(track, track.length), 10);
    for (let d = 0; d < track.length; d += 2) {
      expect(Math.abs(racingLane(track, d))).toBeLessThanOrEqual(aiConfig.lineLimit);
      expect(Math.abs(racingLane(track, d + 0.1) - racingLane(track, d))).toBeLessThan(0.05);
    }
  });
  it('commits to a clear side when overtaking a slower center-lane racer', () => {
    const state = at(), brain = createAIDriverState();
    const traffic = [{ id: 'player', state: relative(state, 13) }];
    planTraffic(state, track, 'nova', traffic, brain, 0, 0, 'hard', 1 / 60);
    expect(brain.maneuver).toBe('pass'); expect(Math.abs(brain.targetLane)).toBe(aiConfig.laneLimit);
    const side = brain.targetLane;
    planTraffic(state, track, 'nova', [{ id: 'player', state: relative(state, 12.5, 0.05) }], brain, -side, 0, 'hard', 0.1);
    expect(brain.targetLane).toBe(side); expect(brain.commitment).toBeGreaterThan(0);
  });
  it('brakes behind a blocked pack instead of steering through occupied lanes', () => {
    const state = at(), brain = createAIDriverState();
    const traffic = [{ id: 'front', state: relative(state, 6, 0, 0) },
      { id: 'left', state: relative(state, 0, -aiConfig.laneLimit) }, { id: 'right', state: relative(state, 0, aiConfig.laneLimit) }];
    const controls = waypointInput(state, track, { id: 'nova', lane: 0, targetSpeed: 20 }, traffic, 0, { brain, difficulty: 'hard', dt: 1 / 60 });
    expect(controls.throttle).toBe(0); expect(controls.brake).toBeGreaterThan(0.5); expect(brain.lane).toBe(0);
  });
  it('checks the entire lane-change path, including a racer alongside between two clear endpoints', () => {
    const state = at(40, -aiConfig.laneLimit), brain = createAIDriverState(-aiConfig.laneLimit);
    brain.targetLane = aiConfig.laneLimit; brain.maneuver = 'pass'; brain.commitment = 1;
    planTraffic(state, track, 'nova', [{ id: 'player', state: at(40) }], brain, 0, 0, 'hard', 1 / 60);
    expect(brain.lane).toBe(-aiConfig.laneLimit);
  });
  it('makes one defensive move against a closing rear racer, without weaving or blocking alongside', () => {
    const state = at(), brain = createAIDriverState();
    const rear = [{ id: 'player', state: relative(state, -9, 0, 22) }];
    planTraffic(state, track, 'nova', rear, brain, 0, 0.02, 'hard', 1 / 60);
    expect(brain.maneuver).toBe('defend'); const chosen = brain.targetLane;
    planTraffic(state, track, 'nova', rear, brain, 0, -0.02, 'hard', 0.1);
    expect(brain.targetLane).toBe(chosen); expect(brain.defendCooldown).toBeGreaterThan(0);
    const beside = createAIDriverState();
    planTraffic(state, track, 'nova', [{ id: 'player', state: relative(state, -2, 2.8, 22) }], beside, 0, 0.02, 'hard', 1 / 60);
    expect(beside.maneuver).toBe('line');
  });
  it('can move away after being squeezed, rather than deadlocking both adjacent racers', () => {
    const state = at(40, 1), brain = createAIDriverState(1);
    brain.targetLane = aiConfig.laneLimit; brain.commitment = 1; brain.maneuver = 'pass';
    planTraffic(state, track, 'nova', [{ id: 'player', state: at(40, -1.5) }], brain, 0, 0, 'hard', 1 / 60);
    expect(brain.lane).toBeGreaterThan(1);
  });
  it('never changes decisions based on an arbitrary lead/deficit', () => {
    const state = at();
    const controls = [-10000, 0, 10000].map(gap => waypointInput(state, track, { id: 'nova', lane: 0, targetSpeed: 20 }, [], gap,
      { brain: createAIDriverState(), difficulty: 'hard', dt: 1 / 60 }));
    expect(controls[0]).toEqual(controls[1]); expect(controls[1]).toEqual(controls[2]);
  });
  it('uses exactly the ordinary simulation step for AI, without applying hidden speed or movement grants', () => {
    const race = new RaceSession(track); race.start('quick-race'); race.phase = 'racing'; race.items.reset(false, race.racers);
    const bot = race.opponents[0], state = at(100, 0, 16);
    bot.simulation.current = { ...state }; bot.simulation.previous = { ...state }; bot.ai = createAIDriverState();
    for (const other of race.opponents.slice(1)) other.progress.finishTime = 1;
    const controls = waypointInput(state, track, bot.profile!, [{ id: 'player', state: race.player.simulation.current }, { id: bot.id, state }], 0,
      { brain: createAIDriverState(), difficulty: 'normal', dt: 1 / 60 });
    const ordinary = new Simulation(track); ordinary.current = { ...state }; ordinary.step(1 / 60, controls);
    race.advance(1 / 60, NEUTRAL_INPUT, true);
    expect(bot.simulation.current).toEqual(ordinary.current);
  });
  it('resets independent decision memory on restart/recovery and freezes it while paused', () => {
    const race = new RaceSession(track); race.start('quick-race');
    expect(new Set(race.opponents.map(bot => bot.ai)).size).toBe(3);
    const bot = race.opponents[0]; bot.ai!.commitment = 1;
    race.pause(); race.advance(1, NEUTRAL_INPUT, false); expect(bot.ai!.commitment).toBe(1);
    race.recover(bot); expect(bot.ai).toEqual(createAIDriverState());
    bot.ai!.commitment = 1; race.start('quick-race'); expect(bot.ai!.commitment).toBe(0);
  });
  it('keeps saved normal IDs compatible while presenting Easy / Medium / Hard', () => {
    expect(defaultRaceOptions.difficulty).toBe('normal'); expect(difficultyDefinition('normal').name).toBe('Medium');
  });
});
