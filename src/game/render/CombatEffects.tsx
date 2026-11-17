import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Object3D, Vector3, type InstancedMesh } from 'three';
import { abilityVisualConfig as visuals } from '../config/abilityVisualConfig';
import { itemConfig } from '../config/itemConfig';
import type { GameRuntime } from './runtime';

/** Electric filaments wrap the supplied projectile; ground warnings never define hitboxes. */
export function CombatEffects({ runtime }: { runtime: GameRuntime }) {
  const trails = useRef<InstancedMesh>(null), arcs = useRef<InstancedMesh>(null), ground = useRef<InstancedMesh>(null), shards = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => ({ dummy: new Object3D(), color: new Color(), end: new Vector3(), direction: new Vector3(), axis: new Vector3(0, 0, 1), motion: window.matchMedia('(prefers-reduced-motion: reduce)') }), []);
  useFrame(() => {
    if (!trails.current || !arcs.current || !ground.current || !shards.current) return;
    const items = runtime.race.items, time = scratch.motion.matches ? 0 : items.time;
    let filamentCount = 0, arcCount = 0, groundCount = 0, shardCount = 0;
    for (const bolt of items.projectiles) {
      const heading = Math.atan2(bolt.dx, bolt.dz), sin = Math.sin(heading), cos = Math.cos(heading);
      const strands = scratch.motion.matches ? 1 : 3;
      for (let strand = 0; strand < strands; strand++) for (let segment = 0; segment < 3; segment++) {
        const phase = time * 17 + bolt.id * 1.7 + strand * 2.094;
        const a = segment / 3, b = (segment + 1) / 3;
        const sideA = Math.sin(phase + segment * 2.2) * (0.09 + a * 0.18), sideB = Math.sin(phase + (segment + 1) * 2.2) * (0.09 + b * 0.18);
        const yA = Math.cos(phase + segment * 2.2) * 0.13, yB = Math.cos(phase + (segment + 1) * 2.2) * 0.13;
        const ax = bolt.x - sin * a * visuals.bolt.length + cos * sideA, az = bolt.z - cos * a * visuals.bolt.length - sin * sideA;
        scratch.end.set(bolt.x - sin * b * visuals.bolt.length + cos * sideB, bolt.y + yB, bolt.z - cos * b * visuals.bolt.length - sin * sideB);
        scratch.dummy.position.set(ax, bolt.y + yA, az);
        scratch.direction.subVectors(scratch.end, scratch.dummy.position);
        const length = scratch.direction.length();
        scratch.dummy.position.add(scratch.end).multiplyScalar(0.5);
        scratch.dummy.quaternion.setFromUnitVectors(scratch.axis, scratch.direction.normalize());
        scratch.dummy.scale.set(0.035 * (1 - a * 0.65), 0.035 * (1 - a * 0.65), length); scratch.dummy.updateMatrix();
        trails.current.setMatrixAt(filamentCount, scratch.dummy.matrix);
        scratch.color.set(strand === 0 ? visuals.colors.ice : visuals.colors.electric).multiplyScalar(1 - a * 0.7);
        trails.current.setColorAt(filamentCount++, scratch.color);
      }
      for (let ring = 0; ring < visuals.bolt.rings; ring++) {
        scratch.dummy.position.set(bolt.x - sin * ring * 0.13, bolt.y, bolt.z - cos * ring * 0.13);
        scratch.dummy.rotation.set(0, heading, time * 5 + ring * 2.1);
        const radius = 0.29 + ring * 0.045;
        scratch.dummy.scale.set(radius, radius, radius); scratch.dummy.updateMatrix();
        arcs.current.setMatrixAt(arcCount, scratch.dummy.matrix);
        scratch.color.set(ring === 0 ? visuals.colors.ice : visuals.colors.electric);
        arcs.current.setColorAt(arcCount++, scratch.color);
      }
    }
    for (const trap of items.traps) {
      // The thin halo stays close to the actual trap envelope and settles when armed.
      const size = itemConfig.trapRadius * (trap.armRemaining > 0 ? 0.9 + Math.sin(time * 7) * 0.08 : 1.06);
      scratch.dummy.position.set(trap.x, (trap.ground ?? 0) + 0.035, trap.z);
      scratch.dummy.rotation.set(-Math.PI / 2, 0, 0); scratch.dummy.scale.set(size, size, 1); scratch.dummy.updateMatrix();
      ground.current.setMatrixAt(groundCount, scratch.dummy.matrix);
      scratch.color.set(visuals.colors.trap).multiplyScalar(trap.armRemaining > 0 ? 0.45 : 0.85);
      ground.current.setColorAt(groundCount++, scratch.color);
    }
    for (const racer of runtime.race.racers) {
      if (racer.progress.finishTime !== null) continue;
      const slot = items.slot(racer.id), pose = racer.simulation.pose;
      if ((slot?.immunity ?? 0) > 0) {
        scratch.dummy.position.set(pose.x, pose.y + 0.09, pose.z);
        scratch.dummy.rotation.set(-Math.PI / 2, 0, 0); scratch.dummy.scale.set(1.48, 1.48, 1); scratch.dummy.updateMatrix();
        ground.current.setMatrixAt(groundCount, scratch.dummy.matrix);
        scratch.color.set(visuals.colors.impact).multiplyScalar(Math.min(0.7, slot!.immunity));
        ground.current.setColorAt(groundCount++, scratch.color);
      }
      if (!(slot?.slowRemaining)) continue;
      for (let i = 0; i < (scratch.motion.matches ? 2 : 4); i++) {
        const angle = time * 5 + i * Math.PI / 2;
        scratch.dummy.position.set(pose.x + Math.sin(angle) * 1.2, pose.y + 1.25 + Math.sin(angle * 2) * 0.12, pose.z + Math.cos(angle) * 1.2);
        scratch.dummy.rotation.set(0, angle, Math.PI / 4); scratch.dummy.scale.set(0.09, 0.22, 0.09); scratch.dummy.updateMatrix();
        shards.current.setMatrixAt(shardCount++, scratch.dummy.matrix);
      }
    }
    trails.current.count = filamentCount; arcs.current.count = arcCount; ground.current.count = groundCount; shards.current.count = shardCount;
    for (const mesh of [trails.current, arcs.current, ground.current, shards.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });
  return <group name="combat-energy">
    <instancedMesh ref={trails} args={[undefined, undefined, itemConfig.maxProjectiles * visuals.bolt.filaments]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} /><meshBasicMaterial transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={arcs} args={[undefined, undefined, itemConfig.maxProjectiles * visuals.bolt.rings]} frustumCulled={false}>
      <torusGeometry args={[1, 0.065, 4, 20, Math.PI * 1.4]} /><meshBasicMaterial transparent opacity={0.8} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={ground} args={[undefined, undefined, itemConfig.maxTraps + 4]} frustumCulled={false}>
      <ringGeometry args={[0.92, 1, 40]} /><meshBasicMaterial transparent opacity={0.75} depthWrite={false} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={shards} args={[undefined, undefined, 16]} frustumCulled={false}>
      <octahedronGeometry args={[1]} /><meshBasicMaterial color={visuals.colors.trap} toneMapped={false} />
    </instancedMesh>
  </group>;
}
