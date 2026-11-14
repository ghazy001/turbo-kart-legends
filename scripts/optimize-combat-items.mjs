/** Preserve supplied materials/images/credits; simplify only the ball's geometry. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { optimizeGLB, unpackGLB } from './optimize-assets.mjs';
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('public/assets/items/hutt-ball.glb', root));
const { bytes, report } = await optimizeGLB(source, 0.28, 0.006);
await mkdir(new URL('public/assets/optimized/items/', root), { recursive: true });
await writeFile(new URL('public/assets/optimized/items/hutt-ball.glb', root), bytes);
const document = unpackGLB(source).document;
await writeFile(new URL('docs/assets/combat-item-audit.json', root), JSON.stringify({ source: 'items/hutt-ball.glb', output: 'optimized/items/hutt-ball.glb',
  sourceSha256: createHash('sha256').update(source).digest('hex'), sourceBytes: source.length, outputBytes: bytes.length,
  asset: document.asset, skins: document.skins?.length ?? 0, clips: document.animations?.length ?? 0, errorLimit: 0.00601, ...report }, null, 2) + '\n');
console.log(`Hutt ball: ${report.beforeTriangles} → ${report.afterTriangles} triangles. Images/materials retained; runtime caps textures at 1024px.`);
