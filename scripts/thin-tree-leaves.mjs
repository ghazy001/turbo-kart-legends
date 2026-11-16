import { readAccessor, unpackGLB } from './optimize-assets.mjs';

/** Preserve whole disconnected source leaf cards, not arbitrary individual triangles. */
export function thinTreeLeaves(bytes, retention, leafScale = 1) {
  const { document, binary } = unpackGLB(bytes), chunks = [binary]; let offset = binary.length;
  const append = (primitive, indices) => {
    const data = Buffer.from(Uint32Array.from(indices).buffer);
    const view = document.bufferViews.length; document.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.length, target: 34963 });
    primitive.indices = document.accessors.length; document.accessors.push({ bufferView: view, componentType: 5125, count: indices.length, type: 'SCALAR' });
    chunks.push(data); offset += data.length;
  };
  for (const mesh of document.meshes) for (const primitive of mesh.primitives) {
    const positions = readAccessor(document, binary, primitive.attributes.POSITION), count = positions.length / 3;
    const indices = primitive.indices === undefined ? Uint32Array.from({ length: count }, (_, i) => i) : readAccessor(document, binary, primitive.indices);
    if (!/leaf/i.test(document.materials[primitive.material]?.name ?? '')) { if (primitive.indices === undefined) append(primitive, indices); continue; }
    const parent = Int32Array.from({ length: count }, (_, i) => i), vertices = new Map();
    const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const union = (a, b) => { parent[find(a)] = find(b); };
    for (let i = 0; i < count; i++) {
      const key = [0, 1, 2].map(axis => Math.round(positions[i * 3 + axis] * 100000)).join(',');
      const other = vertices.get(key); if (other !== undefined) union(i, other); else vertices.set(key, i);
    }
    for (let i = 0; i < indices.length; i += 3) { union(indices[i], indices[i + 1]); union(indices[i], indices[i + 2]); }
    const components = new Map();
    for (let i = 0; i < indices.length; i += 3) { const key = find(indices[i]); if (!components.has(key)) components.set(key, []); components.get(key).push(indices[i], indices[i + 1], indices[i + 2]); }
    const extrema = new Set();
    for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
      let best = 0; for (let i = 1; i < count; i++) if (positions[i * 3 + axis] * sign > positions[best * 3 + axis] * sign) best = i;
      extrema.add(find(best));
    }
    const kept = [], expansion = new Set(); let i = 0;
    for (const [key, component] of components) {
      const sample = ((Math.imul(++i, 2654435761) >>> 0) / 0xffffffff);
      if (sample <= retention || extrema.has(key)) {
        kept.push(...component);
        if (!extrema.has(key)) {
          const unique = [...new Set(component)], center = [0, 1, 2].map(axis => unique.reduce((sum, vertex) => sum + positions[vertex * 3 + axis], 0) / unique.length);
          for (const vertex of unique) for (let axis = 0; axis < 3; axis++) positions[vertex * 3 + axis] = center[axis] + (positions[vertex * 3 + axis] - center[axis]) * leafScale;
          unique.forEach(vertex => expansion.add(vertex));
        }
      }
    }
    console.log(mesh.name, components.size, 'leaf components;', indices.length / 3, '→', kept.length / 3, 'triangles');
    if (expansion.size) {
      const accessor = document.accessors[primitive.attributes.POSITION];
      // Clamp enlarged retained cards to the original silhouette envelope.
      for (const vertex of expansion) for (let axis = 0; axis < 3; axis++) positions[vertex * 3 + axis] = Math.max(accessor.min[axis], Math.min(accessor.max[axis], positions[vertex * 3 + axis]));
      const data = Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength);
      const positionView = document.bufferViews.length; document.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.length, target: 34962 }); chunks.push(data); offset += data.length;
      primitive.attributes.POSITION = document.accessors.length; document.accessors.push({ ...accessor, bufferView: positionView, byteOffset: 0 });
    }
    append(primitive, kept);
  }
  document.buffers = [{ byteLength: offset }];
  const json = Buffer.from(JSON.stringify(document)), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const header = Buffer.from(bytes.subarray(0, 20)), binHeader = Buffer.alloc(8);
  header.writeUInt32LE(28 + padded.length + offset, 8); header.writeUInt32LE(padded.length, 12); binHeader.writeUInt32LE(offset); binHeader.write('BIN\0', 4);
  return Buffer.concat([header, padded, binHeader, ...chunks]);
}
