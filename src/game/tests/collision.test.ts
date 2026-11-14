import { describe, expect, it } from 'vitest';
import { kartConfig, sceneConfig } from '../config/kartConfig';
import { createKart, stepKart } from '../core/simulation';
import type { KartState, SampledTrack } from '../core/types';
import { constrainKart } from '../kart/kartCollision';
import { kartContact } from '../kart/kartFootprint';
import { resolveRacerContacts } from '../race/racerCollision';
import { trackCatalog } from '../tracks/trackCatalog';
import { offsetSample } from '../tracks/trackSampling';
import { expectInsideRails } from './helpers/roadBounds';

const straight: SampledTrack = {
  definition: { id: 'collision-fixture', name: 'Straight fixture', roadWidth: 11, closed: true, points: [] },
  length: 400, spawn: { x: 0, z: 20, heading: 0 },
  samples: [{ x: 0, z: 0, tx: 0, tz: 1, distance: 0 }, { x: 0, z: 100, tx: 1, tz: 0, distance: 100 },
    { x: 100, z: 100, tx: 0, tz: -1, distance: 200 }, { x: 100, z: 0, tx: -1, tz: 0, distance: 300 }],
};
const railFace = straight.definition.roadWidth / 2 + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2;
const sideLimit = railFace - kartConfig.collisionHalfWidth - kartConfig.collisionSkin;

describe('visible rail clearance and non-sticky contacts', () => {
  it.each([-1, 1])('does not collide, drain speed or cancel turbo in the clear beside rail %i', side => {
    const state = { ...createKart(straight), x: side * 4.2, forwardSpeed: 20, boostRemaining: 0.5, boostTier: 1 as const };
    expect(constrainKart(state, straight)).toBe(state);
    const next = stepKart(state, { throttle: 1, brake: 0, steer: 0, drift: false }, 1 / 60, straight);
    expect(next.forwardSpeed).toBeGreaterThanOrEqual(20); expect(next.boostRemaining).toBeGreaterThan(0.4);
    expectInsideRails(straight, next);
  });
  it.each([-1, 1])('slides along rail %i for two seconds without exponential speed loss', side => {
    let state = { ...createKart(straight), x: side * sideLimit, heading: side * Math.PI / 180, forwardSpeed: 18 };
    for (let tick = 0; tick < 120; tick++) {
      state = stepKart(state, { throttle: 1, brake: 0, steer: 0, drift: false }, 1 / 60, straight);
      expectInsideRails(straight, state);
    }
    expect(state.forwardSpeed).toBeGreaterThan(17); expect(state.z).toBeGreaterThan(54);
  });
  it('removes only outward velocity; repeated position correction preserves parallel travel', () => {
    let state = { ...createKart(straight), x: sideLimit + 0.03, forwardSpeed: 15, lateralSpeed: 2 };
    state = constrainKart(state, straight);
    expect(state.forwardSpeed).toBeCloseTo(15); expect(state.lateralSpeed).toBeCloseTo(0);
    for (let tick = 0; tick < 120; tick++) state = constrainKart({ ...state, x: sideLimit + 0.0001 }, straight);
    expect(state.forwardSpeed).toBeCloseTo(15);
  });
  it('blocks boosted head-on travel and permits reverse recovery after impact', () => {
    let state: KartState = { ...createKart(straight), x: 3.7, heading: Math.PI / 2, forwardSpeed: 28, boostRemaining: 1, boostTier: 3 as const };
    for (let tick = 0; tick < 60; tick++) state = stepKart(state, { throttle: 1, brake: 0, steer: 0, drift: false }, 1 / 60, straight);
    expectInsideRails(straight, state); expect(state.forwardSpeed).toBeCloseTo(0); expect(state.boostRemaining).toBe(0);
    const impactX = state.x;
    for (let tick = 0; tick < 60; tick++) state = stepKart(state, { throttle: 0, brake: 1, steer: 0, drift: false }, 1 / 60, straight);
    expect(state.x).toBeLessThan(impactX - 1);
  });
  it.each(trackCatalog)('$name: the complete capsule stays inside both rails across headings and bends', ({ track }) => {
    for (let i = 0; i < track.samples.length; i += 5) for (const side of [-1, 1]) for (const angle of [0, Math.PI / 6, Math.PI / 2]) {
      const sample = track.samples[i];
      const state = { ...createKart(track), ...offsetSample(sample, side * 6), heading: Math.atan2(sample.tx, sample.tz) + angle, forwardSpeed: 20 };
      expectInsideRails(track, constrainKart(state, track));
    }
  // Exhaustive sampled-shape checks share workers with full multi-course races.
  }, 15000);
});

