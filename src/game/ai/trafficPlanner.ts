import { aiConfig, aiSkills } from '../config/aiConfig';
import type { AIDifficulty } from '../config/raceOptions';
import type { KartState, SampledTrack } from '../core/types';
import { nearestRoadPoint } from '../tracks/trackSampling';

export interface AITraffic { id: string; state: KartState }
export interface AIDriverState {
  lane: number; targetLane: number; decisionRemaining: number; commitment: number;
  defendCooldown: number; maneuver: 'line' | 'pass' | 'defend'; rivalId: string | null;
}
export const createAIDriverState = (lane = 0): AIDriverState => ({ lane, targetLane: lane, decisionRemaining: 0, commitment: 0, defendCooldown: 0, maneuver: 'line', rivalId: null });

/** Bounded local decisions, committed passing side and one defensive move before cooldown. */
export function planTraffic(state: KartState, track: SampledTrack, id: string, traffic: readonly AITraffic[],
  brain: AIDriverState, idealLane: number, curve: number, difficulty: AIDifficulty, dt: number, road = nearestRoadPoint(track, state)) {
  const skill = aiSkills[difficulty];
  const nearby = traffic.filter(other => other.id !== id && Math.hypot(other.state.x - state.x, other.state.z - state.z) < aiConfig.trafficRange).map(other => {
    const dx = other.state.x - road.x, dz = other.state.z - road.z;
    return { ...other, ahead: (other.state.x - state.x) * road.tx + (other.state.z - state.z) * road.tz, lane: dx * road.tz - dz * road.tx };
  });
  const clear = (lane: number) => !nearby.some(other => {
    const closing = Math.max(0, state.forwardSpeed - other.state.forwardSpeed);
    if (Math.abs(other.ahead) < aiConfig.alongsideLength) {
      const currentSide = brain.lane - other.lane, targetSide = lane - other.lane;
      // Moving away is safe even when contact has squeezed the current clearance.
      return currentSide * targetSide < 0 || Math.abs(targetSide) < aiConfig.laneSeparation && Math.abs(targetSide) < Math.abs(currentSide) - 0.001;
    }
    return other.ahead > -aiConfig.alongsideLength && other.ahead < aiConfig.alongsideLength + closing * 0.7
      && Math.abs(other.lane - lane) < aiConfig.laneSeparation;
  });
  brain.decisionRemaining -= dt; brain.commitment = Math.max(0, brain.commitment - dt); brain.defendCooldown = Math.max(0, brain.defendCooldown - dt);
  if (brain.decisionRemaining <= 0) {
    brain.decisionRemaining = skill.decisionInterval;
    const leader = nearby.filter(other => other.ahead > 0 && other.ahead < skill.passRange && Math.abs(other.lane - brain.lane) < aiConfig.laneSeparation)
      .sort((a, b) => a.ahead - b.ahead)[0];
    const alongside = nearby.some(other => Math.abs(other.ahead) < aiConfig.alongsideLength);
    if (brain.commitment === 0) {
      brain.maneuver = 'line'; brain.rivalId = null;
      if (leader && leader.state.forwardSpeed < state.forwardSpeed + 1.5) {
        const sides = [-aiConfig.laneLimit, aiConfig.laneLimit].filter(lane => Math.abs(lane - leader.lane) >= aiConfig.laneSeparation && clear(lane));
        sides.sort((a, b) => Math.abs(a - idealLane) - Math.abs(b - idealLane) || (id < leader.id ? a - b : b - a));
        if (sides.length) { brain.targetLane = sides[0]; brain.maneuver = 'pass'; brain.rivalId = leader.id; brain.commitment = aiConfig.passCommitment; }
      } else if (skill.defend && !alongside && brain.defendCooldown === 0 && nearby.some(other => other.ahead < -5 && other.ahead > -14 && other.state.forwardSpeed > state.forwardSpeed + 0.4)) {
        const inside = Math.abs(curve) > 0.004 ? Math.sign(curve) * 1.35 : Math.sign(idealLane || 1) * 1.35;
        if (clear(inside)) { brain.targetLane = inside; brain.maneuver = 'defend'; brain.commitment = aiConfig.defendCommitment; brain.defendCooldown = aiConfig.defendCooldown; }
      }
    }
    if (brain.maneuver === 'line' && clear(idealLane)) brain.targetLane = idealLane;
  }
  // Never sweep into a lane occupied alongside, including when returning to the ideal line.
  const desired = clear(brain.targetLane) ? brain.targetLane : brain.lane;
  brain.lane += Math.max(-skill.laneRate * dt, Math.min(skill.laneRate * dt, desired - brain.lane));
  let following = Infinity;
  for (const other of nearby) {
    if (other.ahead <= 0 || Math.abs(other.lane - brain.lane) >= aiConfig.laneSeparation) continue;
    following = Math.min(following, Math.max(0, other.state.forwardSpeed) + Math.sqrt(2 * skill.braking * Math.max(0, other.ahead - aiConfig.followingGap)));
  }
  return { lane: brain.lane, following };
}
