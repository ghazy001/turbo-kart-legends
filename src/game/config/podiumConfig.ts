/** Presentation-only budgets; no relationship to kart physics dimensions. */
export const podiumConfig = {
  duration: 5.5, riseDuration: 1.1, stagger: 0.14, confettiCount: 42, dprMax: 1.25,
  trophy: {
    url: '/assets/props/trophy.glb',
    podium: { position: [2.35, -0.05, 2.65], height: 1.48, standRadius: 0.82 },
    solo: { position: [2.75, -0.05, 0.1], height: 1.12, standRadius: 0.65 },
    standHeight: 0.2, yaw: 0.18,
  },
  places: [{ x: 0, height: 1.65, color: '#edbe59' }, { x: -4.25, height: 1, color: '#b8d5d6' }, { x: 4.25, height: 0.6, color: '#ce9470' }],
} as const;
