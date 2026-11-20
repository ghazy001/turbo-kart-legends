import { boostTiers } from '../config/boostConfig';
import { itemConfig } from '../config/itemConfig';
import type { KartInput, KartState } from '../core/types';
import { clearLegacyDrift } from '../kart/boostController';

export const turboBoost = boostTiers[itemConfig.turboTier - 1];

/** The item grants an existing boost; movement and cancellation keep their original owner. */
export function canActivateTurbo(state: KartState, input: KartInput, slowRemaining: number): boolean {
  return state.forwardSpeed >= itemConfig.turboMinSpeed && input.brake === 0
    && slowRemaining <= 0 && state.boostRemaining <= 0;
}

export function activateTurbo(state: KartState): KartState {
  return { ...clearLegacyDrift(state), boostTier: itemConfig.turboTier,
    boostRemaining: turboBoost.duration, boostSerial: state.boostSerial + 1 };
}
