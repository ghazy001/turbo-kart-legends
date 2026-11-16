import { useState } from 'react';
import type { DriverAssetDefinition, KartAssetDefinition } from '../../config/visualAssets';
import { HomeScene } from './HomeScene';
import { PreviewRotation } from '../selection/previewRotation';
import { RacerRotationSurface } from '../selection/RacerRotationSurface';

export function CoastalSelectionPreview({ step, driver, kart }: {
  step: 'racer' | 'kart'; driver: DriverAssetDefinition; kart: KartAssetDefinition;
}) {
  const asset = step === 'racer' ? driver : kart;
  const [rotation] = useState(() => new PreviewRotation());
  return <section className="selection-preview coastal-selection-preview" aria-label={`${asset.name}, 3D preview`}>
    <div className="selection-stage"><HomeScene driver={driver} kart={kart} kind={step} rotation={step === 'racer' ? rotation : undefined} scenery={step === 'racer' ? 'terrace' : 'road'} className="coastal-scenery-view" tint />
      {step === 'racer' && <RacerRotationSurface rotation={rotation} name={driver.name} />}
    </div>
    {step === 'kart' && <div className="coastal-preview-name" key={kart.id}>
      <h3>{kart.name}</h3><p>Driven by {driver.name}</p>
    </div>}
  </section>;
}
