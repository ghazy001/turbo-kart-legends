import { ItemSystem } from '../items/ItemSystem';
import { describe, expect, it } from 'vitest';
import { createKart, Simulation, stepKart } from '../core/simulation';
import { NEUTRAL_INPUT, type KartState } from '../core/types';
import { constrainKart } from '../kart/kartCollision';
import { pointAtDistance } from '../race/trackProgress';
import { makeBand } from '../render/TrackVisual';
import { sunshineCircuit as track } from '../tracks/sunshineCircuit';
import { trackCatalog } from '../tracks/trackCatalog';
import { nearestRoadPoint, offsetSample } from '../tracks/trackSampling';
import { applyTrackFeatures, crossedFeature, roadHeight, surfaceHeightAt } from '../tracks/trackSurface';
import { sunshineScenery } from '../tracks/sunshineScenery';
import { trialRules } from '../timeTrial/trialRules';
import { expectInsideRails } from './helpers/roadBounds';

const features = track.definition.features!;
const pad = features.find(feature => feature.kind === 'turbo')!;
const ramp = features.find(feature => feature.kind === 'jump')!;
const driving = { ...NEUTRAL_INPUT, throttle: 1 };
function at(distance: number, speed = 18, lane = 0): KartState {
  const p = pointAtDistance(track, distance);
  const position = offsetSample(p, lane);
  return { ...createKart(track), ...position, heading: Math.atan2(p.tx, p.tz), y: surfaceHeightAt(track, position), forwardSpeed: speed };
}
const crossing = (feature = pad, lane = 0) => [at(feature.fraction * track.length - 0.15, 18, lane), at(feature.fraction * track.length + 0.15, 18, lane)] as const;

