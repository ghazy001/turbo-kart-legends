/** Replay/record policy only; never feeds the driving controller. */
export const timeTrialConfig = {
  version: 1,
  rulesVersion: 'tt-1',
  sampleSeconds: 0.1,
  maxSeconds: 15 * 60,
  maxFrames: 9002,
  maxStorageChars: 1_500_000,
  timeTolerance: 0.0005,
  ghostOpacity: 0.32,
} as const;
