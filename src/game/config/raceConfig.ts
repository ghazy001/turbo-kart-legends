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
  racerRadius: 1.55,
  contactIterations: 6,
  maxCatchUpSpeed: 1.2,
  maxSlowdownSpeed: 0.6,
} as const;
export const aiProfiles = [
  { id: 'breeze', name: 'Breeze', color: '#42c8bc', targetSpeed: 15.7, lane: 1.75 },
  { id: 'nova', name: 'Nova', color: '#ffb84d', targetSpeed: 16.4, lane: -1.75 },
  { id: 'moss', name: 'Moss', color: '#b1d765', targetSpeed: 17.1, lane: 1.75 },
] as const;
export type AIProfile = typeof aiProfiles[number];
