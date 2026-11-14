import { Suspense, useCallback, useState } from 'react';
import { View, useGLTF } from '@react-three/drei';
import type { DriverAssetDefinition, KartAssetDefinition } from '../../config/visualAssets';
import type { AssetStatus } from '../../render/KartVisual';
import { PreviewBoundary } from '../GaragePreview';
import { SelectionModel } from './SelectionModel';
import type { SelectionStep } from './selectionStore';

export function SelectionPreview({ step, driver, kart, animate = false }: { step: SelectionStep; driver: DriverAssetDefinition; kart: KartAssetDefinition; animate?: boolean }) {
  const [status, setStatus] = useState<AssetStatus>('loading'), [retry, setRetry] = useState(0);
  const ready = useCallback(() => setStatus('ready'), []);
  const asset = step === 'racer' ? driver : kart;
  return <section className="selection-preview" aria-label={`${asset.name}, 3D preview`}>
    <div className="selection-preview-top"><span><i /> LIVE SHOWROOM</span><span>{step === 'racer' ? 'MEET YOUR RACER' : `DRIVEN BY ${driver.name.toUpperCase()}`}</span></div>
    <div className="selection-stage"><div className="selection-stage-ring" aria-hidden="true" /><span className="selection-stage-mark" aria-hidden="true">{step === 'racer' ? '01' : '02'}</span>
      <View className="selection-hero-model" index={20} key={retry} aria-hidden="true"><PreviewBoundary onStatus={setStatus}><Suspense fallback={null}><SelectionModel driver={driver} kart={kart} kind={step} animate={animate} onReady={ready} /></Suspense></PreviewBoundary></View>
      {status !== 'ready' && <div className="selection-preview-loading" role={status === 'error' ? 'alert' : 'status'}>{status === 'error' ? <><strong>Preview unavailable</strong><span>You can still choose this appearance.</span><button type="button" data-selection-action onClick={() => { useGLTF.clear(driver.url); useGLTF.clear(kart.url); setStatus('loading'); setRetry(value => value + 1); }}>Retry preview</button></> : <><span className="selection-spinner" />Rolling into the showroom…</>}</div>}
    </div>
    <div className="selection-nameplate" key={asset.id}><div><span>{step === 'racer' ? 'YOUR RACER' : 'YOUR KART'}</span><h3>{asset.name}</h3></div><span className="selection-name-arrow" aria-hidden="true">↗</span></div>
    <p className="selection-description" key={`${asset.id}:description`}>{asset.description}</p>
  </section>;
}