describe('Sunshine coastal track features', () => {
  it('shares the continuous raised road between geometry, ground queries and recovery', () => {
    const rise = track.definition.rises![0], crest = rise.start * track.length + rise.length * rise.crest;
    expect(roadHeight(track, crest)).toBeCloseTo(rise.height);
    expect(roadHeight(track, rise.start * track.length)).toBe(0);
    expect(roadHeight(track, rise.start * track.length + rise.length)).toBeCloseTo(0);
    expect(roadHeight(track, -0.001)).toBeCloseTo(roadHeight(track, track.length - 0.001));
    const geometry = makeBand(track, -5.5, 5.5, 0.035), vertices = geometry.getAttribute('position');
    for (let i = 0; i < track.samples.length; i++) expect(vertices.getY(i * 4)).toBeCloseTo(roadHeight(track, track.samples[i].distance) + 0.035, 5);
    geometry.dispose();
    const simulation = new Simulation(track); simulation.reset(at(crest));
    expect(simulation.current.y).toBeCloseTo(rise.height, 2); expect(simulation.pose.y).toBe(simulation.current.y);
    expect(simulation.current.forwardSpeed).toBe(0); expect(simulation.current.verticalSpeed).toBe(0);
  });
  it('activates both turbo pads with an immediate capped kick and the normal boost state', () => {
    for (const feature of features.filter(f => f.kind === 'turbo')) {
      const [before, after] = crossing(feature), next = applyTrackFeatures(track, before, after, driving);
      expect(next.boostTier).toBe(2); expect(next.boostRemaining).toBe(feature.strength); expect(next.boostSerial).toBe(1);
      expect(next.forwardSpeed).toBe(after.forwardSpeed + 4); expect(next.x).toBe(after.x);
    }
  });
  it('does not retrigger on overlap, reverse crossing, braking, teleport, outside lane or above a pad', () => {
    const [before, after] = crossing();
    expect(crossedFeature(track, pad, after, after)).toBe(false);
    expect(crossedFeature(track, pad, after, before)).toBe(false);
    expect(crossedFeature(track, pad, at(pad.fraction * track.length - 4), after)).toBe(false);
    expect(applyTrackFeatures(track, before, after, { ...driving, brake: 1 })).toBe(after);
    const wide = crossing(pad, 4.5); expect(applyTrackFeatures(track, ...wide, driving)).toBe(wide[1]);
    expect(applyTrackFeatures(track, { ...before, y: 2 }, { ...after, y: 2 }, driving).boostRemaining).toBe(0);
    expect(applyTrackFeatures(track, before, { ...after, forwardSpeed: 0 }, driving).boostRemaining).toBe(0);
  });
  it('cannot stack pads onto active boosts or weaken a Flare', () => {
    const [before, after] = crossing(), boosted = { ...after, boostTier: 3 as const, boostRemaining: 1.4, boostSerial: 3 };
    expect(applyTrackFeatures(track, before, boosted, driving)).toBe(boosted);
  });
  it('launches only grounded forward racers at the crest, retaining airborne launch gating', () => {
    const [before, after] = crossing(ramp), next = applyTrackFeatures(track, before, after, driving);
    expect(next.verticalSpeed).toBe(ramp.strength); expect(next.jumpSerial).toBe(1);
    expect(applyTrackFeatures(track, { ...before, verticalSpeed: 3 }, after, driving)).toBe(after);
    expect(applyTrackFeatures(track, before, { ...after, forwardSpeed: 4 }, driving)).toEqual({ ...after, forwardSpeed: 4 });
  });
  it('drives uphill, jumps, lands and continues without sinking, leaving the road or repeated landing events', () => {
    const start = track.definition.rises![0].start * track.length;
    let state = at(start - 2), jumps = 0, maximumClearance = 0;
    for (let i = 0; i < 240; i++) {
      const road = nearestRoadPoint(track, state), target = pointAtDistance(track, road.progress + 10);
      const error = Math.atan2(Math.sin(Math.atan2(target.x - state.x, target.z - state.z) - state.heading), Math.cos(Math.atan2(target.x - state.x, target.z - state.z) - state.heading));
      state = stepKart(state, { ...driving, steer: Math.max(-1, Math.min(1, -error * 1.3)) }, 1 / 60, track);
      const clearance = state.y - surfaceHeightAt(track, state);
      maximumClearance = Math.max(maximumClearance, clearance); jumps = state.jumpSerial;
      expect(clearance).toBeGreaterThanOrEqual(-0.001);
      if (i % 30 === 0) expectInsideRails(track, state);
    }
    expect(jumps).toBe(1); expect(state.landingSerial).toBe(1);
    expect(maximumClearance).toBeGreaterThan(0.8); expect(state.verticalSpeed).toBe(0); expect(state.y).toBe(0);
    expect(state.forwardSpeed).toBeGreaterThan(15);
  });
  it('retains solid airborne/boosted rails and allows slow/reverse travel over the roller', () => {
    const crest = ramp.fraction * track.length, p = pointAtDistance(track, crest);
    const hit = constrainKart({ ...at(crest), ...offsetSample(p, 7), y: 4, boostRemaining: 1, boostTier: 2 }, track);
    expectInsideRails(track, hit);
    let state = at(crest + 2, -4);
    for (let i = 0; i < 60; i++) state = stepKart(state, { ...NEUTRAL_INPUT, brake: 1 }, 1 / 60, track);
    expect(state.jumpSerial).toBe(0); expect(state.y).toBeCloseTo(surfaceHeightAt(track, state), 5);
  });
  it('ignores retired drift requests on elevated asphalt without adding manual hops', () => {
    const crest = ramp.fraction * track.length, state = at(crest - 5);
    const next = stepKart(state, { ...driving, drift: true, steer: 0.5 }, 1 / 60, track);
    expect(next.driftDirection).toBe(0); expect(next.verticalSpeed).toBe(0); expect(next.jumpSerial).toBe(0);
  });
  it('keeps ramp flight and boost activation identical across 30, 60 and 144 render FPS', () => {
    const run = (fps: number, fraction: number) => {
      const simulation = new Simulation(track); simulation.reset(at(fraction * track.length - 0.2));
      simulation.current.forwardSpeed = 18;
      for (let i = 0; i < fps; i++) simulation.advance(1 / fps, driving, true);
      return simulation.current;
    };
    for (const feature of [pad, ramp]) {
      const expected = run(60, feature.fraction);
      for (const fps of [30, 144]) expect(run(fps, feature.fraction)).toEqual(expected);
      if (feature.kind === 'jump') expect(expected.jumpSerial).toBe(1);
      else expect(expected.boostSerial).toBe(1);
    }
  });
  it('drops and hits a banana on elevated asphalt, while airborne racers clear it', () => {
    for (const airborne of [false, true]) {
      const racers = ['player', 'target'].map(id => ({ id, simulation: new Simulation(track), progress: { finishTime: null } }));
      const items = new ItemSystem(track, { rewardPicker: () => 'banana-trap' }); items.reset(true, racers);
      const pickup = items.pickups[1]; racers[0].simulation.reset({ ...pickup, heading: 0 });
      items.step(1 / 60, racers, new Map()); expect(items.slot('player')?.held).toBe('banana-trap');
      racers[0].simulation.reset(at(ramp.fraction * track.length));
      items.step(1 / 60, racers, new Map([['player', { ...NEUTRAL_INPUT, useItem: true }]]));
      expect(items.traps).toHaveLength(1); const trap = items.traps[0]; expect(trap.ground).toBeGreaterThan(1);
      racers[1].simulation.reset({ ...trap, heading: 0 });
      if (airborne) { racers[1].simulation.current.y += 1; racers[1].simulation.previous.y += 1; }
      for (let i = 0; i < 45; i++) items.step(1 / 60, racers, new Map());
      expect(items.stats.hits).toBe(airborne ? 0 : 1);
    }
  });
  it('never applies these features or elevations to the other three courses', () => {
    for (const entry of trackCatalog.slice(1)) {
      expect(entry.track.definition.features).toBeUndefined(); expect(entry.track.definition.rises).toBeUndefined();
      expect(roadHeight(entry.track, 200)).toBe(0);
      const state = createKart(entry.track); expect(applyTrackFeatures(entry.track, state, state, driving)).toBe(state);
    }
  });
  it('invalidates only the changed track’s old time-trial compatibility fingerprint', () => {
    const oldSurface = { ...track, definition: { ...track.definition, features: undefined, rises: undefined } };
    expect(trialRules(track, 3)).not.toBe(trialRules(oldSurface, 3));
  });
  it('batches a bounded amount of coast scenery outside the drivable corridor', () => {
    const layout = sunshineScenery(track);
    expect(layout.boxes.length).toBeGreaterThan(100); expect(layout.foliage.length).toBeLessThan(900);
    for (const group of [layout.boxes, layout.trunks, layout.rocks]) for (const instance of group) {
      expect(nearestRoadPoint(track, { x: instance.position[0], z: instance.position[2] }).distance).toBeGreaterThan(6);
    }
  });
});
