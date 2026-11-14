const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export interface TiltSettings { fullLockDegrees: number; deadzone: number; smoothingSeconds: number; inverted: boolean }
export const defaultTiltSettings: TiltSettings = { fullLockDegrees: 25, deadzone: 0.06, smoothingSeconds: 0.08, inverted: false };
/** Project gravity onto the displayed screen's horizontal axis. Alpha/compass is unnecessary. */
export function screenTilt(beta: number, gamma: number, screenAngle: number): number {
  const b = beta * Math.PI / 180, g = gamma * Math.PI / 180, a = screenAngle * Math.PI / 180;
  const horizontal = Math.sin(g) * Math.cos(b) * Math.cos(a) - Math.sin(b) * Math.sin(a);
  return Math.asin(clamp(horizontal, -1, 1)) * 180 / Math.PI;
}
export function normalizeTilt(degrees: number, neutral: number, settings: TiltSettings): number {
  const normalized = clamp((degrees - neutral) / clamp(settings.fullLockDegrees, 10, 50), -1, 1), deadzone = clamp(settings.deadzone, 0, 0.25);
  return (Math.abs(normalized) <= deadzone ? 0 : Math.sign(normalized) * (Math.abs(normalized) - deadzone) / (1 - deadzone)) * (settings.inverted ? -1 : 1);
}
export function smoothSteering(current: number, target: number, dt: number, seconds: number): number {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, Math.min(dt, 0.1)) / Math.max(0.001, seconds)));
}
export class TiltSteering {
  reading: number | null = null; private neutral: number | null = null; private value = 0; private lastAt = -Infinity;
  update(beta: number | null, gamma: number | null, angle: number, now: number) {
    if (beta === null || gamma === null || !Number.isFinite(beta + gamma + angle)) return;
    this.reading = screenTilt(beta, gamma, angle); this.lastAt = now;
  }
  calibrate() { if (this.reading === null) return false; this.neutral = this.reading; this.value = 0; return true; }
  reset() { this.neutral = null; this.value = 0; this.reading = null; }
  get calibrated() { return this.neutral !== null; }
  sample(now: number, dt: number, settings: TiltSettings) {
    if (this.neutral === null || this.reading === null || now - this.lastAt > 500) { this.value = 0; return { steer: 0, available: false }; }
    this.value = smoothSteering(this.value, normalizeTilt(this.reading, this.neutral, settings), dt, settings.smoothingSeconds);
    return { steer: Math.abs(this.value) < 0.001 ? 0 : this.value, available: true };
  }
}
