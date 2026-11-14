import type { TrialRecords } from '../../timeTrial/TrialRecords';
import { TimeTrialRecordSummary } from '../TimeTrialHUD';
import { difficultyDefinition, lapLabel } from '../../config/raceOptions';
import { RaceOptionsScreen } from './RaceOptionsScreen';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { driverAssets, kartAssets } from '../../config/visualAssets';
import { preloadAssembly } from '../../render/KartAssembly';
import { SelectionGrid } from '../selection/SelectionGrid';
import { SelectionPreview } from '../selection/SelectionPreview';
import type { RaceFlowStore } from './raceFlowStore';
import { RaceFlowShell, StepFooter, StepHeader } from './RaceFlowShell';
import { modeDefinition, setupSteps, sunshineCup, type FlowStep } from './menuCatalog';
import { trackDefinition } from '../../tracks/trackCatalog';
import { TrackSelectScreen } from './TrackSelectScreen';
import { useMenuNavigation } from './useMenuNavigation';

export function RacerSelectScreen({ store }: { store: RaceFlowStore }) {
  const state = store.getSnapshot();
  return <><SelectionGrid step="racer" selectedIndex={state.racerIndex} selection={store.selection()} onSelect={store.choose} /><SelectionPreview key={state.selectedRacer} step="racer" driver={driverAssets[state.selectedRacer]} kart={kartAssets[state.selectedKart]} /></>;
}
export function KartSelectScreen({ store }: { store: RaceFlowStore }) {
  const state = store.getSnapshot();
  return <><SelectionGrid step="kart" selectedIndex={state.kartIndex} selection={store.selection()} onSelect={store.choose} /><SelectionPreview key={`${state.selectedRacer}:${state.selectedKart}`} step="kart" driver={driverAssets[state.selectedRacer]} kart={kartAssets[state.selectedKart]} /></>;
}
function ReadyScreen({ store, records }: { store: RaceFlowStore; records?: TrialRecords }) {
  const state = store.getSnapshot(), mode = modeDefinition(state.currentMode), driver = driverAssets[state.selectedRacer], kart = kartAssets[state.selectedKart];
  return <><section className="race-ready"><span className="flow-overline">YOUR NEXT ADVENTURE</span><h3>Your grid.<br /><em>Your moment.</em></h3><dl>{[['Mode', mode.name], ['Racer', driver.name], ['Kart', kart.name], [state.currentMode === 'grand-prix' ? 'Cup' : 'Track', state.currentMode === 'grand-prix' ? sunshineCup.name : trackDefinition(state.selectedTrack).name], ...(state.currentMode === 'vs-race' ? [['Race length', lapLabel(state.vsOptions.laps)], ['CPU difficulty', difficultyDefinition(state.vsOptions.difficulty).name]] : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>{state.currentMode === 'grand-prix' ? `${sunshineCup.tracks.length} races · three CPU rivals · 10 / 7 / 4 / 1 points per round. Your total decides the championship.` : state.currentMode === 'vs-race' ? `${lapLabel(state.vsOptions.laps)} · ${difficultyDefinition(state.vsOptions.difficulty).name} CPU · Your settings are saved when you start.` : mode.detail}</p>{state.currentMode === 'time-trial' && records && <TimeTrialRecordSummary records={records} track={trackDefinition(state.selectedTrack).track} />}</section><SelectionPreview step="kart" driver={driver} kart={kart} /></>;
}
const titles: Record<FlowStep, [string, string]> = {
  cup: ['Cup Select', 'A little adventure starts with a sunny first stop.'], racer: ['Racer Select', 'Choose the personality behind the wheel.'], kart: ['Kart Select', 'Find the perfect ride for your little legend.'],
  options: ['Race Options', 'Set your distance. Choose the pace. Make it your race.'],
  track: ['Track Select', 'Pick the place you’ll make your mark.'], ready: ['Ready to race', 'Your lineup is ready. The next move is yours.'],
};
export function RaceSetupScreen({ store, records, tools, onComplete, onClose, returnFocusElement }: { store: RaceFlowStore; records?: TrialRecords; tools?: ReactNode; onComplete: (action: 'start' | 'save') => void; onClose: () => void; returnFocusElement?: HTMLElement | null }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot), step = state.currentStep;
  const kart = kartAssets[state.selectedKart], driver = driverAssets[state.selectedRacer];
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
  return <RaceFlowShell navigation={navigation} inert={state.panel !== 'none'} revision={`${step}:${state.selectedRacer}:${state.selectedKart}`}
    header={<StepHeader title={step === 'track' && state.currentMode === 'grand-prix' ? 'Cup itinerary' : titles[step][0]} subtitle={titles[step][1]} mode={state.intent === 'cosmetic' ? 'YOUR LINEUP' : modeDefinition(state.currentMode).name} steps={setupSteps(state.currentMode, state.intent === 'cosmetic')} step={step} tools={tools} />}
    footer={<StepFooter context={`${driver.name} / ${kart.name}`} confirm={confirmLabel} onBack={back} onConfirm={confirm} />}>
    <div className="flow-step-content" key={step}>{step === 'racer' ? <RacerSelectScreen store={store} /> : step === 'kart' ? <KartSelectScreen store={store} /> : step === 'options' ? <RaceOptionsScreen store={store} /> : step === 'ready' ? <ReadyScreen store={store} records={records} /> : <TrackSelectScreen store={store} records={records} cup={step === 'cup'} />}</div>
    <span className="selection-announcement" aria-live="polite">{titles[step][0]}. {step === 'racer' ? driver.name : step === 'kart' ? kart.name : step === 'options' ? `${lapLabel(state.vsOptions.laps)}, ${difficultyDefinition(state.vsOptions.difficulty).name} CPU` : state.currentMode === 'grand-prix' ? sunshineCup.name : trackDefinition(state.selectedTrack).name}.</span>
  </RaceFlowShell>;
}
