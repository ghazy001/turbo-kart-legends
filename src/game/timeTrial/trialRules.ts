import { boostTiers, driftConfig } from '../config/driftConfig';
import { kartConfig, loopConfig, sceneConfig } from '../config/kartConfig';
import { raceConfig } from '../config/raceConfig';
import { timeTrialConfig } from '../config/timeTrialConfig';
import type { SampledTrack } from '../core/types';

/** Invalidates obsolete records when sampled roads, timing policy or handling tuning change. */
export function trialRules(track: SampledTrack, laps: number): string {
  const source = JSON.stringify([timeTrialConfig.rulesVersion, laps, track.definition, track.samples,
    kartConfig, driftConfig, boostTiers, loopConfig.step, raceConfig.checkpoints, raceConfig.maxGateSweep,
    raceConfig.gridBack, sceneConfig.railWidth, sceneConfig.railCenterOffset]);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0;
  return `${timeTrialConfig.rulesVersion}:${hash.toString(16)}`;
}
