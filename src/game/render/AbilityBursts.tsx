import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Object3D, type InstancedMesh } from 'three';
import { abilityVisualConfig as visuals } from '../config/abilityVisualConfig';
import { surfaceHeightAt } from '../tracks/trackSurface';
import { AbilityBurstPool, burstStyles } from './effects/abilityBursts';
import type { GameRuntime } from './runtime';

/** Bounded activation, impact and shield-shatter feedback sampled from existing race events. */
export function AbilityBursts({ runtime }: { runtime: GameRuntime }) {
  const rings = useRef<InstancedMesh>(null), fragments = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => ({ pool: new AbilityBurstPool(), dummy: new Object3D(), color: new Color(), motion: window.matchMedia('(prefers-reduced-motion: reduce)') }), []);
  useFrame(() => {
    if (!rings.current || !fragments.current) return;
    const items = runtime.race.items, reduced = scratch.motion.matches;
    scratch.pool.sample(items.events, items.time);
    let ringCount = 0, particleCount = 0;
    for (let i = 0; i < scratch.pool.count; i++) {
      const { event, progress, fade } = scratch.pool.slots[i], style = burstStyles[event.kind];
      const ground = surfaceHeightAt(runtime.race.track, event);
      const radius = style.radius * (reduced ? 0.65 : 0.25 + Math.sqrt(progress) * 0.9);
      scratch.color.set(style.color).multiplyScalar(fade * 0.9);
      for (let ring = 0; ring < 2; ring++) {
        scratch.dummy.position.set(event.x, ground + (ring === 0 ? 0.09 : style.height), event.z);
        scratch.dummy.rotation.set(ring === 0 ? -Math.PI / 2 : 0.4, ring === 0 ? 0 : event.id, 0);
        scratch.dummy.scale.setScalar(radius * (ring === 0 ? 1 : 0.8)); scratch.dummy.updateMatrix();
        rings.current.setMatrixAt(ringCount, scratch.dummy.matrix); rings.current.setColorAt(ringCount++, scratch.color);
      }
      const count = reduced ? 3 : event.kind === 'guard-expire' ? 5 : visuals.bursts.particles;
      for (let particle = 0; particle < count; particle++) {
        const angle = particle * 2.399963 + event.id * 0.72;
        const elevation = (particle % 4) / 4;
        const travel = reduced ? 0.45 : Math.sqrt(progress);
        const spread = style.radius * travel * (0.5 + elevation * 0.65);
        scratch.dummy.position.set(event.x + Math.sin(angle) * spread, ground + Math.max(0.08, style.height + elevation * travel * 1.8 - progress * progress * 0.6), event.z + Math.cos(angle) * spread);
        scratch.dummy.rotation.set(angle, angle * 0.7, angle);
        const size = (0.04 + elevation * 0.045) * (1 - progress);
        scratch.dummy.scale.set(size, size * (event.kind === 'guard-break' ? 3.5 : 2.2), size); scratch.dummy.updateMatrix();
        fragments.current.setMatrixAt(particleCount, scratch.dummy.matrix); fragments.current.setColorAt(particleCount++, scratch.color);
      }
    }
    rings.current.count = ringCount; fragments.current.count = particleCount;
    for (const mesh of [rings.current, fragments.current]) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
  });
  return <group name="ability-bursts">
    <instancedMesh ref={rings} args={[undefined, undefined, visuals.bursts.capacity * 2]} frustumCulled={false}>
      <torusGeometry args={[1, 0.018, 4, 40]} /><meshBasicMaterial transparent opacity={0.75} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={fragments} args={[undefined, undefined, visuals.bursts.capacity * visuals.bursts.particles]} frustumCulled={false}>
      <octahedronGeometry args={[1]} /><meshBasicMaterial transparent opacity={0.95} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  </group>;
}
