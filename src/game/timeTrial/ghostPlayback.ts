import { wrapAngle } from '../kart/kartController';
import type { GhostFrame, GhostPose } from './types';

/** Lower bound lookup works through stops/reversing: progress records first arrival, not nearest geometry. */
function lowerBound(frames: readonly GhostFrame[], value: number, column: 0 | 7): number {
  let low = 0, high = frames.length - 1;
  while (low < high) { const mid = (low + high) >>> 1; if (frames[mid][column] < value) low = mid + 1; else high = mid; }
  return low;
}
export function ghostTimeAtProgress(frames: readonly GhostFrame[], distance: number): number | null {
  if (frames.length < 2 || !Number.isFinite(distance) || distance < frames[0][7] || distance > frames.at(-1)![7]) return null;
  const i = lowerBound(frames, distance, 7), b = frames[i], a = frames[Math.max(0, i - 1)];
  const span = b[7] - a[7];
  return span > 0 ? a[0] + (b[0] - a[0]) * (distance - a[7]) / span : b[0];
}
/** Interpolated decoration only. It never owns a Simulation, input, progress or collider. */
export function sampleGhost(frames: readonly GhostFrame[], seconds: number, out: GhostPose): boolean {
  if (frames.length < 2 || !Number.isFinite(seconds) || seconds < 0 || seconds > frames.at(-1)![0]) return false;
  const i = lowerBound(frames, seconds, 0), b = frames[i], a = frames[Math.max(0, i - 1)];
  const t = b[0] > a[0] ? (seconds - a[0]) / (b[0] - a[0]) : 0;
  out.x = a[1] + (b[1] - a[1]) * t; out.y = a[2] + (b[2] - a[2]) * t; out.z = a[3] + (b[3] - a[3]) * t;
  out.heading = a[4] + wrapAngle(b[4] - a[4]) * t;
  out.steering = a[5] + (b[5] - a[5]) * t; out.wheelSpin = a[6] + (b[6] - a[6]) * t;
  return true;
}
