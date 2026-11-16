import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshStandardMaterial, Shape, ShapeGeometry } from 'three';
import type { SampledTrack } from '../core/types';
import { pointAtDistance } from '../race/trackProgress';
import { offsetSample } from '../tracks/trackSampling';
import { roadHeight, type TrackFeature } from '../tracks/trackSurface';
import { makeFeaturePaint } from './featurePaint';

function FeaturePad({ track, feature, active }: { track: SampledTrack; feature: TrackFeature; active: boolean }) {
  const material = useRef<MeshStandardMaterial>(null), time = useRef(0);
  const p = pointAtDistance(track, feature.fraction * track.length), turbo = feature.kind === 'turbo';
  const paint = useMemo(() => makeFeaturePaint(track, feature), [track, feature]);
  const icon = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(0, 0.27); shape.lineTo(0.25, 0.01); shape.lineTo(0.13, -0.1);
    shape.lineTo(0, 0.04); shape.lineTo(-0.13, -0.1); shape.lineTo(-0.25, 0.01); shape.closePath();
    return new ShapeGeometry(shape);
  }, []);
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)'), []);
  useEffect(() => () => { Object.values(paint).forEach(geometry => geometry.dispose()); }, [paint]);
  useEffect(() => () => icon.dispose(), [icon]);
  useFrame((_, delta) => {
    if (!active) return;
    time.current += Math.min(delta, 0.1);
    if (material.current) material.current.emissiveIntensity = reducedMotion.matches ? 0.24 : 0.24 + Math.sin(time.current * 2.5) * 0.06;
  });
  const accent = turbo ? '#8fe4c5' : '#f0bd60';
  return <group name={feature.id}>
    <mesh geometry={paint.bed} receiveShadow dispose={null}><meshStandardMaterial color={turbo ? '#244e56' : '#39484c'} roughness={0.9} /></mesh>
    <mesh geometry={paint.trim} dispose={null}><meshStandardMaterial color={turbo ? '#70b6a5' : '#dca64e'} roughness={0.8} /></mesh>
    <mesh geometry={paint.arrows} dispose={null}><meshStandardMaterial ref={material} color={accent} emissive={accent} emissiveIntensity={0.24} roughness={0.65} /></mesh>
    <mesh geometry={paint.entry} dispose={null}><meshStandardMaterial color="#f6e7ba" roughness={0.85} /></mesh>
    {[-1, 1].map(side => {
      const q = offsetSample(p, side * 7.4);
      return <group key={side} position={[q.x, roadHeight(track, p.distance), q.z]} rotation={[0, Math.atan2(p.tx, p.tz), 0]}>
        <mesh position={[0, 1.15, 0]} castShadow><cylinderGeometry args={[0.055, 0.075, 2.3, 6]} /><meshStandardMaterial color="#eee5c9" /></mesh>
        <mesh position={[0, 2.1, 0]}><boxGeometry args={[0.85, 0.92, 0.14]} /><meshStandardMaterial color="#f3e7c8" /></mesh>
        <mesh position={[0, 2.1, -0.076]}><boxGeometry args={[0.73, 0.8, 0.012]} /><meshStandardMaterial color={turbo ? '#376d69' : '#a97732'} /></mesh>
        <mesh geometry={icon} position={[0, 2.06, -0.088]} rotation={[0, Math.PI, 0]} dispose={null}><meshBasicMaterial color="#fff0c4" /></mesh>
      </group>;
    })}
  </group>;
}
export function TrackFeaturesVisual({ track, active }: { track: SampledTrack; active: boolean }) {
  return <>{track.definition.features?.map(feature => <FeaturePad key={feature.id} track={track} feature={feature} active={active} />)}</>;
}
