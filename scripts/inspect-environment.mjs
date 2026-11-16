import { readFile, writeFile } from 'node:fs/promises';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { unpackGLB } from './optimize-assets.mjs';
import { imageDimensions } from './glb-textures.mjs';
import { createHash } from 'node:crypto';
const names = ['gas-station', 'tire-wall', 'spectators', 'stylized-tree'];
export async function environmentGeometry(bytes) {
  const length = bytes.readUInt32LE(12), document = JSON.parse(bytes.toString('utf8', 20, 20 + length));
  const strip = value => {
    if (Array.isArray(value)) return value.map(strip);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !key.endsWith('Texture') && !['images', 'textures'].includes(key)).map(([key, child]) => [key, strip(child)]));
    return value;
  };
  const json = Buffer.from(JSON.stringify(strip(document))), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const chunk = bytes.subarray(20 + length), result = Buffer.alloc(20 + padded.length + chunk.length);
  bytes.copy(result, 0, 0, 20); result.writeUInt32LE(result.length, 8); result.writeUInt32LE(padded.length, 12); padded.copy(result, 20); chunk.copy(result, 20 + padded.length);
  return new GLTFLoader().parseAsync(result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength), '');
}
export async function inspectEnvironment() {
  const report = [];
  for (const name of names) {
    const bytes = await readFile(new URL(`../public/assets/environment/${name}.glb`, import.meta.url)), { document, binary } = unpackGLB(bytes);
    const gltf = await environmentGeometry(bytes); gltf.scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(gltf.scene), meshes = [];
    gltf.scene.traverse(node => { if (node instanceof Mesh) meshes.push({ name: node.name, triangles: (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3 }); });
    const images = (document.images ?? []).map(image => { const view = document.bufferViews[image.bufferView]; return imageDimensions(binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength), image.mimeType); });
    report.push({ id: name, metadata: document.asset, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, min: box.min.toArray(), max: box.max.toArray(), size: box.getSize(new Vector3()).toArray(), skins: gltf.scene.getObjectsByProperty('isSkinnedMesh', true).length, clips: gltf.animations.map(a => a.name), images, meshes });
  }
  await writeFile(new URL('../docs/assets/environment-audit.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  for (const r of report) console.log(r.id, 'size:', r.size, 'images:', r.images, 'triangles:', r.meshes.reduce((sum, m) => sum + m.triangles, 0));
}
if (process.argv[1]?.endsWith('/inspect-environment.mjs')) await inspectEnvironment();
