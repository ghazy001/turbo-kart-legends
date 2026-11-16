/** Offline texture cap for supplied GLBs. Uses macOS sips; normal game builds need no image tools. */
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export function imageDimensions(data, mimeType) {
  if (mimeType === 'image/png') return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  if (mimeType === 'image/jpeg') {
    let offset = 2;
    while (offset < data.length) {
      if (data[offset++] !== 0xff) continue;
      const marker = data[offset++];
      if (marker === 0xff || marker === 0xd8 || marker === 0xd9) continue;
      const length = data.readUInt16BE(offset);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { width: data.readUInt16BE(offset + 5), height: data.readUInt16BE(offset + 3) };
      offset += length;
    }
  }
  throw new Error(`Unsupported embedded image: ${mimeType}`);
}

/** Append resized images; optimizeGLB subsequently removes the unused original binary views. */
export async function capGLBTextures(bytes, maxSize) {
  const jsonLength = bytes.readUInt32LE(12), document = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  const binary = bytes.subarray(28 + jsonLength), chunks = [binary], images = [];
  let offset = binary.length;
  const folder = await mkdtemp(join(tmpdir(), 'tkl-textures-'));
  try {
    for (const [index, image] of (document.images ?? []).entries()) {
      const view = document.bufferViews[image.bufferView], source = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
      const before = imageDimensions(source, image.mimeType);
      let result = source;
      if (Math.max(before.width, before.height) > maxSize) {
        const extension = image.mimeType === 'image/png' ? 'png' : 'jpg';
        const input = join(folder, `${index}-source.${extension}`), output = join(folder, `${index}-capped.${extension}`);
        await writeFile(input, source);
        execFileSync('/usr/bin/sips', ['-Z', String(maxSize), input, '--out', output], { stdio: 'pipe' });
        result = await readFile(output);
      }
      const dimensions = imageDimensions(result, image.mimeType), padded = Buffer.alloc(Math.ceil(result.length / 4) * 4); result.copy(padded);
      image.bufferView = document.bufferViews.length;
      document.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: result.length });
      chunks.push(padded); offset += padded.length;
      images.push({ index, mimeType: image.mimeType, sourceWidth: before.width, sourceHeight: before.height, ...dimensions, bytes: result.length, sha256: createHash('sha256').update(result).digest('hex') });
    }
    document.buffers = [{ byteLength: offset }];
    const json = Buffer.from(JSON.stringify(document)), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
    const header = Buffer.from(bytes.subarray(0, 20)), binHeader = Buffer.alloc(8);
    header.writeUInt32LE(28 + padded.length + offset, 8); header.writeUInt32LE(padded.length, 12);
    binHeader.writeUInt32LE(offset); binHeader.write('BIN\0', 4);
    return { bytes: Buffer.concat([header, padded, binHeader, ...chunks]), images };
  } finally { await rm(folder, { recursive: true, force: true }); }
}
