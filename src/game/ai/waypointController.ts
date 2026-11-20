import { aiConfig, aiSkills } from '../config/aiConfig';
import { boostTiers } from '../config/boostConfig';
import { kartConfig, loopConfig } from '../config/kartConfig';
import type { AIDifficulty } from '../config/raceOptions';
import type { KartInput, KartState, SampledTrack } from '../core/types';
import { wrapAngle } from '../kart/kartController';
import { nearestRoadPoint, offsetSample } from '../tracks/trackSampling';
import { pointAtDistance, wrapDistance } from '../race/trackProgress';
import { plannedSpeed, racingLane, roadCurvature } from './racingLine';
import { createAIDriverState, planTraffic, type AIDriverState, type AITraffic } from './trafficPlanner';
export { createAIDriverState, type AIDriverState, type AITraffic } from './trafficPlanner';

export interface AIDrivingContext { brain: AIDriverState; difficulty: AIDifficulty; dt: number }
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Only normalized driver inputs: no position, speed, grip or item grants. Gap is retained for callers, never used for rubber-banding. */
export function waypointInput(state: KartState, track: SampledTrack, profile: { id: string; targetSpeed: number; lane: number },
  traffic: readonly AITraffic[], gapToPlayer = 0, context?: AIDrivingContext): KartInput {
  void gapToPlayer;
  const difficulty = context?.difficulty ?? 'normal', skill = aiSkills[difficulty];
  const road = nearestRoadPoint(track, state), speed = Math.max(0, state.forwardSpeed);
  const offset = (state.x - road.x) * road.tz - (state.z - road.z) * road.tx;
  const wideLine = clamp((Math.abs(offset) - aiConfig.lineLimit) / (aiConfig.laneLimit - aiConfig.lineLimit), 0, 1);
  const lookAhead = (aiConfig.lookAheadBase + speed * aiConfig.lookAheadSpeed) * (1 - wideLine * aiConfig.wideLineLookAheadReduction);
  const targetRoad = pointAtDistance(track, road.progress + lookAhead);
  const curve = roadCurvature(track, road.progress + lookAhead);
  let idealLane = context ? racingLane(track, road.progress + lookAhead) * skill.lineStrength + profile.lane * 0.12 : profile.lane;
  // Line up for actual feature gates. There are no branched shortcuts in the current courses.
  const approachingFeature = track.definition.features?.some(feature => wrapDistance(feature.fraction * track.length - road.progress, track.length) < aiConfig.featureApproach);
  if (approachingFeature) idealLane *= 0.25;
  idealLane = clamp(idealLane, -aiConfig.laneLimit, aiConfig.laneLimit);
  const brain = context?.brain ?? createAIDriverState(offset);
  const trafficPlan = planTraffic(state, track, profile.id, traffic, brain, idealLane, curve, difficulty, context?.dt ?? loopConfig.step, road);
  const target = offsetSample(targetRoad, trafficPlan.lane), dx = target.x - state.x, dz = target.z - state.z;
  const error = wrapAngle(Math.atan2(dx, dz) - state.heading);
  const curvature = 2 * (dx * Math.cos(state.heading) - dz * Math.sin(state.heading)) / Math.max(1, dx * dx + dz * dz);
  const normalSteer = clamp(-Math.atan(kartConfig.wheelBase * curvature) * (1 + speed / kartConfig.maxForwardSpeed * kartConfig.highSpeedSteerReduction) / kartConfig.maxSteerAngle, -1, 1);
  // A legitimately earned boost may exceed cruise pace; the same corner/braking envelope still applies.
  const ceiling = state.boostRemaining > 0 && state.boostTier > 0 ? boostTiers[state.boostTier - 1].maxSpeed
    : Math.max(Math.min(kartConfig.maxForwardSpeed, profile.targetSpeed), speed > kartConfig.maxForwardSpeed ? speed : 0);
  let targetSpeed = Math.min(plannedSpeed(track, road.progress, ceiling, skill.cornerMargin, skill.braking, trafficPlan.lane), trafficPlan.following);
  if (Math.abs(offset) > aiConfig.edgeSlowdownStart) targetSpeed = Math.min(targetSpeed, Math.max(aiConfig.edgeMinimumSpeed,
    kartConfig.maxForwardSpeed - (Math.abs(offset) - aiConfig.edgeSlowdownStart) * aiConfig.edgeSpeedFalloff));
  if (Math.abs(error) > 0.6) targetSpeed = Math.min(targetSpeed, 10);
  const excess = speed - targetSpeed;
  const brake = speed > 0.5 && excess > 0.65 ? clamp(excess / 5, 0, 1) : 0;
  const throttle = brake > 0 ? 0 : clamp((targetSpeed - speed) / 0.8 + 0.5, 0, 1);
  return { throttle, brake, steer: normalSteer, drift: false };
}
