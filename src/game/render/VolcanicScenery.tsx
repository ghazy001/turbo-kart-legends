import { useLayoutEffect, useMemo, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';
import type { SampledTrack } from '../core/types';
import { lavaPools } from '../tracks/volcanoScenery';
import { volcanoAssetLayout } from '../tracks/volcanoAssetLayout';
import { volcanoEnvironmentIds } from '../config/environmentAssets';
import { EnvironmentAssetScenery } from './EnvironmentAssetScenery';
import type { AssetStatusReporter } from './models/RaceAssetLoading';

function LavaFields({ track }: { track: SampledTrack }) {
  const rim = useRef<InstancedMesh>(null), lava = useRef<InstancedMesh>(null), core = useRef<InstancedMesh>(null);
  const pools = useMemo(() => lavaPools(track), [track]);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    for (const [i, pool] of pools.entries()) for (const [index, mesh] of [rim.current, lava.current, core.current].entries()) {
      const ratio = [1.12, 1, 0.65][index];
      dummy.position.set(pool.x, 0.02 + index * 0.012, pool.z); dummy.rotation.set(-Math.PI / 2, 0, pool.rotation);
      dummy.scale.set(pool.rx * ratio, pool.rz * ratio, 1); dummy.updateMatrix(); mesh?.setMatrixAt(i, dummy.matrix);
    }
    for (const mesh of [rim.current, lava.current, core.current]) if (mesh) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }
  }, [pools]);
  return <group name="caldera-lava-fields">
    <instancedMesh ref={rim} args={[undefined, undefined, pools.length]}><circleGeometry args={[1, 28]} /><meshStandardMaterial color="#2c2c40" roughness={1} /></instancedMesh>
    <instancedMesh ref={lava} args={[undefined, undefined, pools.length]}><circleGeometry args={[1, 28]} /><meshBasicMaterial color="#ed512b" toneMapped={false} /></instancedMesh>
    <instancedMesh ref={core} args={[undefined, undefined, pools.length]}><circleGeometry args={[1, 28]} /><meshBasicMaterial color="#ffab45" toneMapped={false} /></instancedMesh>
  </group>;
}
/** Cosmetic only: every scenic envelope is outside the existing driving corridor. */
export function VolcanicScenery({ track, statusFor }: { track: SampledTrack; statusFor: (id: string) => AssetStatusReporter }) {
  const placements = useMemo(() => volcanoAssetLayout(track), [track]);
  return <group name="volcano-sprint-scenery"><LavaFields track={track} /><EnvironmentAssetScenery placements={placements} assetIds={volcanoEnvironmentIds} statusFor={statusFor} /></group>;
}
