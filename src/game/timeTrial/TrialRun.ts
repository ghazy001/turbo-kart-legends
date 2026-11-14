import { raceConfig } from '../config/raceConfig';
import { timeTrialConfig } from '../config/timeTrialConfig';
import type { KartState, SampledTrack } from '../core/types';
import { wrapAngle } from '../kart/kartController';
import type { RaceProgress } from '../race/raceProgress';
import { ghostTimeAtProgress } from './ghostPlayback';
import { trialRules } from './trialRules';
import type { GhostFrame, TrialAttempt, TrialInvalidReason, TrialOutcome, TrialRecord } from './types';

const rounded = (value: number, precision = 1000) => Math.round(value * precision) / precision || 0;
export class TrialRun {
  readonly rules: string;
  reference: TrialRecord | null = null;
  outcome: TrialOutcome | null = null;
  invalid: TrialInvalidReason | null = null;
  attempt: TrialAttempt | null = null;
  active = false;
  private frames: GhostFrame[] = [];
  private nextSample = timeTrialConfig.sampleSeconds as number;
  private furthest = -Infinity;
  constructor(readonly track: SampledTrack, readonly laps: number) { this.rules = trialRules(track, laps); }
  reset(active: boolean, state: KartState, distance: number): void {
    this.active = active; this.outcome = null; this.invalid = null; this.attempt = null;
    this.frames = []; this.nextSample = timeTrialConfig.sampleSeconds; this.furthest = -Infinity;
    if (active) this.append(0, state, state, 0, distance);
  }
  invalidate(reason: TrialInvalidReason): void {
    if (!this.active || this.attempt) return;
    this.invalid ??= reason; this.frames = [];
  }
  private append(time: number, before: KartState, after: KartState, alpha: number, distance: number): void {
    this.furthest = Math.max(this.furthest, distance);
    const mix = (a: number, b: number) => rounded(a + (b - a) * alpha);
    this.frames.push([time, mix(before.x, after.x), mix(before.y, after.y), mix(before.z, after.z),
      rounded(before.heading + wrapAngle(after.heading - before.heading) * alpha, 10000),
      mix(before.steering, after.steering), mix(before.wheelSpin, after.wheelSpin), rounded(this.furthest)]);
  }
  /** Called after existing movement/checkpoint bookkeeping, once per fixed tick. */
  observe(elapsed: number, dt: number, before: KartState, after: KartState, previousDistance: number, progress: RaceProgress): void {
    if (!this.active || this.invalid || this.attempt) return;
    if (progress.recoveries > 0) { this.invalidate('recovery'); return; }
    if (![elapsed, after.x, after.y, after.z, after.heading, after.steering, after.wheelSpin, progress.distance].every(Number.isFinite)
      || Math.hypot(after.x - before.x, after.z - before.z) > raceConfig.maxGateSweep) { this.invalidate('discontinuity'); return; }
    if (elapsed > timeTrialConfig.maxSeconds || this.frames.length >= timeTrialConfig.maxFrames) { this.invalidate('limit'); return; }
    const end = progress.finishTime ?? elapsed, start = elapsed - dt;
    while (this.nextSample <= end + 1e-9) {
      const alpha = Math.max(0, Math.min(1, (this.nextSample - start) / dt));
      this.append(this.nextSample, before, after, alpha, previousDistance + (progress.distance - previousDistance) * alpha);
      this.nextSample = rounded(this.nextSample + timeTrialConfig.sampleSeconds);
    }
    if (progress.finishTime !== null && progress.completedLaps === this.laps && progress.lapTimes.length === this.laps) {
      const alpha = Math.max(0, Math.min(1, (end - start) / dt));
      const distance = this.laps * this.track.length;
      if (end - this.frames.at(-1)![0] > 1e-9) this.append(end, before, after, alpha, distance);
      else { const last = this.frames.pop()!; this.frames.push([last[0], last[1], last[2], last[3], last[4], last[5], last[6], rounded(distance)]); }
      this.attempt = { duration: end, lapTimes: [...progress.lapTimes], frames: this.frames };
    }
  }
  delta(elapsed: number, distance: number): number | null {
    const frames = this.reference?.ghost;
    if (!frames || this.invalid) return null;
    const referenceTime = ghostTimeAtProgress(frames, distance);
    return referenceTime === null ? null : elapsed - referenceTime;
  }
}
