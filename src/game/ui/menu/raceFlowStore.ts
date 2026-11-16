import { aiDifficulties, defaultRaceOptions, lapChoices, normalizeRaceOptions, type RaceOptions } from '../../config/raceOptions';
import { loadVSOptions } from '../../config/vsPreferences';
import { racers, karts, type RacerId, type KartId, type VisualSelection } from '../../config/visualAssets';
import { moveGrid, selectionGridColumns, type GridDirection } from '../selection/selectionStore';
import { gameModes, trackCatalog, modeDefinition, setupSteps, type FlowStep, type MenuMode, sunshineCup, type TrackId } from './menuCatalog';
import type { RaceKind } from '../../race/RaceSession';
import { trackGridColumns } from './trackArtwork';

export type MenuPanel = 'none' | 'settings' | 'controller' | 'phone';
export interface MenuPreferences { audioEnabled: boolean; selectedTrack: TrackId; mode: MenuMode }
export interface RaceFlowState {
  currentScreen: 'home' | 'setup'; currentMode: MenuMode; currentStep: FlowStep;
  selectedRacer: RacerId; selectedKart: KartId; selectedTrack: TrackId; selectedCup: 'sunshine-cup';
  vsOptions: Readonly<RaceOptions>; optionsIndex: 0 | 1;
  homeIndex: number; racerIndex: number; kartIndex: number; trackIndex: number;
  audioEnabled: boolean; panel: MenuPanel; panelReturn: MenuPanel; intent: 'race' | 'cosmetic';
}
export interface RaceLaunch { kind: RaceKind; mode: MenuMode; trackId: TrackId; selection: VisualSelection; cupId: typeof sunshineCup.id | null; options: Readonly<RaceOptions> }
const preferencesKey = 'turbo-kart-legends.menu.v1';
export function loadMenuPreferences(storage?: Pick<Storage, 'getItem'>): MenuPreferences {
  const defaults: MenuPreferences = { audioEnabled: true, selectedTrack: trackCatalog[0].id, mode: 'quick-race' };
  try {
    const value: unknown = JSON.parse((storage ?? localStorage).getItem(preferencesKey) ?? 'null');
    if (!value || typeof value !== 'object') return defaults;
    const saved = value as Partial<MenuPreferences> & { version?: number };
    if (saved.version !== 1) return defaults;
    return { audioEnabled: typeof saved.audioEnabled === 'boolean' ? saved.audioEnabled : true,
      selectedTrack: trackCatalog.find(track => track.id === saved.selectedTrack)?.id ?? defaults.selectedTrack,
      mode: gameModes.find(mode => mode.id === saved.mode)?.id ?? defaults.mode };
  } catch { return defaults; }
}
export function saveMenuPreferences(state: Pick<RaceFlowState, 'audioEnabled' | 'selectedTrack' | 'currentMode'>, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? localStorage).setItem(preferencesKey, JSON.stringify({ version: 1, audioEnabled: state.audioEnabled, selectedTrack: state.selectedTrack, mode: state.currentMode })); return true; }
  catch { return false; }
}
/** Frontend-only state. A launch descriptor is the sole handoff to the existing race. */
export function createRaceFlowStore(selection: VisualSelection, preferences = loadMenuPreferences(), vsDefaults = loadVSOptions()) {
  let committed = { ...selection }, committedTrack = preferences.selectedTrack;
  let committedVS = Object.freeze(normalizeRaceOptions(vsDefaults));
  const panelHistory: MenuPanel[] = [];
  let state: RaceFlowState = { currentScreen: 'home', currentMode: preferences.mode, currentStep: 'racer',
    selectedRacer: selection.racerId, selectedKart: selection.kartId, selectedTrack: committedTrack, selectedCup: 'sunshine-cup', vsOptions: committedVS, optionsIndex: 0,
    homeIndex: gameModes.findIndex(mode => mode.id === preferences.mode), racerIndex: racers.findIndex(asset => asset.id === selection.racerId),
    kartIndex: karts.findIndex(asset => asset.id === selection.kartId), trackIndex: trackCatalog.findIndex(track => track.id === committedTrack), audioEnabled: preferences.audioEnabled, panel: 'none', panelReturn: 'none', intent: 'race' };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<RaceFlowState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const restore = () => ({ vsOptions: committedVS, optionsIndex: 0 as const, selectedRacer: committed.racerId, selectedKart: committed.kartId, selectedTrack: committedTrack,
    racerIndex: racers.findIndex(asset => asset.id === committed.racerId), kartIndex: karts.findIndex(asset => asset.id === committed.kartId), trackIndex: trackCatalog.findIndex(track => track.id === committedTrack) });
  const api = {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    selectHome(index: number) { if (index >= 0 && index <= gameModes.length && index !== state.homeIndex) update({ homeIndex: index }); },
    begin(mode: MenuMode, intent: 'race' | 'cosmetic' = 'race') { panelHistory.length = 0; update({ ...restore(), currentScreen: 'setup', currentMode: mode, currentStep: setupSteps(mode, intent === 'cosmetic')[0], intent, panel: 'none', panelReturn: 'none', homeIndex: gameModes.findIndex(entry => entry.id === mode) }); },
    home() { panelHistory.length = 0; update({ ...restore(), currentScreen: 'home', panel: 'none', panelReturn: 'none' }); },
    panel(panel: MenuPanel) {
      if (panel === 'none') panelHistory.length = 0;
      else if (state.panel !== 'none' && state.panel !== panel) panelHistory.push(state.panel);
      update({ panel, panelReturn: panelHistory.at(-1) ?? 'none' });
    },
    audio(enabled: boolean) { update({ audioEnabled: enabled }); },
    configureVS(patch: Partial<RaceOptions>, row: 0 | 1 = state.optionsIndex) {
      if (state.currentMode !== 'vs-race' || state.intent !== 'race' || state.currentStep !== 'options') return;
      update({ vsOptions: Object.freeze(normalizeRaceOptions({ ...state.vsOptions, ...patch })), optionsIndex: row });
    },
    choose(index: number) {
      if (state.currentStep === 'racer') { const entry = racers[index]; if (entry && !entry.locked && entry.id !== state.selectedRacer) update({ selectedRacer: entry.id as RacerId, racerIndex: index }); }
      if (state.currentStep === 'kart') { const entry = karts[index]; if (entry && !entry.locked && entry.id !== state.selectedKart) update({ selectedKart: entry.id as KartId, kartIndex: index }); }
      if (state.currentStep === 'track' && state.currentMode !== 'grand-prix') { const entry = trackCatalog[index]; if (entry && entry.id !== state.selectedTrack) update({ selectedTrack: entry.id, trackIndex: index }); }
    },
    move(direction: GridDirection) {
      if (state.currentScreen === 'home') { api.selectHome((state.homeIndex + (direction === 'up' || direction === 'left' ? gameModes.length : 1)) % (gameModes.length + 1)); return; }
      if (state.currentStep === 'options') {
        if (direction === 'up' || direction === 'down') { update({ optionsIndex: state.optionsIndex === 0 ? 1 : 0 }); return; }
        const offset = direction === 'left' ? -1 : 1;
        if (state.optionsIndex === 0) api.configureVS({ laps: lapChoices[(lapChoices.indexOf(state.vsOptions.laps) + offset + lapChoices.length) % lapChoices.length] });
        else api.configureVS({ difficulty: aiDifficulties[(aiDifficulties.findIndex(entry => entry.id === state.vsOptions.difficulty) + offset + aiDifficulties.length) % aiDifficulties.length].id });
        return;
      }
      const entries = state.currentStep === 'racer' ? racers : state.currentStep === 'kart' ? karts : trackCatalog;
      if (!['racer', 'kart', 'track'].includes(state.currentStep) || state.currentStep === 'track' && state.currentMode === 'grand-prix') return;
      let index = state.currentStep === 'racer' ? state.racerIndex : state.currentStep === 'kart' ? state.kartIndex : state.trackIndex;
      for (let count = 0; count < entries.length; count++) {
        index = moveGrid(index, direction, entries.length, state.currentStep === 'track' ? trackGridColumns : selectionGridColumns[state.currentStep === 'kart' ? 'kart' : 'racer']);
        const candidate = entries[index];
        if (!('locked' in candidate) || !candidate.locked) { api.choose(index); return; }
      }
    },
    next(): 'start' | 'save' | null {
      const steps = setupSteps(state.currentMode, state.intent === 'cosmetic'), index = steps.indexOf(state.currentStep);
      if (index === steps.length - 1) return state.intent === 'cosmetic' ? 'save' : 'start';
      update({ currentStep: steps[index + 1] }); return null;
    },
    back() {
      if (state.panel !== 'none') { update({ panel: panelHistory.pop() ?? 'none', panelReturn: panelHistory.at(-1) ?? 'none' }); return; }
      const steps = setupSteps(state.currentMode, state.intent === 'cosmetic'), index = steps.indexOf(state.currentStep);
      if (state.currentScreen === 'setup' && index > 0) update({ currentStep: steps[index - 1] }); else api.home();
    },
    commit() { committed = { racerId: state.selectedRacer, kartId: state.selectedKart }; committedTrack = state.selectedTrack; if (state.currentMode === 'vs-race' && state.intent === 'race') committedVS = Object.freeze({ ...state.vsOptions }); },
    selection: (): VisualSelection => ({ racerId: state.selectedRacer, kartId: state.selectedKart }),
    launch: (): RaceLaunch => ({ kind: modeDefinition(state.currentMode).kind, mode: state.currentMode, trackId: state.currentMode === 'grand-prix' ? sunshineCup.tracks[0] : state.selectedTrack,
      selection: api.selection(), cupId: state.currentMode === 'grand-prix' ? sunshineCup.id : null,
      options: state.currentMode === 'vs-race' ? Object.freeze({ ...state.vsOptions }) : defaultRaceOptions }),
  };
  return api;
}
export type RaceFlowStore = ReturnType<typeof createRaceFlowStore>;
