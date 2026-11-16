import { roadHeight } from '../tracks/trackSurface';
import { makeAsphaltTextures } from './roadTexture';
import { useEffect, useMemo } from 'react';
import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import { makeRoadDashes } from './surfacePaint';
import { sceneConfig } from '../config/kartConfig';
import type { SampledTrack } from '../core/types';
import { pointAtDistance } from '../race/trackProgress';
import { trackDefinition } from '../tracks/trackCatalog';
import { offsetSample } from '../tracks/trackSampling';

/** Closed strips use the exact same offset samples as collision's road corridor. */
export function makeBand(track: SampledTrack, inner: number, outer: number, y: number, alternating = false, curbColors?: readonly [string, string]) {
  const vertices: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const palette = curbColors?.map(color => new Color(color).toArray());
  for (let i = 0; i < track.samples.length; i++) {
    const a = track.samples[i];
    const b = track.samples[(i + 1) % track.samples.length];
    const points = [offsetSample(a, inner), offsetSample(a, outer), offsetSample(b, inner), offsetSample(b, outer)];
    points.forEach((p, j) => {
      const offset = j % 2 ? outer : inner;
      const taper = Math.max(0, Math.min(1, (track.definition.roadWidth / 2 + 5 - Math.abs(offset)) / 4));
      vertices.push(p.x, y + roadHeight(track, j < 2 ? a.distance : b.distance) * taper, p.z);
      uvs.push(p.x * 0.65, p.z * 0.65);
    });
    const base = i * 4;
    // +Y winding, valid for positive and negative offsets after ordering below.
    indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    const coral = Math.floor(a.distance / 3) % 2 === 0;
    const color = palette ? palette[coral ? 0 : 1] : alternating && coral ? [1, 0.31, 0.22] : [1, 0.94, 0.75];
    for (let k = 0; k < 4; k++) colors.push(...color);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function Band({ track, inner, outer, y, color, alternating = false, asphalt = false, curbColors }: {
  track: SampledTrack; inner: number; outer: number; y: number; color?: string; alternating?: boolean; asphalt?: boolean; curbColors?: readonly [string, string];
}) {
  const geometry = useMemo(() => makeBand(track, inner, outer, y, alternating, curbColors), [track, inner, outer, y, alternating, curbColors]);
  const textures = useMemo(() => asphalt ? makeAsphaltTextures() : null, [asphalt]);
  useEffect(() => () => { textures?.map.dispose(); textures?.bumpMap.dispose(); }, [textures]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow>
    <meshStandardMaterial color={color ?? 'white'} vertexColors={alternating} roughness={0.94} map={textures?.map} bumpMap={textures?.bumpMap} bumpScale={0.025} />
  </mesh>;
}

const volcanoCurbs = ['#ce8b46', '#fff0d5'] as const;
const sugarCurbs = ['#c995b9', '#fff0d5'] as const;
export function TrackVisual({ track }: { track: SampledTrack }) {
  const theme = trackDefinition(track.definition.id).theme;
  const sunshine = track.definition.id === 'sunshine-circuit';
  const detailedRoad = sunshine || theme.candy || theme.volcanic;
  const half = track.definition.roadWidth / 2;
  const spawn = track.spawn;
  const finish = pointAtDistance(track, track.definition.startDistance ?? 0);
  return <group>
    {sunshine && [-1, 1].map(side => <Band key={side} track={track} inner={side < 0 ? -half - 5 : half + 1} outer={side < 0 ? -half - 1 : half + 5} y={0.008} color="#a4bb78" />)}
    {theme.candy && <Band track={track} inner={-half - 3.5} outer={half + 3.5} y={0.008} color="#eadac2" />}
    <Band track={track} inner={-half - 1} outer={half + 1} y={0.01} color="#d5bf88" />
    <Band track={track} inner={-half} outer={half} y={sceneConfig.roadY} color={theme.road} asphalt={detailedRoad} />
    {[-1, 1].map(side => <group key={side}>
      <Band track={track} inner={side * half - 0.3} outer={side * half + 0.3} y={0.055} alternating curbColors={theme.candy ? sugarCurbs : theme.volcanic ? volcanoCurbs : undefined} />
      <Band track={track} inner={side * (half - 0.48) - 0.055} outer={side * (half - 0.48) + 0.055} y={0.058} color="#ffedb3" />
      <Band track={track} inner={side * (half + sceneConfig.railCenterOffset) - sceneConfig.railWidth / 2} outer={side * (half + sceneConfig.railCenterOffset) + sceneConfig.railWidth / 2} y={sceneConfig.railHeight} color="#fff5d5" />
      <RailSide track={track} offset={side * (half + sceneConfig.railCenterOffset - sceneConfig.railWidth / 2)} />
    </group>)}
    <group position={[finish.x, 0.07, finish.z]} rotation={[0, Math.atan2(finish.tx, finish.tz), 0]}>
      {Array.from({ length: 20 }, (_, i) => <mesh key={i} position={[(i % 10 - 4.5), 0, (Math.floor(i / 10) - 0.5) * 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 0.7]} /><meshStandardMaterial color={(i + Math.floor(i / 10)) % 2 ? '#183e48' : '#fff6db'} />
      </mesh>)}
    </group>
    {detailedRoad && <RoadDashes track={track} />}
    {!detailedRoad && <group position={[spawn.x, 0.075, spawn.z]} rotation={[0, spawn.heading, 0]}>
      {[12, 28, 44].map(z => <group key={z} position={[0, 0, z]}>
        {[-1, 1].map(side => <mesh key={side} position={[side * 0.4, 0, 0]} rotation={[-Math.PI / 2, 0, -side * 0.6]}>
          <planeGeometry args={[0.13, 1.2]} /><meshStandardMaterial color="#e4e9d7" />
        </mesh>)}
      </group>)}
    </group>}
  </group>;
}

function RailSide({ track, offset }: { track: SampledTrack; offset: number }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const indices: number[] = [];
    track.samples.forEach((sample, i) => {
      const p = offsetSample(sample, offset);
      const q = offsetSample(track.samples[(i + 1) % track.samples.length], offset);
      const h = roadHeight(track, sample.distance), k = roadHeight(track, track.samples[(i + 1) % track.samples.length].distance);
      positions.push(p.x, h + 0.04, p.z, q.x, k + 0.04, q.z, p.x, h + sceneConfig.railHeight, p.z, q.x, k + sceneConfig.railHeight, q.z);
      const b = i * 4;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    });
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setIndex(indices); geo.computeVertexNormals(); return geo;
  }, [track, offset]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color={trackDefinition(track.definition.id).theme.rail} side={2} roughness={0.8} /></mesh>;
}

function RoadDashes({ track }: { track: SampledTrack }) {
  const geometry = useMemo(() => makeRoadDashes(track), [track]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#eae9d8" roughness={0.95} /></mesh>;
}
