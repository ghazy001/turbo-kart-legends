/** Item-only balance. No kart movement, navigation or race-scoring parameters. */
export const itemBalance = {
  weights: {
    leading: { 'spark-bolt': 20, 'banana-trap': 25, 'bubble-guard': 55 },
    middle: { 'spark-bolt': 45, 'banana-trap': 25, 'bubble-guard': 30 },
    trailing: { 'spark-bolt': 65, 'banana-trap': 10, 'bubble-guard': 25 },
  },
  seed: 0x74a91f35,
  useCooldown: 1.1,
  aiReactionSeconds: 0.3,
  aiGuardPrepareSeconds: 3,
  aiGuardPackRange: 24,
  aiBoltLookAhead: 1.1,
  aiTrapLookAhead: 1.6,
  hitWindowSeconds: 6,
  repeatHitRetention: 0.75,
  repeatSlowSeconds: 0.45,
  repeatSlowSpeed: 14,
  repeatImmunitySeconds: 3,
} as const;
