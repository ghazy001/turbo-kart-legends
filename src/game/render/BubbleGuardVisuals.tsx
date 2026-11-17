import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, FrontSide, Object3D, type InstancedMesh, type ShaderMaterial } from 'three';
import { abilityVisualConfig as visuals } from '../config/abilityVisualConfig';
import { guardFragmentShader, guardVertexShader } from './effects/guardShader';
import type { GameRuntime } from './runtime';

/** Cosmetic protection: a transparent Fresnel shell and three moving energy arcs. */
export function BubbleGuardVisuals({ runtime }: { runtime: GameRuntime }) {
  const bubbles = useRef<InstancedMesh>(null), rims = useRef<InstancedMesh>(null), shader = useRef<ShaderMaterial>(null);
  const scratch = useMemo(() => ({ dummy: new Object3D(), color: new Color(), violet: new Color(visuals.colors.violet), motion: window.matchMedia('(prefers-reduced-motion: reduce)') }), []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uMotion: { value: 1 } }), []);
  useFrame(() => {
    if (!bubbles.current || !rims.current) return;
    const items = runtime.race.items, reduced = scratch.motion.matches;
    if (shader.current) { uniforms.uTime.value = items.time; uniforms.uMotion.value = reduced ? 0 : 1; }
    let count = 0;
    for (const racer of runtime.race.racers) {
      const remaining = items.slot(racer.id)?.shieldRemaining ?? 0;
      if (remaining <= 0 || racer.progress.finishTime !== null || count >= 4) continue;
      const pose = racer.simulation.pose, pulse = reduced ? 1 : 1 + Math.sin(items.time * 3) * 0.012;
      const [rx, ry, rz] = visuals.guard.radius;
      scratch.dummy.position.set(pose.x, pose.y + visuals.guard.height, pose.z);
      scratch.dummy.rotation.set(0, pose.heading, 0);
      scratch.dummy.scale.set(rx * pulse, ry * pulse, rz * pulse); scratch.dummy.updateMatrix();
      bubbles.current.setMatrixAt(count, scratch.dummy.matrix);
      scratch.color.set(visuals.colors.guard).lerp(scratch.violet, Math.max(0, 1 - remaining / 1.25) * 0.65);
      bubbles.current.setColorAt(count, scratch.color);
      for (let ring = 0; ring < visuals.guard.rings; ring++) {
        const angle = (reduced ? 0 : items.time * 0.45) + ring * Math.PI * 2 / 3;
        scratch.dummy.rotation.set(Math.PI / 2 + Math.sin(angle) * 0.55, pose.heading + angle, ring * 0.65);
        scratch.dummy.scale.set(rx * pulse, rz * pulse, 1); scratch.dummy.updateMatrix();
        rims.current.setMatrixAt(count * visuals.guard.rings + ring, scratch.dummy.matrix);
        rims.current.setColorAt(count * visuals.guard.rings + ring, scratch.color);
      }
      count++;
    }
    bubbles.current.count = count; rims.current.count = count * visuals.guard.rings;
    for (const mesh of [bubbles.current, rims.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });
  return <group name="bubble-guards">
    <instancedMesh ref={bubbles} args={[undefined, undefined, 4]} frustumCulled={false} renderOrder={2}>
      <sphereGeometry args={[1, 40, 24]} />
      <shaderMaterial ref={shader} uniforms={uniforms} vertexShader={guardVertexShader} fragmentShader={guardFragmentShader} transparent depthWrite={false} side={FrontSide} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={rims} args={[undefined, undefined, 12]} frustumCulled={false} renderOrder={3}>
      <torusGeometry args={[1, 0.018, 4, visuals.guard.segments, Math.PI * 1.15]} />
      <meshBasicMaterial transparent opacity={0.68} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  </group>;
}
