import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import { sugarEnvironmentIds } from '../config/environmentAssets';
import type { SampledTrack } from '../core/types';
import { sugarScenery, type SugarPlot } from '../tracks/sugarScenery';
import { EnvironmentAssetScenery } from './EnvironmentAssetScenery';
import type { AssetStatusReporter } from './models/RaceAssetLoading';

function MarketPaving({ plots }: { plots: SugarPlot[] }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const object = new Object3D(), color = new Color();
    plots.forEach((plot, index) => {
      object.position.set(...plot.position); object.scale.set(...plot.size); object.rotation.y = plot.yaw; object.updateMatrix();
      mesh.current!.setMatrixAt(index, object.matrix); mesh.current!.setColorAt(index, color.set(plot.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [plots]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, plots.length]} receiveShadow><boxGeometry /><meshStandardMaterial roughness={0.95} /></instancedMesh>;
}
export function SugarScenery({ track, statusFor }: { track: SampledTrack; statusFor: (id: string) => AssetStatusReporter }) {
  const layout = useMemo(() => sugarScenery(track), [track]);
  return <group name="sugar-rush-market-valley">
    <MarketPaving plots={layout.plots} />
    <EnvironmentAssetScenery placements={layout.placements} assetIds={sugarEnvironmentIds} statusFor={statusFor} />
  </group>;
}
