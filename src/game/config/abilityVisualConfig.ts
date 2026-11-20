/** Presentation only. Never used by item queries, timers, handling or collision. */
export const abilityVisualConfig = {
  colors: { electric: '#67eaff', ice: '#c9fbff', guard: '#63dce9', violet: '#9c91ff', trap: '#ffd36b', impact: '#fff0bd' },
  guard: { radius: [1.85, 1.6, 2.1], height: 1.2, rings: 3, segments: 48 },
  bursts: { capacity: 8, particles: 10 },
  bolt: { filaments: 9, length: 3.1, rings: 3 },
  kart: { wake: 12 },
} as const;
