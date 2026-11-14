import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { DoubleSide, InstancedMesh, Object3D } from 'three';
import type { SampledTrack } from '../core/types';
import { basaltColumns, lavaPools, volcanicPeaks } from '../tracks/volcanoScenery';
import { makeVolcanoFissures } from './volcanoGeometry';

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
function CalderaPeaks({ track }: { track: SampledTrack }) {
  const rock = useRef<InstancedMesh>(null), rim = useRef<InstancedMesh>(null), crater = useRef<InstancedMesh>(null);
  const peaks = useMemo(() => volcanicPeaks(track), [track]);
  const fissures = useMemo(() => makeVolcanoFissures(peaks), [peaks]);
  useEffect(() => () => fissures.dispose(), [fissures]);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    peaks.forEach((peak, i) => {
      dummy.position.set(peak.x, peak.height / 2, peak.z); dummy.rotation.set(0, peak.rotation, 0);
      dummy.scale.set(peak.radius, peak.height, peak.radius); dummy.updateMatrix(); rock.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.y = peak.height + 0.08; dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.setScalar(peak.radius * 0.27);
      dummy.updateMatrix(); rim.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.y = peak.height + 0.04; dummy.scale.setScalar(peak.radius * 0.22); dummy.updateMatrix(); crater.current?.setMatrixAt(i, dummy.matrix);
    });
    for (const mesh of [rock.current, rim.current, crater.current]) if (mesh) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }
  }, [peaks]);
  return <group name="ember-caldera-peaks">
    <instancedMesh ref={rock} args={[undefined, undefined, peaks.length]}><cylinderGeometry args={[0.27, 1, 1, 9]} /><meshStandardMaterial color="#514454" roughness={1} flatShading /></instancedMesh>
    <instancedMesh ref={rim} args={[undefined, undefined, peaks.length]}><torusGeometry args={[1, 0.14, 6, 20]} /><meshStandardMaterial color="#7c4e4b" roughness={1} flatShading /></instancedMesh>
    <instancedMesh ref={crater} args={[undefined, undefined, peaks.length]}><circleGeometry args={[1, 20]} /><meshBasicMaterial color="#ff9b3e" toneMapped={false} /></instancedMesh>
    <mesh geometry={fissures}><meshBasicMaterial color="#fa7234" toneMapped={false} side={DoubleSide} /></mesh>
  </group>;
}
function BasaltGrove({ track }: { track: SampledTrack }) {
  const mesh = useRef<InstancedMesh>(null), columns = useMemo(() => basaltColumns(track), [track]);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    columns.forEach((column, i) => {
      dummy.position.set(column.x, column.height / 2, column.z); dummy.rotation.set(0, column.rotation, 0);
      dummy.scale.set(column.radius, column.height, column.radius); dummy.updateMatrix(); mesh.current?.setMatrixAt(i, dummy.matrix);
    });
    if (mesh.current) { mesh.current.instanceMatrix.needsUpdate = true; mesh.current.computeBoundingSphere(); }
  }, [columns]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, columns.length]} castShadow receiveShadow><cylinderGeometry args={[0.7, 1, 1, 6]} /><meshStandardMaterial color="#665b71" roughness={1} flatShading /></instancedMesh>;
}
/** Cosmetic only: every scenic envelope is outside the existing driving corridor. */
export function VolcanicScenery({ track }: { track: SampledTrack }) {
  return <group name="volcano-sprint-scenery"><LavaFields track={track} /><CalderaPeaks track={track} /><BasaltGrove track={track} /></group>;
}
