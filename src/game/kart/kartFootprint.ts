import { kartConfig } from '../config/kartConfig';
import type { KartState } from '../core/types';

type Pose = Pick<KartState, 'x' | 'z' | 'heading'>;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const capsuleHalfSegment = kartConfig.collisionHalfLength - kartConfig.collisionHalfWidth;

/** Shared rounded longitudinal footprint. Cosmetic kart swaps never change contact size. */
export function capsuleAxis(state: Pose) {
  const x = Math.sin(state.heading) * capsuleHalfSegment, z = Math.cos(state.heading) * capsuleHalfSegment;
  return { ax: state.x - x, az: state.z - z, bx: state.x + x, bz: state.z + z };
}

/** Exact closest points between the two capsule center segments, including parallel segments. */
export function kartContact(a: Pose, b: Pose): { nx: number; nz: number; depth: number } | null {
  const reach = kartConfig.collisionRadius * 2;
  if ((b.x - a.x) ** 2 + (b.z - a.z) ** 2 >= reach * reach) return null;
  const first = capsuleAxis(a), second = capsuleAxis(b);
  const ux = first.bx - first.ax, uz = first.bz - first.az;
  const vx = second.bx - second.ax, vz = second.bz - second.az;
  const rx = first.ax - second.ax, rz = first.az - second.az;
  const uu = ux * ux + uz * uz, vv = vx * vx + vz * vz, uv = ux * vx + uz * vz;
  const ur = ux * rx + uz * rz, vr = vx * rx + vz * rz;
  const denominator = uu * vv - uv * uv;
  let s = denominator > 1e-8 ? clamp((uv * vr - ur * vv) / denominator) : 0;
  let t = (uv * s + vr) / vv;
  if (t < 0) { t = 0; s = clamp(-ur / uu); }
  else if (t > 1) { t = 1; s = clamp((uv - ur) / uu); }
  const dx = second.ax + vx * t - first.ax - ux * s;
  const dz = second.az + vz * t - first.az - uz * s;
  const distance = Math.hypot(dx, dz), diameter = kartConfig.collisionHalfWidth * 2;
  if (distance >= diameter) return null;
  if (distance > 1e-8) return { nx: dx / distance, nz: dz / distance, depth: diameter - distance };
  const centers = Math.hypot(b.x - a.x, b.z - a.z);
  return { nx: centers > 1e-8 ? (b.x - a.x) / centers : Math.cos(a.heading),
    nz: centers > 1e-8 ? (b.z - a.z) / centers : -Math.sin(a.heading), depth: diameter };
}

/** Support of the capsule along a wall normal; nose and side clearances differ naturally. */
export function footprintSupport(heading: number, nx: number, nz: number): number {
  return kartConfig.collisionHalfWidth + capsuleHalfSegment * Math.abs(Math.sin(heading) * nx + Math.cos(heading) * nz);
}
