/** Offline, repeatable index/vertex reduction. Originals and embedded credits stay intact. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';
import { capGLBTextures } from './glb-textures.mjs';

const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const arrays = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
export function unpackGLB(bytes) {
  if (bytes.toString('utf8', 0, 4) !== 'glTF') throw new Error('Expected GLB 2.0');
  const length = bytes.readUInt32LE(12);
  return { document: JSON.parse(bytes.toString('utf8', 20, 20 + length)), binary: bytes.subarray(28 + length) };
}
export function readAccessor(document, binary, index) {
  const accessor = document.accessors[index], view = document.bufferViews[accessor.bufferView];
  if (accessor.sparse) throw new Error('Sparse geometry needs an explicit conversion');
  const ArrayType = arrays[accessor.componentType], size = components[accessor.type];
  if (!ArrayType || !size) throw new Error('Unsupported accessor layout');
  const width = size * ArrayType.BYTES_PER_ELEMENT, stride = view.byteStride ?? width;
  const data = Buffer.alloc(accessor.count * width), offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  for (let i = 0; i < accessor.count; i++) binary.copy(data, i * width, offset + i * stride, offset + i * stride + width);
  return new ArrayType(data.buffer.slice(data.byteOffset, data.byteOffset + data.length));
}
export async function optimizeGLB(bytes, ratio = 0.55, error = 0.0015, sceneScale = 1) {
  await MeshoptSimplifier.ready;
  const { document: doc, binary } = unpackGLB(bytes), output = structuredClone(doc);
  if (sceneScale !== 1) for (const scene of output.scenes ?? []) {
    const wrapper = output.nodes.length;
    output.nodes.push({ name: 'Runtime unit normalization', scale: [sceneScale, sceneScale, sceneScale], children: scene.nodes });
    scene.nodes = [wrapper];
  }
  const chunks = [], views = [], accessors = [], cached = new Map(); let offset = 0;
  const addView = (data, target) => {
    const padded = Buffer.alloc(Math.ceil(data.byteLength / 4) * 4); Buffer.from(data.buffer, data.byteOffset, data.byteLength).copy(padded);
    const index = views.length; views.push({ buffer: 0, byteOffset: offset, byteLength: data.byteLength, ...(target ? { target } : {}) });
    chunks.push(padded); offset += padded.length; return index;
  };
  const addAccessor = (sourceIndex, data, target) => {
    const source = doc.accessors[sourceIndex], next = { ...source, bufferView: addView(data, target), count: data.length / components[source.type] };
    delete next.byteOffset;
    if (source.min || source.max) {
      next.min = Array(components[source.type]).fill(Infinity); next.max = next.min.map(() => -Infinity);
      for (let i = 0; i < data.length; i++) { const c = i % next.min.length; next.min[c] = Math.min(next.min[c], data[i]); next.max[c] = Math.max(next.max[c], data[i]); }
    }
    accessors.push(next); return accessors.length - 1;
  };
  const copyAccessor = index => {
    if (!cached.has(index)) cached.set(index, addAccessor(index, readAccessor(doc, binary, index), doc.bufferViews[doc.accessors[index].bufferView].target));
    return cached.get(index);
  };
  const report = { beforeTriangles: 0, afterTriangles: 0, simplifiedPrimitives: 0, maxRelativeError: 0 };
  for (const mesh of output.meshes ?? []) for (const primitive of mesh.primitives) {
    const originalIndices = primitive.indices;
    const indices = originalIndices === undefined ? null : Uint32Array.from(readAccessor(doc, binary, originalIndices));
    const count = indices?.length ?? doc.accessors[primitive.attributes.POSITION].count;
    report.beforeTriangles += count / 3;
    // Skins, morph targets and small parts retain their complete topology/bindings.
    const canSimplify = indices && (primitive.mode ?? 4) === 4 && count >= 3600 && !primitive.targets && primitive.attributes.JOINTS_0 === undefined;
    let simplified = null;
    if (canSimplify) {
      const positions = readAccessor(doc, binary, primitive.attributes.POSITION);
      if (!(positions instanceof Float32Array)) throw new Error('Expected float positions');
      const attributes = ['NORMAL', 'TEXCOORD_0'].filter(key => primitive.attributes[key] !== undefined);
      const buffers = attributes.map(key => readAccessor(doc, binary, primitive.attributes[key]));
      const sizes = attributes.map(key => components[doc.accessors[primitive.attributes[key]].type]);
      const stride = sizes.reduce((sum, size) => sum + size, 0), vertexCount = positions.length / 3;
      const values = new Float32Array(vertexCount * stride), weights = attributes.flatMap((key, i) => Array(sizes[i]).fill(key === 'NORMAL' ? 0.25 : 0.5));
      for (let v = 0; v < vertexCount; v++) { let c = 0; buffers.forEach((buffer, a) => { for (let k = 0; k < sizes[a]; k++) values[v * stride + c++] = buffer[v * sizes[a] + k]; }); }
      // Keep silhouette extrema and open borders: pivots/contact bounds must not shrink.
      const lock = new Uint8Array(vertexCount);
      for (let axis = 0; axis < 3; axis++) {
        let lo = 0, hi = 0;
        for (let v = 1; v < vertexCount; v++) { if (positions[v * 3 + axis] < positions[lo * 3 + axis]) lo = v; if (positions[v * 3 + axis] > positions[hi * 3 + axis]) hi = v; }
        lock[lo] = 1; lock[hi] = 1;
      }
      const [result, actualError] = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, values, stride, weights, lock, Math.floor(count * ratio / 3) * 3, error, ['LockBorder']);
      if (result.length < count) { simplified = result; report.maxRelativeError = Math.max(report.maxRelativeError, actualError); }
    }
    if (simplified) {
      const [remap, unique] = MeshoptSimplifier.compactMesh(simplified);
      for (const [semantic, index] of Object.entries(primitive.attributes)) {
        const old = readAccessor(doc, binary, index), size = components[doc.accessors[index].type], data = new old.constructor(unique * size);
        for (let v = 0; v < remap.length; v++) if (remap[v] !== 0xffffffff) for (let c = 0; c < size; c++) data[remap[v] * size + c] = old[v * size + c];
        primitive.attributes[semantic] = addAccessor(index, data, 34962);
      }
      const IndexArray = arrays[doc.accessors[originalIndices].componentType];
      primitive.indices = addAccessor(originalIndices, IndexArray.from(simplified), 34963);
      report.afterTriangles += simplified.length / 3; report.simplifiedPrimitives++;
    } else {
      for (const [key, index] of Object.entries(primitive.attributes)) primitive.attributes[key] = copyAccessor(index);
      if (originalIndices !== undefined) primitive.indices = copyAccessor(originalIndices);
      for (const target of primitive.targets ?? []) for (const [key, index] of Object.entries(target)) target[key] = copyAccessor(index);
      report.afterTriangles += count / 3;
    }
  }
  for (const skin of output.skins ?? []) if (skin.inverseBindMatrices !== undefined) skin.inverseBindMatrices = copyAccessor(skin.inverseBindMatrices);
  for (const animation of output.animations ?? []) for (const sampler of animation.samplers) { sampler.input = copyAccessor(sampler.input); sampler.output = copyAccessor(sampler.output); }
  for (const image of output.images ?? []) if (image.bufferView !== undefined) { const view = doc.bufferViews[image.bufferView]; image.bufferView = addView(binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)); }
  output.accessors = accessors; output.bufferViews = views; output.buffers = [{ byteLength: offset }];
  const json = Buffer.from(JSON.stringify(output)), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const header = Buffer.alloc(20); header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + offset, 8); header.writeUInt32LE(padded.length, 12); header.write('JSON', 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(offset); binHeader.write('BIN\0', 4);
  return { bytes: Buffer.concat([header, padded, binHeader, ...chunks]), report };
}

const sources = [
  ['karts/my-kart.glb', 0.6], ['karts/go_kart_64.glb', 0.4], ['karts/mario_kart_ds.glb', 0.6],
  ['characters/nickelodeon_kart_racers_3_spongebob_boat_kart.glb', 0.6],
  ['characters/my-character.glb', 0.65], ['characters/nickelodeon_kart_racers_3_aang.glb', 0.65],
  ['characters/nickelodeon_kart_racers_3_arnold.glb', 0.65], ['characters/nickelodeon_kart_racers_3_spongebob.glb', 0.65], ['characters/crash_bandicoot_cartoon.glb', 0.65],
  ['characters/movie_sonic_sonic_rumble.glb', 1, 100],
  ['characters/the_spongebob_squarepants.glb', 1, 0.01, 1024],
];
export async function generateAssets() {
  const root = new URL('../public/assets/', import.meta.url), reports = [];
  for (const [source, ratio, sceneScale = 1, textureMaxSize] of sources) {
    const original = await readFile(new URL(source, root));
    const capped = textureMaxSize ? await capGLBTextures(original, textureMaxSize) : null;
    const { bytes, report } = await optimizeGLB(capped?.bytes ?? original, ratio, 0.0015, sceneScale);
    const target = new URL(`optimized/${source}`, root); await mkdir(new URL('.', target), { recursive: true }); await writeFile(target, bytes);
    const result = { source, output: `optimized/${source}`, sourceSha256: createHash('sha256').update(original).digest('hex'), sourceBytes: original.length, outputBytes: bytes.length, ratio, ...(sceneScale === 1 ? {} : { sceneScale }), ...(capped ? { textureMaxSize, images: capped.images } : {}), ...report };
    reports.push(result); console.log(`${source}: ${report.beforeTriangles} → ${report.afterTriangles} triangles; ${original.length} → ${bytes.length} bytes`);
  }
  await writeFile(new URL('../docs/assets/optimization-report.json', import.meta.url), JSON.stringify(reports, null, 2) + '\n');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await generateAssets();
