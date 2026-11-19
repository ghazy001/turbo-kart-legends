import { useGLTF } from '@react-three/drei';
import { driverAssets, kartAssets, type VisualSelection } from '../../config/visualAssets';
import { opponentSelections } from '../../config/visualSelection';
import { environmentAssets, environmentIdsForTrack } from '../../config/environmentAssets';
import { combatAssets, itemBoxAsset } from '../../config/itemConfig';
import { configureAssetLoader } from './assetLoader';
import { preloadAssembly } from '../KartAssembly';

/** Only the confirmed course/lineup; source archives and other courses are never prefetched. */
export function preloadRaceAssets(selection: VisualSelection, trackId: string, opponents: boolean) {
  for (const entry of [selection, ...(opponents ? opponentSelections(selection) : [])]) preloadAssembly(kartAssets[entry.kartId], driverAssets[entry.racerId]);
  for (const id of environmentIdsForTrack(trackId)) {
    const asset = environmentAssets[id];
    useGLTF.preload(asset.url, false, false, configureAssetLoader);
    if ('farUrl' in asset) useGLTF.preload(asset.farUrl, false, false, configureAssetLoader);
  }
  if (opponents) for (const url of [itemBoxAsset.url, combatAssets['spark-bolt'].url, combatAssets['banana-trap'].url]) useGLTF.preload(url, false, false, configureAssetLoader);
}
