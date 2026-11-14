import { expect } from 'vitest';
import { kartConfig, sceneConfig } from '../../config/kartConfig';
import type { KartState, SampledTrack } from '../../core/types';
import { nearestRoadPoint } from '../../tracks/trackSampling';

/** Independent envelope check: every disk along the longitudinal capsule fits inside the rails. */
export function expectInsideRails(track: SampledTrack, state: KartState, tolerance = 0.005): void {
  const halfSegment = kartConfig.collisionHalfLength - kartConfig.collisionHalfWidth;
  const railFace = track.definition.roadWidth / 2 + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2;
  for (let i = 0; i <= 8; i++) {
    const offset = (i / 4 - 1) * halfSegment;
    const point = { x: state.x + Math.sin(state.heading) * offset, z: state.z + Math.cos(state.heading) * offset };
    expect(nearestRoadPoint(track, point).distance + kartConfig.collisionHalfWidth).toBeLessThanOrEqual(railFace + tolerance);
  }
}
