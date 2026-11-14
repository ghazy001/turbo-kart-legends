/** Item-only balance. No kart movement, navigation or race-scoring parameters. */
export const itemBalance = {
  weights: {
    leading: { 'spark-bolt': 15, 'banana-trap': 25, 'bubble-guard': 50, 'turbo-charge': 10 },
    middle: { 'spark-bolt': 35, 'banana-trap': 20, 'bubble-guard': 25, 'turbo-charge': 20 },
    trailing: { 'spark-bolt': 40, 'banana-trap': 10, 'bubble-guard': 20, 'turbo-charge': 30 },
  },
  seed: 0x74a91f35,
  useCooldown: 1.1,
  aiReactionSeconds: 0.3,
  aiGuardPrepareSeconds: 3,
  aiGuardPackRange: 24,
  aiBoltLookAhead: 1.1,
  aiTrapLookAhead: 1.6,
  aiTurboLookAhead: 0.75,
  aiTurboMaxSteer: 0.3,
  aiTurboMaxYaw: 0.65,
  hitWindowSeconds: 6,
  repeatHitRetention: 0.75,
  repeatSlowSeconds: 0.45,
  repeatSlowSpeed: 14,
  repeatImmunitySeconds: 3,
} as const;
