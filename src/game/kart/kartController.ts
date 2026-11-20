import { kartConfig as config } from '../config/kartConfig';
import type { KartInput, KartState, Vec2 } from '../core/types';
import { boostTiers, boostConfig } from '../config/boostConfig';
import { advanceBoost } from './boostController';
import { advanceJump } from './jumpController';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const approachZero = (value: number, amount: number) => Math.sign(value) * Math.max(0, Math.abs(value) - amount);
export const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export function integrateSpeed(speed: number, input: KartInput, dt: number, boostTier: KartState['boostTier'] = 0): number {
  const boost = boostTier > 0 ? boostTiers[boostTier - 1] : null;
  const maxSpeed = boost?.maxSpeed ?? Math.max(config.maxForwardSpeed, speed - boostConfig.overspeedDrag * dt);
  const throttle = clamp(input.throttle, 0, 1);
  const brake = clamp(input.brake, 0, 1);
  if (brake > 0) {
    speed = speed > 0 ? Math.max(0, speed - config.braking * brake * dt)
      : speed - config.reverseAcceleration * brake * dt;
  } else if (throttle > 0) {
    speed = speed < 0 ? Math.min(0, speed + config.braking * throttle * dt)
      : speed + (boost?.acceleration ?? config.acceleration) * throttle * dt;
  } else {
    speed = approachZero(speed, config.coastDrag * dt);
  }
  speed = approachZero(speed, Math.abs(speed) * config.rollingDrag * dt);
  return clamp(speed, -config.maxReverseSpeed, maxSpeed);
}

export function moveKart(state: KartState, input: KartInput, dt: number, surface?: { height: number; at: (point: Vec2) => number }): KartState {
  const ground = surface?.height ?? 0;
  const abilities = advanceBoost(state, input, dt);
  const forwardSpeed = integrateSpeed(state.forwardSpeed, input, dt, abilities.boostTier);
  const steering = state.steering + (clamp(input.steer, -1, 1) - state.steering) * (1 - Math.exp(-config.steeringResponse * dt));
  const steerAngle = steering * config.maxSteerAngle
    / (1 + Math.abs(forwardSpeed) / config.maxForwardSpeed * config.highSpeedSteerReduction);
  // With +Z forward, a rear chase camera sees -X on its right:
  // positive (right) input must decrease heading, including after hot reload.
  const yawRate = -forwardSpeed / config.wheelBase * Math.tan(steerAngle);
  const heading = wrapAngle(state.heading + yawRate * dt);
  const lateralSpeed = clamp((state.lateralSpeed - yawRate * forwardSpeed * config.slipFactor * dt)
    * Math.exp(-config.lateralGrip * dt), -boostConfig.maxLateralSpeed, boostConfig.maxLateralSpeed);
  const moved = {
    ...abilities,
    x: state.x + (Math.sin(heading) * forwardSpeed + Math.cos(heading) * lateralSpeed) * dt,
    z: state.z + (Math.cos(heading) * forwardSpeed - Math.sin(heading) * lateralSpeed) * dt,
    heading, forwardSpeed, lateralSpeed, yawRate, steering,
    wheelSpin: state.wheelSpin + forwardSpeed * dt / config.wheelRadius,
  };
  return advanceJump(moved, dt, surface?.at(moved) ?? 0, state.y <= ground + 0.001 && state.verticalSpeed === 0);
}
