import { kartConfig as config } from '../config/kartConfig';
import type { KartInput, KartState } from '../core/types';
import { boostTiers, driftConfig } from '../config/driftConfig';
import { advanceDrift } from './driftController';
import { advanceJump } from './jumpController';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const approachZero = (value: number, amount: number) => Math.sign(value) * Math.max(0, Math.abs(value) - amount);
export const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export function integrateSpeed(speed: number, input: KartInput, dt: number, boostTier: KartState['boostTier'] = 0): number {
  const boost = boostTier > 0 ? boostTiers[boostTier - 1] : null;
  const maxSpeed = boost?.maxSpeed ?? Math.max(config.maxForwardSpeed, speed - driftConfig.overspeedDrag * dt);
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

export function moveKart(state: KartState, input: KartInput, dt: number): KartState {
  const abilities = advanceDrift(state, input, dt);
  const jumping = advanceJump(abilities, dt);
  const forwardSpeed = integrateSpeed(state.forwardSpeed, input, dt, abilities.boostTier);
  const steering = state.steering + (clamp(input.steer, -1, 1) - state.steering) * (1 - Math.exp(-config.steeringResponse * dt));
  const drifting = abilities.driftDirection !== 0;
  const effectiveSteer = drifting
    ? abilities.driftDirection * driftConfig.lockedSteer + steering * driftConfig.inputSteer : steering;
  const steerAngle = effectiveSteer * config.maxSteerAngle
    / (1 + Math.abs(forwardSpeed) / config.maxForwardSpeed * config.highSpeedSteerReduction);
  // With +Z forward, a rear chase camera sees -X on its right:
  // positive (right) input must decrease heading, including after hot reload.
  const yawRate = -forwardSpeed / config.wheelBase * Math.tan(steerAngle) * (drifting ? driftConfig.yawMultiplier : 1);
  const heading = wrapAngle(state.heading + yawRate * dt);
  const grip = drifting ? driftConfig.lateralGrip : config.lateralGrip;
  const slip = drifting ? driftConfig.slipFactor : config.slipFactor;
  const lateralSpeed = clamp((state.lateralSpeed - yawRate * forwardSpeed * slip * dt)
    * Math.exp(-grip * dt), -driftConfig.maxLateralSpeed, driftConfig.maxLateralSpeed);
  return {
    ...jumping,
    x: state.x + (Math.sin(heading) * forwardSpeed + Math.cos(heading) * lateralSpeed) * dt,
    z: state.z + (Math.cos(heading) * forwardSpeed - Math.sin(heading) * lateralSpeed) * dt,
    heading, forwardSpeed, lateralSpeed, yawRate, steering,
    wheelSpin: state.wheelSpin + forwardSpeed * dt / config.wheelRadius,
  };
}
