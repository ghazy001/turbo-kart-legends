/** Shared decorative proportions and matte finish. These never tune collision/handling. */
export const racerStyle = {
  portraitHeight: 2.3,
  seatedCrownHeight: 0.94,
  roughness: 0.85,
  environmentIntensity: 0.25,
  normalStrength: 0.35,
} as const;

/** Inspected Y-up crown/pelvis heights in runtime scene units (Sonic/SpongeBob use offline unit wrappers). */
const sourceHeights = {
  supplied: { crown: 7.133939, pelvis: 3 },
  sonic: { crown: 1.007082, pelvis: 0.37572 },
  arnold: { crown: 2.226009, pelvis: 0.61 },
  spongebob: { crown: 3.156794, pelvis: 0.82 },
  crash: { crown: 1.39055, pelvis: 0.42 },
} as const;

export function seatedRacerScale(id: keyof typeof sourceHeights): number {
  const source = sourceHeights[id];
  return racerStyle.seatedCrownHeight / (source.crown - source.pelvis);
}
