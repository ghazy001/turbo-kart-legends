import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
export interface RenderSample { dpr: number; calls: number; triangles: number; geometries: number; textures: number; medianMs: number; p95Ms: number }
/** Development diagnostics only. Frame intervals include browser scheduling, not just GPU time. */
export function RenderStats({ onSample }: { onSample: (sample: RenderSample) => void }) {
  const samples = useRef<number[]>([]), elapsed = useRef(0);
  useFrame(({ gl }, delta) => {
    if (delta <= 0 || delta > 0.25 || document.hidden) return;
    samples.current.push(delta * 1000); elapsed.current += delta;
    if (elapsed.current < 2) return;
    const sorted = [...samples.current].sort((a, b) => a - b);
    onSample({ dpr: gl.getPixelRatio(), calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
      medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.floor(sorted.length * 0.95)] });
    samples.current = []; elapsed.current = 0;
  });
  return null;
}
