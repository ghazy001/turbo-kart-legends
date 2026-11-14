/** Presentation-only budgets; no relationship to kart physics dimensions. */
export const podiumConfig = {
  duration: 5.5, riseDuration: 1.1, stagger: 0.14, confettiCount: 42, dprMax: 1.25,
  places: [{ x: 0, height: 1.65, color: '#edbe59' }, { x: -4.25, height: 1, color: '#b8d5d6' }, { x: 4.25, height: 0.6, color: '#ce9470' }],
} as const;
