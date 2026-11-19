import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { sceneConfig } from '../config/kartConfig';
import { AdaptiveResolution } from './models/AdaptiveResolution';
import type { GameRuntime } from './runtime';
export function AdaptiveQuality({ runtime, onChange }: { runtime: GameRuntime; onChange: (dpr: number) => void }) {
  const initialDpr = useThree(state => state.viewport.initialDpr);
  const budget = useMemo(() => new AdaptiveResolution(Math.min(initialDpr, sceneConfig.dprMax)), [initialDpr]);
  useFrame((_, delta) => {
    const dpr = budget.sample(delta, runtime.assetsReady && runtime.mode === 'playing' && runtime.race.phase === 'racing' && !document.hidden);
    if (dpr !== null) onChange(dpr);
  });
  return null;
}
