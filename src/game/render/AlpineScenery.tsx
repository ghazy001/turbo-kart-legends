import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { DoubleSide, InstancedMesh, Object3D } from 'three';
import type { SampledTrack } from '../core/types';
import { alpineConfig, alpineTunnels, mountainLayout, tunnelSections, type AlpineTunnel } from '../tracks/frostbiteScenery';
import { offsetSample } from '../tracks/trackSampling';
import { makeAlpineTunnel } from './alpineGeometry';
import { paintedTexture } from './paintedTexture';

function Tunnel({ track, tunnel }: { track: SampledTrack; tunnel: AlpineTunnel }) {
  const geometry = useMemo(() => makeAlpineTunnel(track, tunnel), [track, tunnel]);
  const sign = useMemo(() => paintedTexture(tunnel.name, '#245d83', '#f4fbff', 'F R O S T B I T E   P E A K'), [tunnel]);
  const entry = useMemo(() => tunnelSections(track, tunnel)[0], [track, tunnel]);
  useEffect(() => () => { geometry.dispose(); sign.dispose(); }, [geometry, sign]);
  return <group>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={1} side={DoubleSide} /></mesh>
    <group position={[entry.x, 0, entry.z]} rotation={[0, Math.atan2(entry.tx, entry.tz), 0]}>
      <mesh position={[0, 11.1, -0.12]} rotation={[0, Math.PI, 0]}><planeGeometry args={[8, 1]} /><meshStandardMaterial map={sign} /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * 7.4, 1.1, -0.3]}><boxGeometry args={[0.22, 2.2, 0.3]} /><meshStandardMaterial color="#f6ba56" /></mesh>)}
    </group>
  </group>;
}
function Mountains({ track }: { track: SampledTrack }) {
  const rock = useRef<InstancedMesh>(null), snow = useRef<InstancedMesh>(null);
  const peaks = useMemo(() => mountainLayout(track), [track]);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    for (const [i, peak] of peaks.entries()) {
      dummy.position.set(peak.x, peak.height / 2, peak.z); dummy.rotation.set(0, peak.rotation, 0);
      dummy.scale.set(peak.radius, peak.height, peak.radius); dummy.updateMatrix(); rock.current?.setMatrixAt(i, dummy.matrix);
      const cap = 0.38;
      dummy.position.y = peak.height * (1 - cap / 2) + 0.1;
      dummy.scale.set(peak.radius * cap * 1.025, peak.height * cap, peak.radius * cap * 1.025); dummy.updateMatrix(); snow.current?.setMatrixAt(i, dummy.matrix);
    }
    for (const mesh of [rock.current, snow.current]) if (mesh) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }
  }, [peaks]);
  return <group name="snowcap-mountains">
    <instancedMesh ref={rock} args={[undefined, undefined, peaks.length]}><coneGeometry args={[1, 1, 7]} /><meshStandardMaterial color="#8caac2" roughness={1} flatShading /></instancedMesh>
    <instancedMesh ref={snow} args={[undefined, undefined, peaks.length]}><coneGeometry args={[1, 1, 7]} /><meshStandardMaterial color="#f5fbff" roughness={1} flatShading /></instancedMesh>
  </group>;
}
function Snowbanks({ track }: { track: SampledTrack }) {
  const mesh = useRef<InstancedMesh>(null);
  const banks = useMemo(() => track.samples.filter((_, i) => i % Math.round(alpineConfig.bankSpacing / 1.5) === 0).flatMap(sample => [-1, 1].map(side => ({
    ...offsetSample(sample, side * alpineConfig.bankOffset), heading: Math.atan2(sample.tx, sample.tz),
  }))), [track]);
  useLayoutEffect(() => {
    const dummy = new Object3D(); dummy.scale.set(1.2, 0.55, 2);
    banks.forEach((bank, i) => { dummy.position.set(bank.x, 0.12, bank.z); dummy.rotation.set(0, bank.heading, 0); dummy.updateMatrix(); mesh.current?.setMatrixAt(i, dummy.matrix); });
    if (mesh.current) { mesh.current.instanceMatrix.needsUpdate = true; mesh.current.computeBoundingSphere(); }
  }, [banks]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, banks.length]} receiveShadow><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#f7fcff" roughness={1} flatShading /></instancedMesh>;
}
export function AlpineScenery({ track }: { track: SampledTrack }) {
  return <group name="frostbite-alpine-scenery"><Mountains track={track} /><Snowbanks track={track} />{alpineTunnels.map(tunnel => <Tunnel key={tunnel.name} track={track} tunnel={tunnel} />)}</group>;
}
