/** Race-layer effects only. These values never resize a kart collider or retune handling. */
export const itemConfig = {
  rows: [0.12, 0.44, 0.76], lanes: [-3, 0, 3],
  pickupRadius: 0.55, pickupHeight: 1.05, respawnSeconds: 7,
  fireCooldown: 0.6, projectileSpeed: 38, inheritedSpeed: 0.35,
  projectileRadius: 0.22, projectileHeight: 0.8, projectileLife: 2.2,
  maxProjectiles: 12, maxEvents: 24, wallSweepSpacing: 0.2,
  hitRetention: 0.55, slowSeconds: 0.8, slowSpeed: 12, immunitySeconds: 2.2,
  kartHitBottom: 0.15, kartHitTop: 1.35, aiRange: 34, aiAimWidth: 1.15,
  trapRadius: 0.55, trapHeight: 0.4, trapArmSeconds: 0.65, trapOwnerGrace: 2,
  trapLife: 18, maxTraps: 12, trapDropSkin: 0.3, trapMaxDropHeight: 0.2,
  aiTrapRange: 26, aiTrapWidth: 1.6,
  shieldSeconds: 5, aiGuardLookAhead: 0.85,
  turboTier: 3, turboMinSpeed: 4,
} as const;
export const sparkBolt = { id: 'spark-bolt', name: 'Spark Bolt', color: '#69edee', description: 'A straight spark. A short slowdown.' } as const;
export const bananaTrap = { id: 'banana-trap', name: 'Banana Trap', color: '#ffd562', description: 'Drop behind. Catch a pursuer.' } as const;
export const bubbleGuard = { id: 'bubble-guard', name: 'Bubble Guard', color: '#8be8f5', description: 'Five seconds. One protected hit.' } as const;
export const turboCharge = { id: 'turbo-charge', name: 'Turbo Charge', color: '#ffae63', description: 'A short Flare burst. Find a clear line.' } as const;
export const itemDefinitions = { 'spark-bolt': sparkBolt, 'banana-trap': bananaTrap, 'bubble-guard': bubbleGuard, 'turbo-charge': turboCharge } as const;
export type ItemId = keyof typeof itemDefinitions;
export const itemBoxAsset = { url: '/assets/optimized/items/question-mark-item-box.glb', sourceUrl: '/assets/items/question-mark-item-box.glb', width: 1.15 } as const;
export const combatAssets = {
  'spark-bolt': { url: '/assets/optimized/items/hutt-ball.glb', size: itemConfig.projectileRadius * 2, grounded: false, hiddenNodes: [] },
  'banana-trap': { url: '/assets/items/banana-trap.glb', size: itemConfig.trapRadius * 2, grounded: true, hiddenNodes: ['Object_4'] },
} as const;
export type CombatModelId = keyof typeof combatAssets;
