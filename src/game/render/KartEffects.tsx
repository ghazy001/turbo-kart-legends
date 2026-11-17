import { surfaceHeightAt } from '../tracks/trackSurface';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Object3D, type InstancedMesh } from 'three';
import { boostTiers } from '../config/driftConfig';
import { abilityVisualConfig as visuals } from '../config/abilityVisualConfig';
import { chargeTier } from '../kart/driftController';
import { particlePhase } from './effects/abilityBursts';
import { jetFragmentShader, jetVertexShader } from './effects/jetShader';
import type { KartVisualRuntime } from './runtime';

/** Four bounded draws per kart: fine wheel sparks, layered jets, wake ribbons and exhaust collars. */
export function KartEffects({ runtime }: { runtime: KartVisualRuntime }) {
  const sparks = useRef<InstancedMesh>(null), jets = useRef<InstancedMesh>(null), wake = useRef<InstancedMesh>(null), collars = useRef<InstancedMesh>(null);
  const helpers = useMemo(() => ({ dummy: new Object3D(), color: new Color(), white: new Color('#e5fcff'), motion: window.matchMedia('(prefers-reduced-motion: reduce)') }), []);
  const elapsed = useRef(0), revision = useRef(-1), boostSerial = useRef(0), boostStart = useRef(0);
  const jetUniforms = useMemo(() => ({ uTime: { value: 0 }, uMotion: { value: 1 } }), []);
  useFrame((_, delta) => {
    if (!sparks.current || !jets.current || !wake.current || !collars.current) return;
    const pose = runtime.simulation.pose, reduced = helpers.motion.matches;
    if (revision.current !== runtime.simulation.revision) {
      elapsed.current = 0; revision.current = runtime.simulation.revision; boostSerial.current = pose.boostSerial; boostStart.current = -1;
    }
    if (runtime.mode === 'playing') elapsed.current += Math.min(delta, 0.1);
    if (boostSerial.current !== pose.boostSerial) { boostStart.current = elapsed.current; boostSerial.current = pose.boostSerial; }
    const tier = chargeTier(pose.driftCharge), time = elapsed.current;
    jetUniforms.uTime.value = time; jetUniforms.uMotion.value = reduced ? 0 : 1;
    const drifting = pose.driftDirection !== 0 && pose.y - surfaceHeightAt(runtime.simulation.track, pose) < 0.02;
    const sparkCount = drifting ? reduced ? 8 : visuals.kart.sparks : 0;
    for (let i = 0; i < sparkCount; i++) {
      const phase = particlePhase(time, i, sparkCount, 3.3, reduced), side = i % 2 ? 1 : -1, spread = (i % 5) / 5;
      helpers.dummy.position.set(side * (1.03 + phase * (0.25 + spread * 0.55)), 0.14 + Math.sin(phase * Math.PI) * (0.12 + spread * 0.2), -0.72 - phase * 2.5);
      helpers.dummy.rotation.set(0.2, side * phase * 0.5, side * 0.45);
      const size = (1 - phase) * (tier ? 0.045 : 0.025);
      helpers.dummy.scale.set(size, size * 0.7, size * (5 + spread * 3)); helpers.dummy.updateMatrix();
      sparks.current.setMatrixAt(i, helpers.dummy.matrix);
      helpers.color.set(tier ? boostTiers[tier - 1].color : '#ffdf96');
      if (i % 4 === 0) helpers.color.lerp(helpers.white, 0.7);
      sparks.current.setColorAt(i, helpers.color.multiplyScalar(1 - phase * 0.6));
    }
    sparks.current.count = sparkCount;
    const boosting = pose.boostRemaining > 0 && pose.boostTier > 0;
    jets.current.count = boosting ? 4 : 0; wake.current.count = boosting && !reduced ? visuals.kart.wake : 0; collars.current.count = boosting ? 2 : 0;
    if (boosting) {
      helpers.color.set(boostTiers[pose.boostTier - 1].color);
      const flicker = reduced ? 1 : 1 + Math.sin(time * 23) * 0.09;
      const length = (0.95 + pose.boostTier * 0.24) * flicker;
      for (let i = 0; i < 4; i++) {
        const side = i % 2 ? 1 : -1, core = i >= 2, scale = core ? 0.53 : 1;
        helpers.dummy.position.set(side * 0.55, 0.57, -1.42 - length * scale * 0.5);
        helpers.dummy.rotation.set(-Math.PI / 2, 0, 0); helpers.dummy.scale.set(0.24 * scale, length * scale, 0.24 * scale); helpers.dummy.updateMatrix();
        jets.current.setMatrixAt(i, helpers.dummy.matrix); jets.current.setColorAt(i, core ? helpers.white : helpers.color);
      }
      for (let i = 0; i < wake.current.count; i++) {
        const phase = particlePhase(time, i, visuals.kart.wake, 2.8, false), side = i % 2 ? 1 : -1;
        helpers.dummy.position.set(side * (0.7 + phase * 0.65), 0.22 + (i % 3) * 0.07, -1.65 - phase * 3.8);
        helpers.dummy.rotation.set(0, -side * 0.12, 0); helpers.dummy.scale.set(0.035 * (1 - phase), 0.018, 0.5 + phase * 1.3); helpers.dummy.updateMatrix();
        wake.current.setMatrixAt(i, helpers.dummy.matrix); wake.current.setColorAt(i, helpers.color);
      }
      for (let i = 0; i < 2; i++) {
        helpers.dummy.position.set(i ? 0.55 : -0.55, 0.57, -1.45);
        helpers.dummy.rotation.set(0, 0, 0); helpers.dummy.scale.setScalar(0.26); helpers.dummy.updateMatrix();
        collars.current.setMatrixAt(i, helpers.dummy.matrix); collars.current.setColorAt(i, helpers.white);
      }
      const age = time - boostStart.current;
      if (boostStart.current >= 0 && age >= 0 && age < 0.32 && !reduced) {
        helpers.dummy.position.set(0, 0.65, -1.8 - age * 3);
        helpers.dummy.rotation.set(0, 0, 0); helpers.dummy.scale.setScalar(0.6 + age * 3); helpers.dummy.updateMatrix();
        collars.current.setMatrixAt(2, helpers.dummy.matrix); collars.current.setColorAt(2, helpers.color.multiplyScalar(1 - age / 0.32)); collars.current.count = 3;
      }
    }
    for (const mesh of [sparks.current, jets.current, wake.current, collars.current]) {
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, -1);
  return <group name="kart-ability-effects">
    <instancedMesh ref={sparks} args={[undefined, undefined, visuals.kart.sparks]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} /><meshBasicMaterial transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={jets} args={[undefined, undefined, 4]} frustumCulled={false}>
      <coneGeometry args={[1, 1, 12]} /><shaderMaterial uniforms={jetUniforms} vertexShader={jetVertexShader} fragmentShader={jetFragmentShader} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={wake} args={[undefined, undefined, visuals.kart.wake]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} /><meshBasicMaterial transparent opacity={0.45} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={collars} args={[undefined, undefined, 3]} frustumCulled={false}>
      <torusGeometry args={[1, 0.035, 4, 24]} /><meshBasicMaterial transparent opacity={0.65} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  </group>;
}
