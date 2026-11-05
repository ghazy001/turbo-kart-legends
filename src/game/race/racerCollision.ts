import { raceConfig } from '../config/raceConfig';
import type { KartState, SampledTrack } from '../core/types';
import { constrainKart } from '../kart/kartCollision';
import { driftConfig } from '../config/driftConfig';
import { cancelDrift } from '../kart/driftController';

function constrainContact(state: KartState, track: SampledTrack): KartState {
  const constrained = constrainKart(state, track);
  return constrained === state ? state : { ...cancelDrift(constrained), boostRemaining: 0, boostTier: 0, actionCooldown: driftConfig.boostRecovery };
}

/** Equal-mass planar contacts layered on the existing movement owner. */
export function resolveRacerContacts(states: KartState[], track: SampledTrack): void {
  const diameter = raceConfig.racerRadius * 2;
  for (let pass = 0; pass < raceConfig.contactIterations; pass++) for (let i = 0; i < states.length; i++) for (let j = i + 1; j < states.length; j++) {
    let a = states[i]; let b = states[j];
    const dx = b.x - a.x; const dz = b.z - a.z;
    const distance = Math.hypot(dx, dz);
    if (distance >= diameter) continue;
    const nx = distance > 0.0001 ? dx / distance : 1; const nz = distance > 0.0001 ? dz / distance : 0;
    const shift = (diameter - distance + 0.002) / 2;
    a = { ...a, x: a.x - nx * shift, z: a.z - nz * shift };
    b = { ...b, x: b.x + nx * shift, z: b.z + nz * shift };
    let ax = Math.sin(a.heading) * a.forwardSpeed + Math.cos(a.heading) * a.lateralSpeed;
    let az = Math.cos(a.heading) * a.forwardSpeed - Math.sin(a.heading) * a.lateralSpeed;
    let bx = Math.sin(b.heading) * b.forwardSpeed + Math.cos(b.heading) * b.lateralSpeed;
    let bz = Math.cos(b.heading) * b.forwardSpeed - Math.sin(b.heading) * b.lateralSpeed;
    const closing = (ax - bx) * nx + (az - bz) * nz;
    if (closing > 0) {
      const impulse = closing * 0.6;
      ax -= nx * impulse; az -= nz * impulse; bx += nx * impulse; bz += nz * impulse;
      a = { ...a, forwardSpeed: ax * Math.sin(a.heading) + az * Math.cos(a.heading), lateralSpeed: ax * Math.cos(a.heading) - az * Math.sin(a.heading) };
      b = { ...b, forwardSpeed: bx * Math.sin(b.heading) + bz * Math.cos(b.heading), lateralSpeed: bx * Math.cos(b.heading) - bz * Math.sin(b.heading) };
      if (closing > 3) { a = { ...cancelDrift(a), boostRemaining: 0, boostTier: 0 }; b = { ...cancelDrift(b), boostRemaining: 0, boostTier: 0 }; }
    }
    states[i] = constrainContact(a, track); states[j] = constrainContact(b, track);
  }
}