describe('kart-shaped opponent contacts', () => {
  it('allows a close overtake with a real side gap, without invisible braking', () => {
    const a = { ...createKart(straight), x: -1.25, forwardSpeed: 20 };
    const b = { ...createKart(straight), x: 1.25, z: a.z + 0.8, forwardSpeed: 10 };
    expect(kartContact(a, b)).toBeNull();
    const states = [a, b]; resolveRacerContacts(states, straight);
    expect(states).toEqual([a, b]);
  });
  it('separates touching sides without killing either kart’s forward speed', () => {
    const a = { ...createKart(straight), x: -1.15, forwardSpeed: 15, lateralSpeed: 0.4 };
    const b = { ...createKart(straight), x: 1.15, forwardSpeed: 15 };
    const states = [a, b]; resolveRacerContacts(states, straight);
    expect(kartContact(states[0], states[1])).toBeNull();
    for (const state of states) expect(state.forwardSpeed).toBeCloseTo(15);
  });
  it('still resolves rear-end hits, loses closing speed and cancels boost on a real impact', () => {
    const a = { ...createKart(straight), forwardSpeed: 20, boostTier: 1 as const, boostRemaining: 0.5 };
    const b = { ...createKart(straight), z: a.z + 2.7, forwardSpeed: 5 };
    const states = [a, b]; resolveRacerContacts(states, straight);
    expect(kartContact(states[0], states[1])).toBeNull(); expect(states[0].forwardSpeed).toBeLessThan(20);
    expect(states[1].forwardSpeed).toBeGreaterThan(5); expect(states[0].boostRemaining).toBe(0);
  });
  it.each([0, 0.6, 1.5, 2.8])('handles rotated/parallel capsules at heading %f and remains symmetric', heading => {
    const a = { x: 0, z: 0, heading }, b = { x: Math.cos(heading) * 2.3, z: -Math.sin(heading) * 2.3, heading };
    const ab = kartContact(a, b)!, ba = kartContact(b, a)!;
    expect(ab.depth).toBeCloseTo(0.1); expect(ab.depth).toBeCloseTo(ba.depth);
    expect(ab.nx).toBeCloseTo(-ba.nx); expect(ab.nz).toBeCloseTo(-ba.nz);
  });
  it('resolves crossing headings without ghost contacts or non-finite impulses', () => {
    const a = { ...createKart(straight), heading: 0, forwardSpeed: 10 };
    const b = { ...createKart(straight), x: 1.8, z: a.z + 0.3, heading: Math.PI / 2, forwardSpeed: 8 };
    const states = [a, b]; resolveRacerContacts(states, straight);
    expect(kartContact(states[0], states[1])).toBeNull();
    for (const state of states) { expect(Number.isFinite(state.forwardSpeed + state.lateralSpeed)).toBe(true); expectInsideRails(straight, state); }
  });
  it('safely separates coincident karts without NaN or escaped wall constraints', () => {
    const states = [createKart(straight), createKart(straight)]; resolveRacerContacts(states, straight);
    expect(kartContact(states[0], states[1])).toBeNull();
    for (const state of states) { expect(Number.isFinite(state.x + state.z + state.forwardSpeed)).toBe(true); expectInsideRails(straight, state); }
  });
});
