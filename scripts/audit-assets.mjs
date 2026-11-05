import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Box3, Vector3, Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const root = fileURLToPath(new URL('../', import.meta.url));
async function walk(folder) {
  const files = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const name = path.join(folder, entry.name);
    files.push(...entry.isDirectory() ? await walk(name) : [name]);
  }
  return files.sort();
}
function geometryDocument(value) {
  if (Array.isArray(value)) return value.map(geometryDocument);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !key.endsWith('Texture') && !['images', 'textures'].includes(key))
    .map(([key, child]) => [key, geometryDocument(child)]));
  return value;
}
const round = values => values.map(value => Number(value.toFixed(6)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reports = [];
for (const file of await walk(path.join(root, 'public/assets'))) {
  const bytes = await readFile(file);
  const relative = path.relative(path.join(root, 'public'), file).split(path.sep).join('/');
  if (bytes.subarray(0, 4).toString() !== 'glTF') { reports.push({ path: relative, category: 'ignored', reason: 'Not a GLB', bytes: bytes.length }); continue; }
  const size = bytes.readUInt32LE(12);
  const document = JSON.parse(bytes.subarray(20, 20 + size).toString());
  const geometry = geometryDocument(document);
  // Audit geometry independently of the browser's texture decoder / material support.
  if (geometry.extensionsRequired) geometry.extensionsRequired = geometry.extensionsRequired.filter(name => name !== 'KHR_materials_pbrSpecularGlossiness');
  const json = Buffer.from(JSON.stringify(geometry));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const binaryChunk = bytes.subarray(20 + size);
  const glb = Buffer.alloc(20 + padded.length + binaryChunk.length);
  bytes.copy(glb, 0, 0, 20); glb.writeUInt32LE(glb.length, 8); glb.writeUInt32LE(padded.length, 12);
  padded.copy(glb, 20); binaryChunk.copy(glb, 20 + padded.length);
  const loaded = await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '');
  loaded.scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(loaded.scene, true);
  const meshes = [];
  loaded.scene.traverse(node => {
    if (!(node instanceof Mesh)) return;
    const bounds = new Box3().setFromObject(node, true);
    meshes.push({ name: node.name, skinned: Boolean(node.isSkinnedMesh), vertices: node.geometry.attributes.position.count,
      triangles: (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3,
      min: round(bounds.min.toArray()), max: round(bounds.max.toArray()), center: round(bounds.getCenter(new Vector3()).toArray()) });
  });
  const bin = binaryChunk.subarray(8);
  const images = (document.images ?? []).map(image => {
    const view = document.bufferViews[image.bufferView];
    const data = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    const png = data.subarray(1, 4).toString() === 'PNG';
    return { mimeType: image.mimeType, bytes: view.byteLength, width: png ? data.readUInt32BE(16) : null,
      height: png ? data.readUInt32BE(20) : null, sha256: hash(data) };
  });
  const clips = (document.animations ?? []).map((clip, index) => ({ name: clip.name ?? `clip-${index}`, tracks: clip.channels.length,
    duration: Math.max(0, ...clip.samplers.map(sampler => document.accessors[sampler.input].max?.[0] ?? 0)) }));
  reports.push({ path: relative, category: /boat_kart|\/karts\//.test(relative) ? 'kart' : 'racer', bytes: bytes.length, sha256: hash(bytes),
    asset: document.asset, requiredExtensions: document.extensionsRequired ?? [],
    min: round(box.min.toArray()), max: round(box.max.toArray()), size: round(box.getSize(new Vector3()).toArray()),
    triangles: meshes.reduce((sum, mesh) => sum + mesh.triangles, 0), meshes, skins: (document.skins ?? []).map(skin => ({ name: skin.name, joints: skin.joints.map(index => document.nodes[index].name) })),
    clips, images, estimatedTextureMiB: images.reduce((sum, image) => sum + (image.width ?? 0) * (image.height ?? 0) * 4 * 4 / 3, 0) / 1048576,
    materials: document.materials ?? [] });
}
await mkdir(path.join(root, 'docs/assets'), { recursive: true });
await writeFile(path.join(root, 'docs/assets/asset-audit.json'), JSON.stringify(reports, null, 2) + '\n');
for (const report of reports) console.log(report.path, JSON.stringify({ category: report.category, size: report.size, triangles: report.triangles,
  meshes: report.meshes?.length, skins: report.skins?.length, clips: report.clips?.length, textureMiB: report.estimatedTextureMiB, extensions: report.requiredExtensions }));
console.log('Saved docs/assets/asset-audit.json; source assets unchanged.');
