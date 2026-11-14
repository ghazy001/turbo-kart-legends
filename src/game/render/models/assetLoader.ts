import type { GLTFLoader, GLTFParser } from 'three-stdlib';

interface LegacyMaterial {
  pbrMetallicRoughness?: { baseColorFactor?: number[]; baseColorTexture?: unknown; metallicFactor?: number; roughnessFactor?: number };
  extensions?: Record<string, unknown> & { KHR_materials_pbrSpecularGlossiness?: {
    diffuseFactor?: number[]; diffuseTexture?: unknown; glossinessFactor?: number; specularFactor?: number[]; specularGlossinessTexture?: unknown;
  } };
}
/** The supplied Crash material is a zero-specular diffuse material. Its legacy
 * representation has an exact nonmetal / zero-specular modern equivalent.
 * Complex legacy spec/gloss textures are deliberately NOT approximated silently.
 */
export function adaptDiffuseLegacyMaterials(document: { materials?: LegacyMaterial[] }): void {
  for (const material of document.materials ?? []) {
    const legacy = material.extensions?.KHR_materials_pbrSpecularGlossiness;
    if (!legacy) continue;
    if (legacy.specularGlossinessTexture || (legacy.specularFactor ?? [1, 1, 1]).some(value => value !== 0)) {
      throw new Error('This legacy specular/glossiness asset needs a metallic/roughness conversion before use.');
    }
    material.pbrMetallicRoughness = { baseColorFactor: legacy.diffuseFactor ?? [1, 1, 1, 1],
      baseColorTexture: legacy.diffuseTexture, metallicFactor: 0, roughnessFactor: 1 - (legacy.glossinessFactor ?? 1) };
    if (material.extensions) {
      material.extensions.KHR_materials_specular = { specularFactor: 0 };
      delete material.extensions.KHR_materials_pbrSpecularGlossiness;
    }
  }
}
export function configureAssetLoader(loader: GLTFLoader): void {
  loader.register((parser: GLTFParser) => ({ name: 'KHR_materials_pbrSpecularGlossiness', beforeRoot: () => {
    adaptDiffuseLegacyMaterials(parser.json as { materials?: LegacyMaterial[] }); return null;
  } }));
}
