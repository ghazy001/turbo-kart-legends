import { kartConfig } from '../config/kartConfig';
import type { KartState, SampledTrack } from '../core/types';
import { nearestRoadPoint } from '../tracks/trackSampling';

/** One circle contains the kart silhouette. Project penetration and remove outward velocity. */
export function constrainKart(state: KartState, track: SampledTrack): KartState {
  const road = nearestRoadPoint(track, state);
  const limit = track.definition.roadWidth / 2 - kartConfig.collisionRadius - kartConfig.collisionSkin;
  if (road.distance <= limit) return state;
  const nx = (state.x - road.x) / road.distance;
  const nz = (state.z - road.z) / road.distance;
  const sin = Math.sin(state.heading);
  const cos = Math.cos(state.heading);
  let vx = sin * state.forwardSpeed + cos * state.lateralSpeed;
  let vz = cos * state.forwardSpeed - sin * state.lateralSpeed;
  const outward = vx * nx + vz * nz;
  if (outward > 0) {
    vx = (vx - outward * nx) * kartConfig.impactRetention;
    vz = (vz - outward * nz) * kartConfig.impactRetention;
  }
  return {
    ...state, x: road.x + nx * limit, z: road.z + nz * limit,
    forwardSpeed: vx * sin + vz * cos, lateralSpeed: vx * cos - vz * sin,
  };
}
