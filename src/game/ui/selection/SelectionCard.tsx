import { Suspense, useCallback, useState, type CSSProperties } from 'react';
import { View } from '@react-three/drei';
import type { AssetInfo, DriverAssetDefinition, KartAssetDefinition } from '../../config/visualAssets';
import { PreviewBoundary } from '../GaragePreview';
import { SelectionModel } from './SelectionModel';
import type { SelectionStep } from './selectionStore';

export function SelectionCard({ asset, index, selected, step, driver, kart, onSelect }: {
  asset: AssetInfo; index: number; selected: boolean; step: SelectionStep;
  driver: DriverAssetDefinition; kart: KartAssetDefinition; onSelect: (index: number) => void;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [imageFailed, setImageFailed] = useState(false);
  const ready = useCallback(() => setStatus('ready'), []);
  const portrait = step === 'racer' ? driver.portrait : undefined;
  const showPortrait = portrait && !imageFailed;
  return <button type="button" className="selection-card" role="radio" aria-checked={selected} aria-disabled={asset.locked || undefined}
    aria-label={`${asset.name}${asset.locked ? ', locked' : ''}`} title={asset.locked ? asset.lockReason : undefined} tabIndex={selected ? 0 : -1} data-selected={selected} data-selection-index={index}
    data-portrait={Boolean(portrait)}
    style={{ '--card-color': asset.color, '--card-order': index, '--portrait-position': portrait?.position, '--portrait-scale': portrait?.scale } as CSSProperties}
    onClick={() => onSelect(index)}>
    <span className="selection-card-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
    {showPortrait ? <span className="selection-card-art" aria-hidden="true"><img src={portrait.url} alt="" decoding="async" draggable={false} onError={() => setImageFailed(true)} /></span> : <View className="selection-card-model" aria-hidden="true" index={index + 1}>
      <PreviewBoundary onStatus={setStatus}><Suspense fallback={null}><SelectionModel driver={driver} kart={kart} kind={step} thumbnail onReady={ready} /></Suspense></PreviewBoundary>
    </View>}
    {!showPortrait && status !== 'ready' && <span className="selection-card-fallback" aria-hidden="true">{status === 'error' ? asset.name.slice(0, 1) : '···'}</span>}
    {portrait && <span className="selection-card-picked" aria-hidden="true">✓</span>}
    <span className="selection-card-label">{asset.name}<span aria-hidden="true">{asset.locked ? '▣' : selected ? '✓' : ''}</span></span>
    <span className="selection-corners" aria-hidden="true"><i /><i /><i /><i /></span>
  </button>;
}
