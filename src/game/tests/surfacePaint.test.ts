import { Vector3, type BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { sceneConfig } from '../config/kartConfig';
import { makeFeaturePaint } from '../render/featurePaint';
import { makeRoadDashes, roadDashLayout, roadPaintPoint, SurfacePaint } from '../render/surfacePaint';
import { sunshineCircuit as track } from '../tracks/sunshineCircuit';
import { roadHeight } from '../tracks/trackSurface';
import { nearestRoadPoint, offsetSample } from '../tracks/trackSampling';

function expectUpward(geometry: BufferGeometry) {
  const positions = geometry.getAttribute('position'), indices = geometry.index!;
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  for (let i = 0; i < indices.count; i += 3) {
    a.fromBufferAttribute(positions, indices.getX(i)); b.fromBufferAttribute(positions, indices.getX(i + 1)); c.fromBufferAttribute(positions, indices.getX(i + 2));
    const normal = b.sub(a).cross(c.sub(a));
    expect(normal.y).toBeGreaterThan(0);
  }
}

describe('road-following Sunshine paint', () => {
  it('matches the actual ribbon edges and heights at samples, bends and the closed seam', () => {
    for (const sample of track.samples) for (const offset of [-4.8, 0, 4.8]) {
      const point = roadPaintPoint(track, sample.distance, offset), expected = offsetSample(sample, offset);
      expect(point[0]).toBeCloseTo(expected.x, 5); expect(point[2]).toBeCloseTo(expected.z, 5);
      expect(point[1]).toBeCloseTo(roadHeight(track, sample.distance) + sceneConfig.roadY + 0.014, 5);
    }
    expect(roadPaintPoint(track, track.length, 2)).toEqual(roadPaintPoint(track, 0, 2));
    expect(roadPaintPoint(track, -1, 2)).toEqual(roadPaintPoint(track, track.length - 1, 2));
  });
  it('follows the rendered incline between vertices rather than projecting flat decals over the jump', () => {
    const start = track.definition.rises![0].start * track.length;
    for (let distance = start; distance < start + 38; distance += 0.41) {
      const scaled = distance / track.length * track.samples.length, index = Math.floor(scaled), t = scaled - index;
      const a = track.samples[index], b = track.samples[index + 1];
      const expected = roadHeight(track, a.distance) * (1 - t) + roadHeight(track, b.distance) * t + sceneConfig.roadY;
      for (const offset of [-4, 0, 4]) expect(roadPaintPoint(track, distance, offset)[1] - expected).toBeCloseTo(0.014, 6);
    }
  });
  it('aligns every dash segment along the centerline in every heading, without mirrored rotations', () => {
    for (const dash of roadDashLayout(track)) {
      const geometry = new SurfacePaint(track).strip(dash.distance, dash.length, -0.085, 0.085).build();
      const p = geometry.getAttribute('position');
      for (let i = 0; i < p.count; i += 4) {
        const from = new Vector3().fromBufferAttribute(p, i).add(new Vector3().fromBufferAttribute(p, i + 1)).multiplyScalar(0.5);
        const to = new Vector3().fromBufferAttribute(p, i + 2).add(new Vector3().fromBufferAttribute(p, i + 3)).multiplyScalar(0.5);
        const road = nearestRoadPoint(track, from), direction = to.sub(from).normalize();
        expect(direction.x * road.tx + direction.z * road.tz).toBeGreaterThan(0.99);
        expect(road.distance).toBeLessThan(0.001);
      }
      expectUpward(geometry); geometry.dispose();
    }
  });
  it('leaves clean gaps at activation pads, the ramp approach and start line', () => {
    const dashes = roadDashLayout(track);
    expect(dashes.length).toBeGreaterThan(50);
    for (const feature of track.definition.features!) for (const dash of dashes) {
      const gate = feature.fraction * track.length, start = feature.kind === 'jump' ? gate - 14 : gate - 1;
      expect(dash.distance + dash.length <= start || dash.distance >= gate + feature.length + 1).toBe(true);
    }
  });
  it('batches all center markings into one bounded, opaque-ready geometry', () => {
    const geometry = makeRoadDashes(track);
    expect(geometry.getAttribute('position').count).toBeLessThan(3000); expectUpward(geometry); geometry.dispose();
  });
  it.each(track.definition.features!)('$id: points chevrons forward and puts the activation stripe on the real trigger', feature => {
    const paint = makeFeaturePaint(track, feature), gate = feature.fraction * track.length;
    const half = Math.min(feature.width / 2, track.definition.roadWidth / 2 - 0.65);
    const entry = paint.entry.getAttribute('position'), expected = roadPaintPoint(track, gate, -half, 0.03);
    expect(entry.getX(0)).toBeCloseTo(expected[0], 5); expect(entry.getY(0)).toBeCloseTo(expected[1], 5); expect(entry.getZ(0)).toBeCloseTo(expected[2], 5);
    const arrows = paint.arrows.getAttribute('position');
    let nose = -Infinity, wing = -Infinity;
    for (let i = 0; i < arrows.count; i++) {
      const road = nearestRoadPoint(track, { x: arrows.getX(i), z: arrows.getZ(i) });
      if (road.distance < 0.05) nose = Math.max(nose, road.progress);
      if (road.distance > feature.width * 0.25) wing = Math.max(wing, road.progress);
      expect(road.distance).toBeLessThan(feature.width / 2 + 0.01);
    }
    expect(nose).toBeGreaterThan(wing + 0.35);
    for (const geometry of Object.values(paint)) {
      const vertices = geometry.getAttribute('position');
      for (let i = 0; i < vertices.count; i++) expect(nearestRoadPoint(track, { x: vertices.getX(i), z: vertices.getZ(i) }).distance).toBeLessThan(track.definition.roadWidth / 2 - 0.6);
      expectUpward(geometry); geometry.dispose();
    }
  });
});
