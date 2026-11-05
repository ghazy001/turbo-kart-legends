import { driftConfig as config } from '../config/driftConfig';
import type { KartState } from '../core/types';

/** Ballistic drift-entry hop. Planar rail constraints remain active in the air. */
export function advanceJump(state: KartState, dt: number): KartState {
  const next = { ...state, landingCompression: state.landingCompression * Math.exp(-config.landingDamping * dt) };
  if (state.y === 0 && state.verticalSpeed === 0) return next;
  next.y = state.y + state.verticalSpeed * dt - 0.5 * config.gravity * dt * dt;
  next.verticalSpeed = state.verticalSpeed - config.gravity * dt;
  if (next.y <= 0 && next.verticalSpeed < 0) {
    next.y = 0; next.verticalSpeed = 0;
    next.landingCompression = config.landingSquash;
    next.landingSerial++;
  }
  return next;
}
