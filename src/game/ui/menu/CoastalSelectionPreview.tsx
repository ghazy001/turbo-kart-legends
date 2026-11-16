import type { DriverAssetDefinition, KartAssetDefinition } from '../../config/visualAssets';
import { HomeScene } from './HomeScene';

export function CoastalSelectionPreview({ step, driver, kart }: {
  step: 'racer' | 'kart'; driver: DriverAssetDefinition; kart: KartAssetDefinition;
}) {
  const asset = step === 'racer' ? driver : kart;
  return <section className="selection-preview coastal-selection-preview" aria-label={`${asset.name}, 3D preview`}>
    <div className="selection-stage"><HomeScene driver={driver} kart={kart} kind={step} scenery={step === 'racer' ? 'terrace' : 'road'} className="coastal-scenery-view" tint /></div>
    <div className="coastal-preview-name" key={asset.id}>
      <h3>{asset.name}</h3><p>{step === 'kart' ? `Driven by ${driver.name}` : asset.description}</p>
    </div>
  </section>;
}
