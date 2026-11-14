import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Matrix4, type InstancedMesh } from 'three';
import type { GameRuntime } from './runtime';

/** Cosmetic protection only: one bounded pool, no new colliders or movement ownership. */
export function BubbleGuardVisuals({ runtime }: { runtime: GameRuntime }) {
  const bubbles = useRef<InstancedMesh>(null), rims = useRef<InstancedMesh>(null), pops = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => ({ matrix: new Matrix4(), rotation: new Matrix4(), scale: new Matrix4() }), []);
  useFrame(() => {
    if (!bubbles.current || !rims.current || !pops.current) return;
    const items = runtime.race.items;
    let count = 0;
    for (const racer of runtime.race.racers) {
      const remaining = items.slot(racer.id)?.shieldRemaining ?? 0;
      if (remaining <= 0 || racer.progress.finishTime !== null) continue;
      const pose = racer.simulation.pose, pulse = 1 + Math.sin(items.time * (remaining < 1.25 ? 12 : 3)) * 0.015;
      scratch.matrix.makeTranslation(pose.x, pose.y + 1.2, pose.z).multiply(scratch.rotation.makeRotationY(pose.heading)).multiply(scratch.scale.makeScale(1.85 * pulse, 1.6 * pulse, 2.1 * pulse));
      bubbles.current.setMatrixAt(count, scratch.matrix);
      for (let ring = 0; ring < 2; ring++) {
        scratch.matrix.makeTranslation(pose.x, pose.y + 1.2, pose.z).multiply(scratch.rotation.makeRotationY(pose.heading + items.time * 0.2));
        if (ring === 0) scratch.matrix.multiply(scratch.rotation.makeRotationX(Math.PI / 2));
        scratch.matrix.multiply(scratch.scale.makeScale(1.85 * pulse, (ring === 0 ? 2.1 : 1.6) * pulse, 1));
        rims.current.setMatrixAt(count * 2 + ring, scratch.matrix);
      }
      count++;
    }
    bubbles.current.count = count; rims.current.count = count * 2;
    let popCount = 0;
    for (let i = items.events.length - 1; i >= 0 && popCount < 4; i--) {
      const event = items.events[i], age = items.time - event.time;
      if (!['guard-break', 'guard-expire'].includes(event.kind) || age > 0.45) continue;
      const scale = 0.6 + age * 4;
      scratch.matrix.makeTranslation(event.x, 0.8 + age, event.z).multiply(scratch.scale.makeScale(scale, scale, scale));
      pops.current.setMatrixAt(popCount++, scratch.matrix);
    }
    pops.current.count = popCount;
    for (const mesh of [bubbles.current, rims.current, pops.current]) mesh.instanceMatrix.needsUpdate = true;
  });
  return <group name="bubble-guards">
    <instancedMesh ref={bubbles} args={[undefined, undefined, 4]} frustumCulled={false} renderOrder={2}>
      <sphereGeometry args={[1, 24, 16]} /><meshBasicMaterial color="#86e8ef" transparent opacity={0.13} depthWrite={false} />
    </instancedMesh>
    <instancedMesh ref={rims} args={[undefined, undefined, 8]} frustumCulled={false} renderOrder={3}>
      <torusGeometry args={[1, 0.014, 4, 48]} /><meshBasicMaterial color="#a4f8ff" transparent opacity={0.8} depthWrite={false} />
    </instancedMesh>
    <instancedMesh ref={pops} args={[undefined, undefined, 4]} frustumCulled={false}>
      <torusGeometry args={[1, 0.025, 4, 32]} /><meshBasicMaterial color="#ccfbff" transparent opacity={0.65} depthWrite={false} />
    </instancedMesh>
  </group>;
}
