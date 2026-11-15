import { Box3, MeshStandardMaterial, Vector3, type Material } from 'three';
import { racerStyle } from '../../config/racerStyle';

/** Uniform height fitting: an extended hand or accessory must not shrink the body. */
export function racerPortraitFit(bounds: Box3) {
  const size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
  const scale = racerStyle.portraitHeight / Math.max(size.y, 0.01);
  return { scale, position: [-center.x * scale, -bounds.min.y * scale, -center.z * scale] as [number, number, number] };
}

/** Apply only to a cached runtime clone. Keep the original albedo, alpha and texture UVs. */
export function applyRacerSurface(material: Material): void {
  if (!(material instanceof MeshStandardMaterial)) return;
  material.metalness = 0;
  material.roughness = racerStyle.roughness;
  material.metalnessMap = null;
  material.roughnessMap = null;
  material.envMapIntensity = racerStyle.environmentIntensity;
  material.normalScale.multiplyScalar(racerStyle.normalStrength);
  if ('clearcoat' in material) Reflect.set(material, 'clearcoat', 0);
}
