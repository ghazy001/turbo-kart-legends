/** Rendering/loading budgets only. Never used by the racing simulation. */
export const performanceConfig = {
  dprSteps: [1, 1.25, 1.5], sampleSeconds: 2, slowMs: 23, fastMs: 17,
  slowWindows: 2, fastWindows: 5, changeCooldown: 10, startGrace: 4,
  texturesPerFrame: 3, revealMs: 220,
} as const;
