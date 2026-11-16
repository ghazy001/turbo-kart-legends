import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshStandardMaterial } from 'three';
import type { SampledTrack } from '../core/types';
import { pointAtDistance } from '../race/trackProgress';
import { offsetSample } from '../tracks/trackSampling';
import { roadHeight, type TrackFeature } from '../tracks/trackSurface';

function FeaturePad({ track, feature, active }: { track: SampledTrack; feature: TrackFeature; active: boolean }) {
  const material = useRef<MeshStandardMaterial>(null), time = useRef(0);
  const p = pointAtDistance(track, feature.fraction * track.length);
  useFrame((_, delta) => {
    if (!active) return;
    time.current += Math.min(delta, 0.1);
    if (material.current) material.current.emissiveIntensity = 0.6 + Math.sin(time.current * 3.5) * 0.12;
  });
  const turbo = feature.kind === 'turbo';
  return <group name={feature.id}>
    {Array.from({ length: Math.max(2, Math.ceil(feature.length / 1.5)) }, (_, i) => {
      const point = pointAtDistance(track, p.distance + i * feature.length / Math.max(2, Math.ceil(feature.length / 1.5)));
      return <group key={i} position={[point.x, roadHeight(track, point.distance) + 0.08, point.z]} rotation={[0, Math.atan2(point.tx, point.tz), 0]}>
        {turbo && <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[feature.width, 1.28]} /><meshStandardMaterial color="#255963" roughness={0.8} /></mesh>}
        {[-1, 1].map(side => <mesh key={side} position={[side * feature.width * 0.235, 0.012, 0]} rotation={[-Math.PI / 2, 0, -side * 0.3]}>
          <planeGeometry args={[feature.width * 0.48, 0.22]} /><meshStandardMaterial ref={i === 0 && side === 1 ? material : undefined} color={turbo ? '#b9f2dc' : '#f4c76f'} emissive={turbo ? '#47bba6' : '#d69d49'} emissiveIntensity={0.6} toneMapped={false} />
        </mesh>)}
      </group>;
    })}
    {[-1, 1].map(side => {
      const q = offsetSample(p, side * 7.4);
      return <group key={side} position={[q.x, roadHeight(track, p.distance), q.z]} rotation={[0, Math.atan2(p.tx, p.tz), 0]}>
        <mesh position={[0, 1.15, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 2.3, 6]} /><meshStandardMaterial color="#eee5c9" /></mesh>
        <mesh position={[0, 2.1, 0]}><boxGeometry args={[0.65, 0.7, 0.14]} /><meshStandardMaterial color={turbo ? '#53aa9b' : '#e3b95f'} /></mesh>
      </group>;
    })}
  </group>;
}
export function TrackFeaturesVisual({ track, active }: { track: SampledTrack; active: boolean }) {
  return <>{track.definition.features?.map(feature => <FeaturePad key={feature.id} track={track} feature={feature} active={active} />)}</>;
}