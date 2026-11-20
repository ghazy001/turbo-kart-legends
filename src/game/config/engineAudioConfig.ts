/** Sound-only tuning. It never changes kart performance or driving input. */
export const engineAudioConfig = {
  cycleSamples: 1024, updatesPerSecond: 30,
  idleHz: 52, speedHz: 148, throttleHz: 24, boostHz: 18,
  idleGain: 0.16, speedGain: 0.1, throttleGain: 0.25, boostGain: 0.025,
  idleCutoff: 650, speedCutoff: 1000, throttleCutoff: 1200, boostCutoff: 300,
  bodyMix: 0.82, detailMix: 0.15, detailRatio: 2.006,
  pitchDamping: 0.09, volumeDamping: 0.045, filterDamping: 0.08,
} as const;
