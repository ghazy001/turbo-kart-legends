import { sunshineEnvironmentIds } from '../config/environmentAssets';
import type { EnvironmentPlacement } from '../config/environmentAssets';
import type { AssetStatusReporter } from './models/RaceAssetLoading';
import { EnvironmentAssetScenery } from './EnvironmentAssetScenery';

export function SunshineAssetScenery({ placements, statusFor }: { placements: EnvironmentPlacement[]; statusFor: (id: string) => AssetStatusReporter }) {
  return <EnvironmentAssetScenery placements={placements} assetIds={sunshineEnvironmentIds} statusFor={statusFor} />;
}
