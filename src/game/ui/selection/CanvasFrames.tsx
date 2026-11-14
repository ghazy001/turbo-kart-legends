import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/** Scissored views share one renderer. Only render while models/layout are settling. */
export function CanvasFrames({ revision }: { revision: string }) {
  const remaining = useRef(0.6), invalidate = useThree(state => state.invalidate);
  useEffect(() => { remaining.current = 0.6; invalidate(); }, [revision, invalidate]);
  useEffect(() => {
    const refresh = () => { remaining.current = 0.6; invalidate(); };
    window.addEventListener('resize', refresh); window.addEventListener('scroll', refresh, true);
    window.addEventListener('pointerover', refresh); window.addEventListener('pointerout', refresh);
    return () => {
      window.removeEventListener('resize', refresh); window.removeEventListener('scroll', refresh, true);
      window.removeEventListener('pointerover', refresh); window.removeEventListener('pointerout', refresh);
    };
  }, [invalidate]);
  useFrame(({ gl }, delta) => {
    gl.setScissorTest(false); gl.setClearColor(0x000000, 0); gl.clear();
    remaining.current -= Math.min(delta, 0.05);
    if (remaining.current > 0) invalidate();
  }, 0);
  return null;
}
