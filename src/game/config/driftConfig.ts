export const driftConfig = {
  minSpeed: 7.5,
  minSteer: 0.16,
  releaseCooldown: 0.35,
  boostRecovery: 0.5,
  steerGrace: 0.3,
  chargeDecay: 0.6,
  lockedSteer: 0.22,
  inputSteer: 0.17,
  yawMultiplier: 1.15,
  lateralGrip: 3.3,
  slipFactor: 0.6,
  maxLateralSpeed: 4,
  overspeedDrag: 10,
  hopImpulse: 3.8,
  gravity: 22,
  landingSquash: 0.12,
  landingDamping: 12,
} as const;

export const boostTiers = [
  { name: 'Spark', charge: 0.65, duration: 0.65, maxSpeed: 24, acceleration: 15, color: '#5de6dd' },
  { name: 'Surge', charge: 1.5, duration: 1.05, maxSpeed: 26, acceleration: 17, color: '#ffd069' },
  { name: 'Flare', charge: 2.6, duration: 1.5, maxSpeed: 28, acceleration: 19, color: '#ed9cff' },
] as const;
