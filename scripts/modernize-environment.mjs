import { unpackGLB } from './optimize-assets.mjs';

/** Art-directed matte conversion for these inspected legacy sources only.
 * Preserves diffuse/normal/UV data and original embedded credits. This is not
 * an exact physical specular/glossiness conversion; unused specular images remain.
 */
export function modernizeEnvironment(bytes, id) {
  if (id !== 'cartoon-volcano' && id !== 'dinosaur' && id !== 'snow-wolf') return bytes;
  const { document, binary } = unpackGLB(bytes);
  for (const material of document.materials ?? []) {
    const legacy = material.extensions?.KHR_materials_pbrSpecularGlossiness;
    if (!legacy) continue;
    material.pbrMetallicRoughness = { baseColorFactor: legacy.diffuseFactor ?? [1, 1, 1, 1],
      baseColorTexture: legacy.diffuseTexture, metallicFactor: 0, roughnessFactor: 0.85 };
    delete material.extensions.KHR_materials_pbrSpecularGlossiness;
  }
  for (const key of ['extensionsUsed', 'extensionsRequired']) if (document[key]) document[key] = document[key].filter(name => name !== 'KHR_materials_pbrSpecularGlossiness');
  document.extras = { ...document.extras, turboKartMaterialConversion: 'Matte nonmetal diffuse conversion; legacy specular/glossiness intentionally omitted.' };
  const json = Buffer.from(JSON.stringify(document)), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const header = Buffer.from(bytes.subarray(0, 20)), chunk = Buffer.alloc(8);
  header.writeUInt32LE(28 + padded.length + binary.length, 8); header.writeUInt32LE(padded.length, 12);
  chunk.writeUInt32LE(binary.length); chunk.write('BIN\0', 4);
  return Buffer.concat([header, padded, chunk, binary]);
}
