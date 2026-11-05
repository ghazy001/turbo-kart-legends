import { useEffect, useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { sceneConfig } from '../config/kartConfig';
import type { SampledTrack } from '../core/types';
import { offsetSample } from '../tracks/trackSampling';

/** Closed strips use the exact same offset samples as collision's road corridor. */
function makeBand(track: SampledTrack, inner: number, outer: number, y: number, alternating = false) {
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < track.samples.length; i++) {
    const a = track.samples[i];
    const b = track.samples[(i + 1) % track.samples.length];
    const points = [offsetSample(a, inner), offsetSample(a, outer), offsetSample(b, inner), offsetSample(b, outer)];
    points.forEach(p => vertices.push(p.x, y, p.z));
    const base = i * 4;
    // +Y winding, valid for positive and negative offsets after ordering below.
    indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    const coral = Math.floor(a.distance / 3) % 2 === 0;
    const color = alternating && coral ? [1, 0.31, 0.22] : [1, 0.94, 0.75];
    for (let k = 0; k < 4; k++) colors.push(...color);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function Band({ track, inner, outer, y, color, alternating = false }: {
  track: SampledTrack; inner: number; outer: number; y: number; color?: string; alternating?: boolean;
}) {
  const geometry = useMemo(() => makeBand(track, inner, outer, y, alternating), [track, inner, outer, y, alternating]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow>
    <meshStandardMaterial color={color ?? 'white'} vertexColors={alternating} roughness={0.94} />
  </mesh>;
}

export function TrackVisual({ track }: { track: SampledTrack }) {
  const half = track.definition.roadWidth / 2;
  const spawn = track.spawn;
  return <group>
    <Band track={track} inner={-half - 1} outer={half + 1} y={0.01} color="#d5bf88" />
    <Band track={track} inner={-half} outer={half} y={sceneConfig.roadY} color="#536878" />
    {[-1, 1].map(side => <group key={side}>
      <Band track={track} inner={side * half - 0.3} outer={side * half + 0.3} y={0.055} alternating />
      <Band track={track} inner={side * (half - 0.48) - 0.055} outer={side * (half - 0.48) + 0.055} y={0.058} color="#ffedb3" />
      <Band track={track} inner={side * (half + 0.36) - 0.14} outer={side * (half + 0.36) + 0.14} y={sceneConfig.railHeight} color="#fff5d5" />
      <RailSide track={track} offset={side * (half + 0.22)} />
    </group>)}
    <group position={[spawn.x + Math.sin(spawn.heading) * 9.6, 0.07, spawn.z + Math.cos(spawn.heading) * 9.6]} rotation={[0, spawn.heading, 0]}>
      {Array.from({ length: 20 }, (_, i) => <mesh key={i} position={[(i % 10 - 4.5), 0, Math.floor(i / 10) * 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 0.7]} /><meshStandardMaterial color={(i + Math.floor(i / 10)) % 2 ? '#183e48' : '#fff6db'} />
      </mesh>)}
    </group>
    <group position={[spawn.x, 0.075, spawn.z]} rotation={[0, spawn.heading, 0]}>
      {[12, 28, 44].map(z => <group key={z} position={[0, 0, z]}>
        {[-1, 1].map(side => <mesh key={side} position={[side * 0.4, 0, 0]} rotation={[-Math.PI / 2, 0, -side * 0.6]}>
          <planeGeometry args={[0.13, 1.2]} /><meshStandardMaterial color="#e4e9d7" />
        </mesh>)}
      </group>)}
    </group>
  </group>;
}

function RailSide({ track, offset }: { track: SampledTrack; offset: number }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const indices: number[] = [];
    track.samples.forEach((sample, i) => {
      const p = offsetSample(sample, offset);
      const q = offsetSample(track.samples[(i + 1) % track.samples.length], offset);
      positions.push(p.x, 0.04, p.z, q.x, 0.04, q.z, p.x, sceneConfig.railHeight, p.z, q.x, sceneConfig.railHeight, q.z);
      const b = i * 4;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    });
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setIndex(indices); geo.computeVertexNormals(); return geo;
  }, [track, offset]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#21797c" side={2} roughness={0.8} /></mesh>;
}
