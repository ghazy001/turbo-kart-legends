import { boostTiers, driftConfig as config } from '../config/driftConfig';
import type { ChargeTier, DriftDirection, KartInput, KartState } from '../core/types';

export function chargeTier(charge: number): ChargeTier {
  if (charge + 1e-8 >= boostTiers[2].charge) return 3;
  if (charge + 1e-8 >= boostTiers[1].charge) return 2;
  if (charge + 1e-8 >= boostTiers[0].charge) return 1;
  return 0;
}

/** Cancel without payout, used by collisions, braking and lost focus/pause. */
export function cancelDrift(state: KartState): KartState {
  return { ...state, driftDirection: 0, driftCharge: 0, driftGrace: 0 };
}

export function advanceDrift(state: KartState, input: KartInput, dt: number): KartState {
  let next: KartState = { ...state,
    driftHeld: input.drift,
    actionCooldown: Math.max(0, state.actionCooldown - dt),
    boostRemaining: Math.max(0, state.boostRemaining - dt),
  };
  if (state.boostRemaining > 0 && (next.boostRemaining === 0 || input.brake > 0)) {
    next.boostRemaining = 0; next.boostTier = 0;
    next.actionCooldown = config.boostRecovery;
  }
  if (next.boostRemaining === 0) next.boostTier = 0;
  const moving = state.forwardSpeed >= config.minSpeed && input.brake === 0;
  if (state.driftDirection !== 0) {
    if (!moving) return { ...cancelDrift(next), actionCooldown: config.releaseCooldown };
    if (!input.drift) {
      const tier = chargeTier(state.driftCharge);
      next = cancelDrift(next);
      next.actionCooldown = config.releaseCooldown;
      if (tier > 0) {
        next.boostTier = tier;
        next.boostRemaining = boostTiers[tier - 1].duration;
        next.boostSerial++;
      }
      return next;
    }
    const steering = Math.abs(input.steer) >= config.minSteer;
    next.driftGrace = steering ? 0 : state.driftGrace + dt;
    if (next.driftGrace >= config.steerGrace) return { ...cancelDrift(next), actionCooldown: config.releaseCooldown };
    if (steering && state.y === 0) {
      next.driftCharge = Math.min(boostTiers[2].charge, state.driftCharge + dt);
    } else if (!steering) next.driftCharge = Math.max(0, state.driftCharge - config.chargeDecay * dt);
    return next;
  }
  const pressed = input.drift && !state.driftHeld;
  if (pressed && moving && state.y === 0 && next.actionCooldown === 0 && next.boostRemaining === 0) {
    next.verticalSpeed = config.hopImpulse;
    next.jumpSerial++;
    next.actionCooldown = config.releaseCooldown;
    if (Math.abs(input.steer) >= config.minSteer) {
      next.driftDirection = Math.sign(input.steer) as DriftDirection;
      next.driftCharge = 0; next.driftGrace = 0;
    }
  }
  return next;
}
