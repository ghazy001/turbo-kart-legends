import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace } from 'three';

/** Original deterministic micro-grain, generated once. No downloaded textures or per-frame work. */
export function makeAsphaltTextures() {
  const size = 128, color = new Uint8Array(size * size * 4), relief = new Uint8Array(color.length);
  let seed = 92371;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 0xffffffff;
    const grain = Math.round(160 + noise * 52 + (noise > 0.97 ? 28 : 0));
    color.set([grain, grain + 2, grain + 3, 255], i * 4);
    const bump = Math.round(95 + noise * 75);
    relief.set([bump, bump, bump, 255], i * 4);
  }
  const map = new DataTexture(color, size, size, RGBAFormat), bumpMap = new DataTexture(relief, size, size, RGBAFormat);
  map.colorSpace = SRGBColorSpace;
  for (const texture of [map, bumpMap]) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = 8; texture.minFilter = LinearMipmapLinearFilter; texture.magFilter = LinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true;
  }
  return { map, bumpMap };
}
