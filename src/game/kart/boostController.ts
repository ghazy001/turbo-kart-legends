import { boostConfig } from '../config/boostConfig';
import type { KartInput, KartState } from '../core/types';

/** Clear retired state so old snapshots cannot earn a release boost or affect handling. */
export function clearLegacyDrift(state: KartState): KartState {
  return { ...state, driftDirection: 0, driftCharge: 0, driftGrace: 0, driftHeld: false };
}

/** Only externally granted pad/item boosts can advance; steering never charges a turbo. */
export function advanceBoost(state: KartState, input: KartInput, dt: number): KartState {
  const next = { ...clearLegacyDrift(state), actionCooldown: Math.max(0, state.actionCooldown - dt),
    boostRemaining: Math.max(0, state.boostRemaining - dt) };
  if (state.boostRemaining > 0 && (next.boostRemaining === 0 || input.brake > 0)) {
    next.boostRemaining = 0; next.actionCooldown = boostConfig.boostRecovery;
  }
  if (next.boostRemaining === 0) next.boostTier = 0;
  return next;
}
