import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { GameRuntime } from './runtime';
/** A graphics reset pauses safely; restoring the context re-enters the normal preparation gate. */
export function GraphicsContextGuard({ runtime, onLost, onRestored }: { runtime: GameRuntime; onLost: () => void; onRestored: () => void }) {
  const gl = useThree(state => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault(); runtime.assetsReady = false; runtime.race.pause(); runtime.audio.silence();
      runtime.keyboard?.clear(); runtime.gamepad?.clear(); runtime.phone.clear(); runtime.uiInput.clear(); onLost();
    };
    canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('webglcontextrestored', onRestored);
    return () => { canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', onRestored); };
  }, [gl, runtime, onLost, onRestored]);
  return null;
}
