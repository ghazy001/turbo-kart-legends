import { AnimationClip, AnimationMixer, LoopOnce, LoopRepeat, type AnimationAction as ThreeAction, type Object3D } from 'three';
import type { AnimationAction, DriverAssetDefinition } from '../../config/visualAssets';
export interface AnimationSignals { steering: number; driftDirection: number; victory: boolean; paused: boolean }
/** Explicit mappings only. Never relabel a walk/T-pose clip as a seated drive. */
export function createDriverAnimator(root: Object3D, clips: readonly AnimationClip[], mapping: DriverAssetDefinition['clips']) {
  const mixer = new AnimationMixer(root), actions = new Map<AnimationAction, ThreeAction>();
  for (const [name, clipName] of Object.entries(mapping ?? {})) {
    const clip = clips.find(item => item.name === clipName);
    if (!clip) continue;
    const action = mixer.clipAction(clip); action.setLoop(name === 'victory' ? LoopOnce : LoopRepeat, name === 'victory' ? 1 : Infinity);
    action.clampWhenFinished = name === 'victory'; actions.set(name as AnimationAction, action);
  }
  let active: ThreeAction | undefined;
  return {
    supported: [...actions.keys()],
    update(delta: number, signal: AnimationSignals) {
      if (signal.paused) return;
      const direction = signal.steering < -0.15 ? 'Left' : signal.steering > 0.15 ? 'Right' : null;
      const candidates: AnimationAction[] = signal.victory ? ['victory', 'idle'] : signal.driftDirection
        ? [signal.driftDirection < 0 ? 'driftLeft' : 'driftRight', 'idle']
        : direction ? [`steer${direction}`, `lean${direction}`, 'idle'] : ['idle'];
      const next = candidates.map(name => actions.get(name)).find(Boolean);
      if (next && next !== active) { active?.fadeOut(0.15); next.reset().fadeIn(0.15).play(); active = next; }
      mixer.update(Math.min(delta, 0.05));
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); },
  };
}
