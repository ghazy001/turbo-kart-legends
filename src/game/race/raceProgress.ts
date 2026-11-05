import { raceConfig } from '../config/raceConfig';
import type { SampledTrack, Vec2 } from '../core/types';
import { nearestRoadPoint } from '../tracks/trackSampling';
import { crossingFraction, relativeProgress, type Checkpoint } from './trackProgress';

export interface RaceProgress {
  started: boolean;
  nextCheckpoint: number;
  completedLaps: number;
  lapStart: number;
  lapTimes: number[];
  splits: number[];
  lastSplit: number | null;
  finishTime: number | null;
  distance: number;
  wrongWayTime: number;
  recoveries: number;
}
export function createRaceProgress(gridDistance = -raceConfig.gridBack): RaceProgress {
  return { started: false, nextCheckpoint: 0, completedLaps: 0, lapStart: 0, lapTimes: [], splits: [], lastSplit: null,
    finishTime: null, distance: gridDistance, wrongWayTime: 0, recoveries: 0 };
}
export function bestLap(progress: RaceProgress): number | null {
  return progress.lapTimes.length ? Math.min(...progress.lapTimes) : null;
}

/** Mutates race bookkeeping only. Simulation positions never come from lap progress. */
export function advanceRaceProgress(progress: RaceProgress, before: Vec2, after: Vec2, elapsed: number,
  dt: number, track: SampledTrack, checkpoints: readonly Checkpoint[], laps = raceConfig.laps): void {
  if (progress.finishTime !== null) return;
  const road = nearestRoadPoint(track, after);
  const velocityAlong = ((after.x - before.x) * road.tx + (after.z - before.z) * road.tz) / dt;
  progress.wrongWayTime = velocityAlong < -2 ? progress.wrongWayTime + dt : Math.max(0, progress.wrongWayTime - dt * 3);
  const fraction = crossingFraction(checkpoints[progress.nextCheckpoint], before, after);
  if (fraction !== null && road.distance < track.definition.roadWidth / 2) {
    const crossingTime = elapsed - dt + fraction * dt;
    if (!progress.started) {
      progress.started = true; progress.nextCheckpoint = 1;
    } else if (progress.nextCheckpoint === 0) {
      const lap = crossingTime - progress.lapStart;
      progress.lapTimes.push(lap);
      progress.completedLaps++;
      progress.lapStart = crossingTime;
      progress.splits = [];
      progress.lastSplit = null;
      progress.nextCheckpoint = 1;
      if (progress.completedLaps >= laps) progress.finishTime = crossingTime;
    } else {
      progress.lastSplit = crossingTime - progress.lapStart;
      progress.splits.push(progress.lastSplit);
      progress.nextCheckpoint = (progress.nextCheckpoint + 1) % checkpoints.length;
    }
  }
  const along = relativeProgress(track, after);
  if (!progress.started) {
    // Grid positions live just behind the start rather than nearly a lap ahead.
    progress.distance = along > track.length / 2 ? along - track.length : -0.001;
  } else if (progress.finishTime !== null) progress.distance = laps * track.length;
  else {
    const sector = progress.nextCheckpoint === 0 ? checkpoints.length - 1 : progress.nextCheckpoint - 1;
    const lower = sector / checkpoints.length * track.length;
    const upper = (sector + 1) / checkpoints.length * track.length;
    // A missed gate/reverse detour can never inflate ranking into an unearned sector.
    let fromGate = along - lower;
    if (fromGate > track.length / 2) fromGate -= track.length;
    if (fromGate < -track.length / 2) fromGate += track.length;
    progress.distance = progress.completedLaps * track.length + lower + Math.min(upper - lower - 0.001, fromGate);
  }
}
