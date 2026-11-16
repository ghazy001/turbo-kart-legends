/** Shared by supplied pump placement and its paving; decoration only, never a collider. */
export const sunshineServiceAreas = [
  { id: 'east-service', asset: 'gas-station', fraction: 0.085, offset: 14.5, rotation: 0, paving: [7, 10] },
  { id: 'west-service', asset: 'lowpoly-gas-station', fraction: 0.61, offset: 23, rotation: Math.PI, paving: [22, 15] },
] as const;
