import type { TrialRecords } from '../../timeTrial/TrialRecords';
import { TimeTrialRecordSummary } from '../TimeTrialHUD';
import { difficultyDefinition, lapLabel } from '../../config/raceOptions';
import { RaceOptionsScreen } from './RaceOptionsScreen';
import { cupPoints } from '../../race/CupSession';
import { useEffect, useSyncExternalStore } from 'react';
import { driverAssets, kartAssets } from '../../config/visualAssets';
import { preloadAssembly } from '../../render/KartAssembly';
import { SelectionGrid } from '../selection/SelectionGrid';
import type { RaceFlowStore } from './raceFlowStore';
import { RaceFlowShell, StepFooter, StepHeader } from './RaceFlowShell';
import { modeDefinition, setupSteps, sunshineCup, type FlowStep } from './menuCatalog';
import { trackDefinition } from '../../tracks/trackCatalog';
import { TrackSelectScreen } from './TrackSelectScreen';
import { useMenuNavigation } from './useMenuNavigation';
import { CoastalSelectionPreview } from './CoastalSelectionPreview';
import { HomeScene } from './HomeScene';
import '../../../styles/coastalSelection.css';
import '../../../styles/coastalSetup.css';
import '../../../styles/racerCards.css';
import '../../../styles/kartCards.css';

export function RacerSelectScreen({ store }: { store: RaceFlowStore }) {
  const state = store.getSnapshot();
  return <><SelectionGrid step="racer" selectedIndex={state.racerIndex} selection={store.selection()} onSelect={store.choose} /><CoastalSelectionPreview key={state.selectedRacer} step="racer" driver={driverAssets[state.selectedRacer]} kart={kartAssets[state.selectedKart]} /></>;
}
export function KartSelectScreen({ store }: { store: RaceFlowStore }) {
  const state = store.getSnapshot();
  return <><SelectionGrid step="kart" selectedIndex={state.kartIndex} selection={store.selection()} onSelect={store.choose} /><CoastalSelectionPreview key={`${state.selectedRacer}:${state.selectedKart}`} step="kart" driver={driverAssets[state.selectedRacer]} kart={kartAssets[state.selectedKart]} /></>;
}
function ReadyScreen({ store, records }: { store: RaceFlowStore; records?: TrialRecords }) {
  const state = store.getSnapshot(), driver = driverAssets[state.selectedRacer], kart = kartAssets[state.selectedKart];
  const championship = state.currentMode === 'grand-prix';
  const details = [
    ['Racer', driver.name], ['Kart', kart.name],
    ['Race length', championship ? `${sunshineCup.tracks.length} races · 3 laps each` : lapLabel(state.currentMode === 'vs-race' ? state.vsOptions.laps : 3)],
    ['Rivals', state.currentMode === 'time-trial' ? 'Solo' : state.currentMode === 'vs-race' ? `3 CPU · ${difficultyDefinition(state.vsOptions.difficulty).name}` : '3 CPU · Normal'],
  ];
  return <><section className="race-ready" aria-label="Race setup summary">
    <h3>{championship ? sunshineCup.name : trackDefinition(state.selectedTrack).name}</h3>
    <dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>{championship ? `${cupPoints.join(' / ')} points per round. Highest total wins the cup.` : state.currentMode === 'time-trial' ? 'No items. Chase your cleanest run.' : 'Items enabled.'}</p>
    {state.currentMode === 'time-trial' && records && <TimeTrialRecordSummary records={records} track={trackDefinition(state.selectedTrack).track} />}
  </section><CoastalSelectionPreview step="kart" driver={driver} kart={kart} /></>;
}
const titles: Record<FlowStep, [string, string]> = {
  cup: ['Cup Select', 'A little adventure starts with a sunny first stop.'], racer: ['Racer Select', 'Choose the personality behind the wheel.'], kart: ['Kart Select', 'Find the perfect ride for your little legend.'],
  options: ['Race Options', 'Set your distance. Choose the pace. Make it your race.'],
  track: ['Track Select', 'Pick the place you’ll make your mark.'], ready: ['Ready to race', 'Your lineup is ready. The next move is yours.'],
};
export function RaceSetupScreen({ store, records, onComplete, onClose, returnFocusElement }: { store: RaceFlowStore; records?: TrialRecords; onComplete: (action: 'start' | 'save') => void; onClose: () => void; returnFocusElement?: HTMLElement | null }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot), step = state.currentStep;
  const kart = kartAssets[state.selectedKart], driver = driverAssets[state.selectedRacer];
  const sceneryOnly = step === 'track' || step === 'cup' || step === 'options';
  useEffect(() => { preloadAssembly(kart, driver); }, [kart, driver]);
  const back = () => { const steps = setupSteps(state.currentMode, state.intent === 'cosmetic'); if (step === steps[0]) onClose(); else store.back(); };
  const confirm = () => { const action = store.next(); if (action) onComplete(action); };
  const navigation = useMenuNavigation(action => {
    if (action === 'back') back(); else if (action === 'confirm') confirm(); else {
      store.move(action);
      requestAnimationFrame(() => navigation.ref.current?.querySelector<HTMLElement>('.selection-card[aria-checked="true"], [data-menu-current="true"]')?.scrollIntoView({ block: 'nearest' }));
    }
  }, `${step}:${state.racerIndex}:${state.kartIndex}:${state.trackIndex}:${state.optionsIndex}:${state.vsOptions.laps}:${state.vsOptions.difficulty}`, state.panel === 'none', returnFocusElement);
  const confirmLabel = state.intent === 'cosmetic' && step === 'kart' ? 'Save lineup' : step === 'ready' ? state.currentMode === 'grand-prix' ? 'Start cup' : 'Start race' : step === 'options' ? 'Review lineup' : step === 'track' ? state.currentMode === 'vs-race' ? 'Race options' : 'Review lineup' : step === 'racer' ? 'Choose kart' : step === 'kart' ? 'Choose track' : 'Choose racer';
  return <RaceFlowShell coastal step={step} navigation={navigation} inert={state.panel !== 'none'} revision={`${step}:${state.selectedRacer}:${state.selectedKart}:${state.selectedTrack}`}
    header={<StepHeader title={step === 'track' && state.currentMode === 'grand-prix' ? 'Cup itinerary' : titles[step][0]} subtitle={titles[step][1]} mode={state.intent === 'cosmetic' ? 'YOUR LINEUP' : modeDefinition(state.currentMode).name} steps={setupSteps(state.currentMode, state.intent === 'cosmetic')} step={step} tools={null} quiet />}
    footer={<StepFooter context={`${driver.name} / ${kart.name}`} confirm={confirmLabel} onBack={back} onConfirm={confirm} />}>
    {sceneryOnly && <HomeScene driver={driver} kart={kart} className="setup-scenery-view" showSubject={false} tint />}
    <div className="flow-step-content" key={step}>{step === 'racer' ? <RacerSelectScreen store={store} /> : step === 'kart' ? <KartSelectScreen store={store} /> : step === 'options' ? <RaceOptionsScreen store={store} /> : step === 'ready' ? <ReadyScreen store={store} records={records} /> : <TrackSelectScreen store={store} records={records} cup={step === 'cup'} />}</div>
    <span className="selection-announcement" aria-live="polite">{titles[step][0]}. {step === 'racer' ? driver.name : step === 'kart' ? kart.name : step === 'options' ? `${lapLabel(state.vsOptions.laps)}, ${difficultyDefinition(state.vsOptions.difficulty).name} CPU` : state.currentMode === 'grand-prix' ? sunshineCup.name : trackDefinition(state.selectedTrack).name}.</span>
  </RaceFlowShell>;
}
