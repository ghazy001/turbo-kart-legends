/** Shared item/pad turbo and ramp landing tuning; no charge or manual hop mechanic. */
export const boostConfig = { boostRecovery: 0.5, overspeedDrag: 10, maxLateralSpeed: 4 } as const;
export const jumpConfig = { gravity: 22, landingSquash: 0.12, landingDamping: 12 } as const;

export const boostTiers = [
  { name: 'Spark', duration: 0.65, maxSpeed: 24, acceleration: 15, color: '#5de6dd' },
  { name: 'Surge', duration: 1.05, maxSpeed: 26, acceleration: 17, color: '#ffd069' },
  { name: 'Flare', duration: 1.5, maxSpeed: 28, acceleration: 19, color: '#ed9cff' },
] as const;
