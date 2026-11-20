import type { AIDifficulty } from './raceOptions';

/** Decision quality varies; every skill still drives the same kart controller. */
export const aiSkills = {
  easy: { cornerMargin: 0.78, braking: 6, lineStrength: 0.45, decisionInterval: 0.4, laneRate: 2.8, passRange: 20, defend: false },
  normal: { cornerMargin: 0.89, braking: 8, lineStrength: 0.8, decisionInterval: 0.22, laneRate: 3.6, passRange: 27, defend: true },
  hard: { cornerMargin: 0.96, braking: 10, lineStrength: 1, decisionInterval: 0.14, laneRate: 4.2, passRange: 32, defend: true },
} as const satisfies Record<AIDifficulty, object>;

export const aiConfig = {
  laneLimit: 2.7, lineLimit: 1.45, laneSeparation: 2.6, alongsideLength: 5,
  passCommitment: 1.35, defendCommitment: 1.1, defendCooldown: 3.5,
  followingGap: 4.5, trafficRange: 36, planningDistance: 60, planningStep: 6,
  lookAheadBase: 5, lookAheadSpeed: 0.42, wideLineLookAheadReduction: 0.3, featureApproach: 32,
  edgeSlowdownStart: 2.9, edgeMinimumSpeed: 9, edgeSpeedFalloff: 12,
} as const;
