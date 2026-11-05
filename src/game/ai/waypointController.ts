import { raceConfig } from '../config/raceConfig';
import type { KartInput, KartState, SampledTrack } from '../core/types';
import { wrapAngle } from '../kart/kartController';
import { nearestRoadPoint, offsetSample } from '../tracks/trackSampling';
import { pointAtDistance } from '../race/trackProgress';

export interface AITraffic { id: string; state: KartState }

/** Deterministic pursuit and local traffic avoidance. Outputs the human input shape. */
export function waypointInput(state: KartState, track: SampledTrack, profile: { id: string; targetSpeed: number; lane: number },
  traffic: readonly AITraffic[], gapToPlayer = 0): KartInput {
  const road = nearestRoadPoint(track, state);
  const lookAhead = 7 + Math.max(0, state.forwardSpeed) * 0.45;
  const targetRoad = pointAtDistance(track, road.progress + lookAhead);
  const futureRoad = pointAtDistance(track, road.progress + 35);
  const bend = Math.abs(wrapAngle(Math.atan2(futureRoad.tx, futureRoad.tz) - Math.atan2(road.tx, road.tz)));
  let lane = profile.lane;
  let followingSpeed = Infinity;
  for (const other of traffic) {
    if (other.id === profile.id) continue;
    const dx = other.state.x - state.x; const dz = other.state.z - state.z;
    const ahead = dx * road.tx + dz * road.tz;
    const sideways = dx * road.tz - dz * road.tx;
    if (ahead > 0 && ahead < 18 && Math.abs(sideways) < 3.3) {
      const otherLane = (other.state.x - road.x) * road.tz - (other.state.z - road.z) * road.tx;
      lane = otherLane >= 0 ? -1.9 : 1.9;
      if (ahead < 7) followingSpeed = Math.max(3, other.state.forwardSpeed - 1);
    }
  }
  const target = offsetSample(targetRoad, lane);
  const error = wrapAngle(Math.atan2(target.x - state.x, target.z - state.z) - state.heading);
  const catchUp = Math.max(-raceConfig.maxSlowdownSpeed, Math.min(raceConfig.maxCatchUpSpeed, gapToPlayer * 0.015));
  const targetSpeed = Math.min(profile.targetSpeed + catchUp, 19 - bend * 6, followingSpeed);
  return { throttle: state.forwardSpeed < targetSpeed ? 1 : 0,
    brake: state.forwardSpeed > targetSpeed + 1.5 ? 0.3 : 0,
    steer: Math.max(-1, Math.min(1, -error * 1.5)), drift: false };
}
