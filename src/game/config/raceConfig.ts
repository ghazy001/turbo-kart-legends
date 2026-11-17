export const raceConfig = {
  laps: 3,
  countdown: 3,
  goDisplay: 1,
  checkpoints: 12,
  maxGateSweep: 2,
  wrongWayDelay: 0.75,
  gridBack: 6,
  gridSpacing: 6,
  gridLane: 1.85,
  recoveryOffset: 2,
  botStuckTime: 4,
  botStuckSpeed: 1.5,
  contactSeparation: 0.002,
  contactIterations: 6,
} as const;
export const aiProfiles = [
  { id: 'breeze', name: 'Breeze', color: '#42c8bc', targetSpeed: 18.8, lane: 1.75 },
  { id: 'nova', name: 'Nova', color: '#ffb84d', targetSpeed: 19.1, lane: -1.75 },
  { id: 'moss', name: 'Moss', color: '#b1d765', targetSpeed: 19.4, lane: 1.75 },
] as const;
export type AIProfile = Omit<typeof aiProfiles[number], 'targetSpeed'> & { readonly targetSpeed: number };
