import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { optimizeGLB, unpackGLB } from './optimize-assets.mjs';
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('public/assets/items/question-mark-item-box.glb', root));
const { bytes, report } = await optimizeGLB(source, 0.12, 0.005);
await mkdir(new URL('public/assets/optimized/items/', root), { recursive: true });
await writeFile(new URL('public/assets/optimized/items/question-mark-item-box.glb', root), bytes);
await writeFile(new URL('docs/assets/item-box-audit.json', root), JSON.stringify({ source: 'assets/items/question-mark-item-box.glb', runtime: 'assets/optimized/items/question-mark-item-box.glb',
  sourceSha256: createHash('sha256').update(source).digest('hex'), sourceBytes: source.length, runtimeBytes: bytes.length,
  asset: unpackGLB(source).document.asset, skins: 0, clips: 0, ...report }, null, 2) + '\n');
console.log(`Item box: ${report.beforeTriangles} → ${report.afterTriangles} triangles, ${source.length} → ${bytes.length} bytes. Original retained.`);
