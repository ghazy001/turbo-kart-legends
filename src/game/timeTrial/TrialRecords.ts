import { timeTrialConfig } from '../config/timeTrialConfig';
import type { SampledTrack } from '../core/types';
import type { TrialRun } from './TrialRun';
import { trialRules } from './trialRules';
import type { GhostFrame, TrialOutcome, TrialRecord } from './types';

type RecordStorage = Pick<Storage, 'getItem' | 'setItem'>;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const trialStorageKey = (trackId: string) => `turbo-kart-legends.time-trial.v1.${trackId}`;
function validGhost(value: unknown, duration: number, distance: number): readonly GhostFrame[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > timeTrialConfig.maxFrames) return null;
  const frames: GhostFrame[] = [];
  for (const entry of value) {
    if (!Array.isArray(entry)) return null;
    const row: unknown[] = entry;
    if (row.length !== 8 || !row.every(finite)) return null;
    const frame: GhostFrame = [row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7]], previous = frames.at(-1);
    if (frame[0] < 0 || frame[0] > duration + 1e-6 || Math.abs(frame[1]) > 10000 || Math.abs(frame[3]) > 10000
      || Math.abs(frame[2]) > 20 || Math.abs(frame[4]) > 100 || Math.abs(frame[5]) > 2 || Math.abs(frame[6]) > 1e6
      || frame[7] < -100 || frame[7] > distance + 0.002
      || previous && (frame[0] <= previous[0] || frame[0] - previous[0] > 0.101 || frame[7] < previous[7])) return null;
    frames.push(frame);
  }
  return frames[0][0] === 0 && Math.abs(frames.at(-1)![0] - duration) < 1e-6 && Math.abs(frames.at(-1)![7] - distance) < 0.002 ? frames : null;
}
/** Untrusted local storage is bounded and validated. Bad replay data never discards sound timing metadata. */
export function parseTrialRecord(raw: string | null, rules: string, laps: number, length: number): TrialRecord | null {
  if (!raw || raw.length > timeTrialConfig.maxStorageChars) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const data = value as Record<string, unknown>;
    if (data.version !== 1 || data.rules !== rules || data.laps !== laps || !finite(data.bestRace) || data.bestRace <= 0 || data.bestRace > timeTrialConfig.maxSeconds
      || !finite(data.bestLap) || data.bestLap <= 0 || !Array.isArray(data.lapTimes) || data.lapTimes.length !== laps) return null;
    const lapTimes: unknown[] = data.lapTimes;
    if (!lapTimes.every(finite) || lapTimes.some(lap => lap <= 0) || data.bestLap > Math.min(...lapTimes) + 0.001
      || Math.abs(lapTimes.reduce((sum, lap) => sum + lap, 0) - data.bestRace) > 0.002) return null;
    return { version: 1, rules, laps, bestRace: data.bestRace, bestLap: data.bestLap, lapTimes,
      ghost: validGhost(data.ghost, data.bestRace, laps * length) };
  } catch { return null; }
}

/** Browser adapter: no storage access occurs in fixed-step simulation or replay rendering. */
export class TrialRecords {
  private readonly records = new Map<string, TrialRecord | null>();
  private readonly statuses = new Map<string, TrialOutcome['storage']>();
  constructor(private readonly storage?: RecordStorage) {}
  get(track: SampledTrack, laps: number): TrialRecord | null {
    const rules = trialRules(track, laps), key = `${track.definition.id}:${rules}`;
    if (!this.records.has(key)) {
      try { this.records.set(key, parseTrialRecord((this.storage ?? localStorage).getItem(trialStorageKey(track.definition.id)), rules, laps, track.length)); this.statuses.set(key, 'saved'); }
      catch { this.records.set(key, null); this.statuses.set(key, 'memory-only'); }
    }
    return this.records.get(key) ?? null;
  }
  complete(run: TrialRun): TrialOutcome {
    if (run.outcome) return run.outcome;
    const previous = this.get(run.track, run.laps), attempt = run.attempt, key = `${run.track.definition.id}:${run.rules}`;
    const eligible = !!attempt && !run.invalid;
    const bestLap = attempt ? Math.min(...attempt.lapTimes) : Infinity;
    const newRace = eligible && (!previous || attempt!.duration < previous.bestRace - timeTrialConfig.timeTolerance);
    const newLap = eligible && (!previous || bestLap < previous.bestLap - timeTrialConfig.timeTolerance);
    let record = previous, status = this.statuses.get(key) ?? 'memory-only';
    if (eligible && (newRace || newLap)) {
      record = { version: 1, rules: run.rules, laps: run.laps, bestRace: newRace ? attempt!.duration : previous!.bestRace,
        bestLap: newLap ? bestLap : previous!.bestLap, lapTimes: newRace ? [...attempt!.lapTimes] : previous!.lapTimes,
        ghost: newRace ? attempt!.frames : previous!.ghost };
      this.records.set(key, record);
      status = this.persist(run.track.definition.id, record); this.statuses.set(key, status);
    }
    return run.outcome = { eligible, reason: run.invalid ?? undefined, first: !previous && eligible, newRace, newLap,
      previousRace: previous?.bestRace ?? null, previousLap: previous?.bestLap ?? null, record, storage: status };
  }
  private persist(trackId: string, record: TrialRecord): TrialOutcome['storage'] {
    try {
      const raw = JSON.stringify(record);
      if (raw.length > timeTrialConfig.maxStorageChars) throw new Error('Replay exceeds storage budget.');
      (this.storage ?? localStorage).setItem(trialStorageKey(trackId), raw); return 'saved';
    } catch {
      // Keep the full ghost in memory; a small timing-only write may still fit when quota is exhausted.
      try { (this.storage ?? localStorage).setItem(trialStorageKey(trackId), JSON.stringify({ ...record, ghost: null })); return 'times-only'; }
      catch { return 'memory-only'; }
    }
  }
}
