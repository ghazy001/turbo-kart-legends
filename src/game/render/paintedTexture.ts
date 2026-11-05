import { CanvasTexture, SRGBColorSpace } from 'three';

/** Locally generated signage; no remote fonts, textures, or copied artwork. */
export function paintedTexture(title: string, background: string, foreground: string, subtitle?: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is required for circuit signage.');
  ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = foreground; ctx.textAlign = 'center';
  ctx.font = 'italic 900 100px Arial'; ctx.fillText(title, 512, subtitle ? 132 : 164);
  if (subtitle) { ctx.font = 'bold 30px Arial'; ctx.fillText(subtitle, 512, 202); }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
