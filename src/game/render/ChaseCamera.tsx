import { surfaceHeightAt } from '../tracks/trackSurface';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import { cameraConfig as config } from '../config/kartConfig';
import type { GameRuntime } from './runtime';

export function ChaseCamera({ runtime }: { runtime: GameRuntime }) {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReducedMotion(query.matches);
    query.addEventListener('change', changed); return () => query.removeEventListener('change', changed);
  }, []);
  const vectors = useMemo(() => ({ desired: new Vector3(), target: new Vector3(), look: new Vector3() }), []);
  const lastRevision = useRef(-1);
  const lastMode = useRef(runtime.mode);
  useFrame(({ camera }, delta) => {
    const pose = runtime.simulation.pose;
    const sin = Math.sin(pose.heading);
    const cos = Math.cos(pose.heading);
    const sunshine = runtime.simulation.track.definition.id === 'sunshine-circuit';
    const ground = sunshine ? surfaceHeightAt(runtime.simulation.track, pose) : 0;
    const menu = runtime.mode === 'menu';
    if (menu) {
      vectors.desired.set(pose.x + cos * 8 + sin * 10, 6.8, pose.z - sin * 8 + cos * 10);
      vectors.target.set(pose.x - cos * 3.6 + sin * 1.5, 1.1, pose.z + sin * 3.6 + cos * 1.5);
    } else {
      vectors.desired.set(pose.x - sin * config.distance, config.height + ground + (pose.y - ground) * 0.35, pose.z - cos * config.distance);
      vectors.target.set(pose.x + sin * config.lookAhead, config.lookHeight + ground + (pose.y - ground) * 0.5, pose.z + cos * config.lookAhead);
    }
    const snap = lastRevision.current !== runtime.simulation.revision || (lastMode.current === 'menu' && !menu);
    const dt = Math.min(delta, 0.1);
    if (snap) {
      camera.position.copy(vectors.desired); vectors.look.copy(vectors.target);
    } else if (runtime.mode !== 'paused') {
      camera.position.lerp(vectors.desired, 1 - Math.exp(-config.positionDamping * dt));
      vectors.look.lerp(vectors.target, 1 - Math.exp(-config.targetDamping * dt));
    }
    if (camera instanceof PerspectiveCamera && runtime.mode !== 'paused') {
      const speed = Math.max(0, Math.min(1, (pose.forwardSpeed - 12) / 16));
      const fov = sunshine && !menu && !reducedMotion ? config.fov + speed * 4 + (pose.boostRemaining > 0 ? 1.5 : 0) : config.fov;
      camera.fov = snap ? fov : camera.fov + (fov - camera.fov) * (1 - Math.exp(-3 * dt));
      camera.updateProjectionMatrix();
    }
    camera.lookAt(vectors.look);
    lastRevision.current = runtime.simulation.revision;
    lastMode.current = runtime.mode;
  }, -1);
  return null;
}
