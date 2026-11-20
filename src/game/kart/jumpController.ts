import { jumpConfig as config } from '../config/boostConfig';
import type { KartState } from '../core/types';

/** Ballistic ramp flight and landing. Planar rail constraints remain active in the air. */
export function advanceJump(state: KartState, dt: number, ground = 0, grounded = state.y === 0 && state.verticalSpeed === 0): KartState {
  const next = { ...state, landingCompression: state.landingCompression * Math.exp(-config.landingDamping * dt) };
  if (grounded && state.verticalSpeed === 0) return { ...next, y: ground };
  next.y = state.y + state.verticalSpeed * dt - 0.5 * config.gravity * dt * dt;
  next.verticalSpeed = state.verticalSpeed - config.gravity * dt;
  if (next.y <= ground && next.verticalSpeed < 0) {
    next.y = ground; next.verticalSpeed = 0;
    next.landingCompression = config.landingSquash;
    next.landingSerial++;
  }
  return next;
}
