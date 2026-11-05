import { describe, expect, it } from 'vitest';
import { kartConfig } from '../config/kartConfig';
import { createKart, stepKart } from '../core/simulation';
import { constrainKart } from '../kart/kartCollision';
import { wrapAngle } from '../kart/kartController';
import { sunshineCircuit as track } from '../tracks/sunshineCircuit';
import { nearestRoadPoint, offsetSample } from '../tracks/trackSampling';
import type { Vec2 } from '../core/types';

const safeWidth = track.definition.roadWidth / 2 - kartConfig.collisionRadius - kartConfig.collisionSkin;

describe('shared track geometry and constraints', () => {
  it('is a continuous, uniformly sampled closed loop with tangent-aligned spawn', () => {
    track.samples.forEach((sample, i) => {
      const next = track.samples[(i + 1) % track.samples.length];
      expect(Math.hypot(next.x - sample.x, next.z - sample.z)).toBeGreaterThan(1.4);
      expect(Math.hypot(next.x - sample.x, next.z - sample.z)).toBeLessThan(1.51);
      expect(Math.hypot(sample.tx, sample.tz)).toBeCloseTo(1);
    });
    expect(track.spawn.heading).toBeCloseTo(Math.atan2(track.samples[0].tx, track.samples[0].tz));
    expect(nearestRoadPoint(track, track.spawn).distance).toBe(0);
  });
  it('has no road-edge self-intersections or crossing edges', () => {
    const cross = (a: Vec2, b: Vec2, c: Vec2) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
    const edges = [-1, 1].map(side => track.samples.map(sample => offsetSample(sample, side * track.definition.roadWidth / 2)));
    const n = track.samples.length;
    for (let side = 0; side < 2; side++) for (let other = side; other < 2; other++) {
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (side === other && (j <= i + 1 || (i === 0 && j === n - 1))) continue;
        const a = edges[side][i]; const b = edges[side][(i + 1) % n];
        const c = edges[other][j]; const d = edges[other][(j + 1) % n];
        const intersects = cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
        if (intersects) throw new Error(`Road edge crossing at ${side}:${i}, ${other}:${j}`);
      }
    }
  });
  it('contains direct impacts on both sides around the entire road', () => {
    for (let i = 0; i < track.samples.length; i += 8) for (const side of [-1, 1]) {
      const sample = track.samples[i];
      const outside = offsetSample(sample, side * 6);
      const result = constrainKart({ ...createKart(track), ...outside, heading: Math.atan2(sample.tz * side, -sample.tx * side), forwardSpeed: 20 }, track);
      expect(nearestRoadPoint(track, result).distance).toBeLessThanOrEqual(safeWidth + 0.0001);
      expect(Math.abs(result.forwardSpeed)).toBeLessThan(20);
    }
  });
  it('does not tunnel at top speed and can back away after contact', () => {
    const sample = track.samples[0];
    let kart = { ...createKart(track), heading: Math.atan2(sample.tz, -sample.tx), forwardSpeed: 20 };
    for (let i = 0; i < 600; i++) {
      kart = stepKart(kart, { drift: false, throttle: 1, brake: 0, steer: 0 }, 1 / 60, track);
      expect(nearestRoadPoint(track, kart).distance).toBeLessThanOrEqual(safeWidth + 0.001);
    }
    const contact = { ...kart };
    for (let i = 0; i < 60; i++) kart = stepKart(kart, { drift: false, throttle: 0, brake: 1, steer: 0 }, 1 / 60, track);
    expect(Math.hypot(kart.x - contact.x, kart.z - contact.z)).toBeGreaterThan(0.5);
  });
  it('retains tangential velocity so shallow contacts slide along the edge', () => {
    const sample = track.samples[0];
    const result = constrainKart({ ...createKart(track), ...offsetSample(sample, 5), forwardSpeed: 15, lateralSpeed: 3 }, track);
    expect(result.forwardSpeed).toBeGreaterThan(10);
    expect(Math.abs(result.lateralSpeed)).toBeLessThan(0.1);
  });
  it.each([1, -1])('can traverse a full circuit in direction %i with ordinary normalized inputs', direction => {
    // Test-only steering fixture exercises the public player input API; no AI ships in the game.
    let kart = { ...createKart(track), heading: wrapAngle(track.spawn.heading + (direction < 0 ? Math.PI : 0)) };
    let traveled = 0;
    let road = nearestRoadPoint(track, kart);
    let maxDistance = 0;
    for (let tick = 0; tick < 7200 && traveled < track.length; tick++) {
      const target = track.samples[(road.index + direction * 8 + track.samples.length) % track.samples.length];
      const error = wrapAngle(Math.atan2(target.x - kart.x, target.z - kart.z) - kart.heading);
      kart = stepKart(kart, { drift: false, throttle: kart.forwardSpeed < 15 ? 1 : 0, brake: 0, steer: Math.max(-1, Math.min(1, -error * 1.3)) }, 1 / 60, track);
      const nextRoad = nearestRoadPoint(track, kart);
      let delta = nextRoad.progress - road.progress;
      if (delta > track.length / 2) delta -= track.length;
      if (delta < -track.length / 2) delta += track.length;
      traveled += delta * direction;
      road = nextRoad;
      maxDistance = Math.max(maxDistance, road.distance);
    }
    expect(traveled).toBeGreaterThanOrEqual(track.length);
    expect(maxDistance).toBeLessThanOrEqual(safeWidth + 0.001);
  }, 15000);
});
