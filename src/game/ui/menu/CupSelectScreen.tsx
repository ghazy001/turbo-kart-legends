import { Suspense, useCallback, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { driverAssets, kartAssets } from '../../config/visualAssets';
import { podiumConfig } from '../../config/podiumConfig';
import { defaultRaceOptions } from '../../config/raceOptions';
import { cupPoints } from '../../race/CupSession';
import { TrophyModel } from '../../render/TrophyVisual';
import type { AssetStatus } from '../../render/KartVisual';
import { sunshineCup, trackDefinition } from '../../tracks/trackCatalog';
import { PreviewBoundary } from '../GaragePreview';
import { HomeScene } from './HomeScene';
import { TrackArtwork } from './TrackSelectScreen';
import type { RaceFlowStore } from './raceFlowStore';

function CupEmblem() {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M19 12h26v16c0 8-5 14-13 14S19 36 19 28V12Z" fill="currentColor" />
    <path d="M19 17H9v8c0 8 7 12 14 12m22-20h10v8c0 8-7 12-14 12" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
    <path d="M32 40v12m-12 3h24" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    <path d="m32 18 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8 2.5-5Z" fill="#315561" />
  </svg>;
}

function CupPreview({ store }: { store: RaceFlowStore }) {
  const state = store.getSnapshot();
  const [status, setStatus] = useState<AssetStatus>('loading'), [retry, setRetry] = useState(0);
  const ready = useCallback(() => setStatus('ready'), []);
  return <section className="selection-preview cup-art-preview" aria-label={`${sunshineCup.name}, 3D trophy preview`}>
    <div className="selection-stage cup-trophy-stage">
      <HomeScene driver={driverAssets[state.selectedRacer]} kart={kartAssets[state.selectedKart]} scenery="terrace" className="coastal-scenery-view" showSubject={false} tint>
        <PreviewBoundary key={retry} onStatus={setStatus}><Suspense fallback={null}>
          <group position={[0, 0.2, 0]} scale={2.65} rotation={[0, -0.18, 0]}><TrophyModel onReady={ready} shadows /></group>
        </Suspense></PreviewBoundary>
      </HomeScene>
      {status !== 'ready' && <div className="selection-preview-loading" role={status === 'error' ? 'alert' : 'status'}>
        {status === 'error' ? <><strong>Preview unavailable</strong><span>Your championship is still ready to choose.</span>
          <button data-selection-action onClick={() => { useGLTF.clear(podiumConfig.trophy.url); setStatus('loading'); setRetry(value => value + 1); }}>Retry preview</button></>
          : <><span className="selection-spinner" />Polishing your trophy…</>}
      </div>}
    </div>
    <div className="coastal-preview-name cup-preview-copy"><span className="cup-preview-eyebrow">COAST TO CALDERA</span><h3>{sunshineCup.name}</h3><p>Four worlds. One championship.</p></div>
  </section>;
}

/** Read-only cup metadata and one selected option; all input/launch ownership stays in the shell. */
export function CupCollection({ selected }: { selected: boolean }) {
  return <section className="selection-roster cup-art-roster" aria-label="Cup collection">
    <div className="selection-grid cup-art-grid" role="radiogroup" aria-label="Choose cup">
      <button type="button" className="selection-card cup-art-card" role="radio" aria-label={sunshineCup.name} aria-describedby="cup-format"
        aria-checked={selected} data-menu-current={selected} data-selected={selected} data-artwork="true" tabIndex={0}>
        <span className="selection-card-art cup-card-mosaic" aria-hidden="true">{sunshineCup.tracks.map(id => <span key={id}><TrackArtwork course={trackDefinition(id)} thumbnail /></span>)}</span>
        <span className="selection-card-number" aria-hidden="true">01 / GRAND PRIX</span><span className="selection-card-picked" aria-hidden="true">✓</span>
        <span className="cup-card-emblem"><CupEmblem /></span>
        <span className="selection-card-label">{sunshineCup.name}</span>
      </button>
    </div>
    <div className="cup-collection-meta" id="cup-format"><span>{sunshineCup.tracks.length} races</span><span>{defaultRaceOptions.laps} laps each</span><span>3 CPU rivals</span></div>
    <ol className="cup-course-gallery" aria-label="Cup race order">{sunshineCup.tracks.map((id, index) => {
      const course = trackDefinition(id);
      return <li key={id}><div className="cup-round-art" aria-hidden="true"><TrackArtwork course={course} thumbnail /><span>{String(index + 1).padStart(2, '0')}</span></div><span>{course.name}</span></li>;
    })}</ol>
    <div className="cup-format-copy"><p><strong>{cupPoints.join(' / ')}</strong> points per finish</p><p>Highest total wins. Ties use finishing-place countback, then the final race.</p></div>
  </section>;
}

/** The existing single cup, presented in the shared card/preview shell. No race ownership. */
export function CupSelectScreen({ store }: { store: RaceFlowStore }) {
  return <><CupCollection selected={store.getSnapshot().selectedCup === sunshineCup.id} /><CupPreview store={store} /></>;
}
