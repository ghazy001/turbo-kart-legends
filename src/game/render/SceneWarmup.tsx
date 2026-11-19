import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { warmScene, type PreparationProgress } from './models/sceneWarmup';
export function SceneWarmup({ enabled, onProgress, onReady, onError }: { enabled: boolean; onProgress: (progress: PreparationProgress) => void; onReady: () => void; onError: (message: string) => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void warmScene(gl, scene, camera, controller.signal, onProgress).then(() => { if (!controller.signal.aborted) onReady(); }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      console.error('Unable to prepare graphics', error); onError('Graphics could not be prepared. Reload the game or return to the menu.');
    });
    return () => controller.abort();
  }, [enabled, gl, scene, camera, onProgress, onReady, onError]);
  return null;
}
