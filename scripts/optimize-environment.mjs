import { thinTreeLeaves } from './thin-tree-leaves.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { optimizeGLB } from './optimize-assets.mjs';
import { capGLBTextures } from './glb-textures.mjs';
const definitions = [
  ['gas-station', 'gas-station', 0.7, 0.002, 1024],
  ['tire-wall', 'tire-wall', 0.65, 0.002, 512],
  ['spectators', 'spectators', 1, 0.001, 1024],
  ['stylized-tree', 'stylized-tree', 0.08, 0.025, 512],
  ['stylized-tree', 'stylized-tree-far', 0.025, 0.06, 256],
  ['viking-house', 'viking-house', 0.5, 0.002, 1024],
  ['cactus', 'cactus', 1, 0.001, 512],
];
const report = [];
for (const [source, output, ratio, error, textureCap] of definitions) {
  const original = await readFile(new URL(`../public/assets/environment/${source}.glb`, import.meta.url));
  const capped = await capGLBTextures(original, textureCap);
  const tree = source === 'stylized-tree';
  const result = await optimizeGLB(tree ? thinTreeLeaves(capped.bytes, output.endsWith('-far') ? 0.15 : 0.45, output.endsWith('-far') ? 2.1 : 1.4) : capped.bytes, ratio, error, 1, tree ? { flags: ['Permissive'], spatial: true, preserveLeaves: true, compact: true } : {});
  await writeFile(new URL(`../public/assets/optimized/environment/${output}.glb`, import.meta.url), result.bytes);
  const entry = { source, output, sourceSha256: createHash('sha256').update(original).digest('hex'), sourceBytes: original.length, outputBytes: result.bytes.length, textureCap, images: capped.images, ...result.report }; report.push(entry);
  console.log(output, JSON.stringify(entry));
}
await writeFile(new URL('../docs/assets/environment-optimization.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
