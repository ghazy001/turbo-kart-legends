import { kartConfig, sceneConfig } from '../config/kartConfig';
import type { KartState, SampledTrack } from '../core/types';
import { footprintSupport } from './kartFootprint';
import { nearestRoadPoint } from '../tracks/trackSampling';

/** Resolve against the visible rail face, preserving tangential velocity during scrapes. */
export function constrainKart(state: KartState, track: SampledTrack): KartState {
  const road = nearestRoadPoint(track, state);
  if (road.distance < 1e-8) return state;
  const nx = (state.x - road.x) / road.distance;
  const nz = (state.z - road.z) / road.distance;
  const railFace = track.definition.roadWidth / 2 + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2;
  const limit = railFace - footprintSupport(state.heading, nx, nz) - kartConfig.collisionSkin;
  if (road.distance <= limit) return state;
  const sin = Math.sin(state.heading);
  const cos = Math.cos(state.heading);
  let vx = sin * state.forwardSpeed + cos * state.lateralSpeed;
  let vz = cos * state.forwardSpeed - sin * state.lateralSpeed;
  const outward = vx * nx + vz * nz;
  if (outward > 0) {
    vx = vx - outward * nx;
    vz = vz - outward * nz;
  }
  return {
    ...state, x: road.x + nx * limit, z: road.z + nz * limit,
    forwardSpeed: vx * sin + vz * cos, lateralSpeed: vx * cos - vz * sin,
  };
}
