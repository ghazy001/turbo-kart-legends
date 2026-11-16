import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { unpackGLB, readAccessor } from './optimize-assets.mjs';

const reports = JSON.parse(readFileSync(new URL('../docs/assets/optimization-report.json', import.meta.url)));
const combatItem = JSON.parse(readFileSync(new URL('../docs/assets/combat-item-audit.json', import.meta.url)));
reports.push(combatItem);
const item = JSON.parse(readFileSync(new URL('../docs/assets/item-box-audit.json', import.meta.url)));
reports.push({ ...item, source: item.source.replace('assets/', ''), output: item.runtime.replace('assets/', ''), outputBytes: item.runtimeBytes, errorLimit: 0.00501 });
const imageBytes = ({ document, binary }, image) => {
  const view = document.bufferViews[image.bufferView];
  return binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
};
describe('offline GLB derivatives', () => {
  for (const report of reports) it(`${report.source}: topology valid, source/credits/materials/UVs/bindings retained`, () => {
    const source = readFileSync(new URL(`../public/assets/${report.source}`, import.meta.url));
    const optimized = readFileSync(new URL(`../public/assets/${report.output}`, import.meta.url));
    expect(createHash('sha256').update(source).digest('hex')).toBe(report.sourceSha256);
    const original = unpackGLB(source), result = unpackGLB(optimized), a = original.document, b = result.document;
    expect(b.asset).toEqual(a.asset);
    if (report.sceneScale) {
      expect(JSON.stringify(b.nodes.slice(0, a.nodes.length))).toBe(JSON.stringify(a.nodes));
      expect(b.nodes).toHaveLength(a.nodes.length + a.scenes.length);
      for (const [i, scene] of a.scenes.entries()) {
        const wrapper = a.nodes.length + i;
        expect(b.scenes[i]).toEqual({ ...scene, nodes: [wrapper] });
        expect(b.nodes[wrapper]).toEqual({ name: 'Runtime unit normalization', scale: Array(3).fill(report.sceneScale), children: scene.nodes });
      }
    } else { expect(JSON.stringify(b.nodes)).toBe(JSON.stringify(a.nodes)); expect(b.scenes).toEqual(a.scenes); }
    expect(b.materials).toEqual(a.materials); expect(b.textures).toEqual(a.textures);
    expect(b.animations?.length ?? 0).toBe(a.animations?.length ?? 0);
    for (const [i, image] of (a.images ?? []).entries()) expect(imageBytes(result, b.images[i]).equals(imageBytes(original, image))).toBe(true);
    for (const [i, skin] of (a.skins ?? []).entries()) {
      expect(b.skins[i].joints).toEqual(skin.joints);
      expect(readAccessor(b, result.binary, b.skins[i].inverseBindMatrices)).toEqual(readAccessor(a, original.binary, skin.inverseBindMatrices));
    }
    for (const [mi, mesh] of a.meshes.entries()) for (const [pi, primitive] of mesh.primitives.entries()) {
      const next = b.meshes[mi].primitives[pi];
      expect(next.material).toBe(primitive.material);
      expect(Object.keys(next.attributes)).toEqual(Object.keys(primitive.attributes));
      const positions = readAccessor(b, result.binary, next.attributes.POSITION), indices = readAccessor(b, result.binary, next.indices);
      expect(indices.length % 3).toBe(0);
      for (const index of indices) if (index >= positions.length / 3) throw new Error('Invalid index');
      for (const index of Object.values(next.attributes)) expect(b.accessors[index].count).toBe(positions.length / 3);
      // Every retained UV/normal/position tuple must be an exact source vertex.
      const semantics = Object.keys(primitive.attributes), before = semantics.map(key => readAccessor(a, original.binary, primitive.attributes[key]));
      const after = semantics.map(key => readAccessor(b, result.binary, next.attributes[key]));
      const sourceCount = a.accessors[primitive.attributes.POSITION].count;
      const sizes = before.map(buffer => buffer.length / sourceCount);
      const tuple = (buffers, vertex) => buffers.flatMap((buffer, i) => Array.from(buffer.subarray(vertex * sizes[i], (vertex + 1) * sizes[i]))).join(',');
      const originals = new Set(Array.from({ length: sourceCount }, (_, v) => tuple(before, v)));
      for (let v = 0; v < positions.length / 3; v++) if (!originals.has(tuple(after, v))) throw new Error('Vertex attributes changed');
    }
    expect(report.afterTriangles).toBeLessThanOrEqual(report.beforeTriangles);
    expect(report.maxRelativeError).toBeLessThanOrEqual(report.errorLimit ?? 0.00151);
    // Exhaustive source-vertex tuples are CPU-bound; keep assertions intact on slower CI hosts.
  }, 60000);
  it('reduces the selectable geometry budget by at least 20 percent', () => {
    const sum = key => reports.reduce((total, report) => total + report[key], 0);
    expect(sum('afterTriangles')).toBeLessThan(sum('beforeTriangles') * 0.8);
    expect(sum('outputBytes')).toBeLessThan(sum('sourceBytes'));
  });
});
