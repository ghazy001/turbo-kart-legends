import { createRaceSeed } from './createRaceSeed';
import { TrialRecords } from '../game/timeTrial/TrialRecords';
import { difficultyDefinition } from '../game/config/raceOptions';
import { saveVSOptions } from '../game/config/vsPreferences';
import { RemoteHost } from '../phone/RemoteHost';
import { PhoneControllerPanel } from '../game/ui/menu/PhoneControllerPanel';
import { loadSelection, saveSelection } from '../game/config/visualSelection';
import type { VisualSelection } from '../game/config/visualAssets';
import { MainMenuScreen } from '../game/ui/menu/MainMenuScreen';
import { RaceSetupScreen } from '../game/ui/menu/RaceSetupScreen';
import { createRaceFlowStore, saveMenuPreferences, type MenuPanel } from '../game/ui/menu/raceFlowStore';
import { SettingsScreen, ControllerSettingsPanel } from '../game/ui/menu/SettingsScreen';
import { MenuTools } from '../game/ui/menu/MenuIcons';
import { modeDefinition } from '../game/ui/menu/menuCatalog';
import '../styles/garage.css';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActionInput } from '../game/controls/actionInput';
import { createKeyboard } from '../game/controls/keyboard';
import type { GameMode } from '../game/core/types';
import { GameCanvas } from '../game/render/GameCanvas';
import type { GameRuntime } from '../game/render/runtime';
import { sunshineCircuit } from '../game/tracks/sunshineCircuit';
import { trackDefinition, sunshineCup } from '../game/tracks/trackCatalog';
import { CupSession } from '../game/race/CupSession';
import { CupResultsMenu } from '../game/ui/CupResultsMenu';
import { HUD } from '../game/ui/HUD';
import { PauseMenu } from '../game/ui/PauseMenu';
import { ResultsMenu } from '../game/ui/ResultsMenu';
import { resultCue } from '../game/ui/results/resultsPresentation';
import { GamepadController } from '../game/controls/gamepad';
import { DrivingAudio } from '../game/render/DrivingAudio';
import { RaceSession, raceKindNames, type RaceKind } from '../game/race/RaceSession';

const Diagnostics = import.meta.env.DEV && new URLSearchParams(window.location.search).has('race-preview')
  ? lazy(() => import('../game/dev/RaceDiagnostics').then(module => ({ default: module.RaceDiagnostics }))) : null;

// Reload rather than retain a stale race/controller instance through Fast Refresh.
if (import.meta.hot) {
  import.meta.hot.accept([
    '../game/timeTrial/TrialRun', '../game/timeTrial/TrialRecords', '../game/timeTrial/trialRules', '../game/timeTrial/ghostPlayback', '../game/config/timeTrialConfig',
    '../game/items/ItemSystem', '../game/items/itemAI', '../game/items/itemRewards', '../game/config/itemBalance', '../game/items/itemCollision', '../game/config/itemConfig', '../game/controls/actionInput', '../game/ui/menu/raceFlowStore', '../game/ui/menu/menuCatalog', '../game/kart/kartCollision', '../game/kart/kartFootprint', '../game/race/racerCollision', '../game/config/kartConfig', '../game/config/raceOptions', '../game/config/raceConfig', '../game/core/simulation', '../game/race/RaceSession', '../game/race/raceProgress',
    '../game/ai/waypointController', '../game/controls/keyboard', '../game/controls/gamepad',
    '../game/render/DrivingAudio', '../game/tracks/sunshineCircuit', '../game/tracks/sugarRushValley', '../game/tracks/frostbitePeak', '../game/tracks/frostbiteScenery', '../game/tracks/volcanoSprint', '../game/tracks/volcanoScenery', '../game/tracks/trackCatalog', '../game/race/CupSession',
    '../phone/RemoteHost', '../phone/RemoteInput', '../game/controls/inputSources',
  ], () => window.location.reload());
}

export function App() {
  const [runtime] = useState<GameRuntime>(() => {
    const race = new RaceSession(sunshineCircuit, undefined, { seed: createRaceSeed() });
    return { records: new TrialRecords(), trialGhostVisible: true, race, simulation: race.player.simulation, mode: 'menu', uiInput: new ActionInput(), keyboard: null, gamepad: null, phone: new RemoteHost(), audio: new DrivingAudio(), demoDriving: false, selection: loadSelection() };
  });
  const [menuStore] = useState(() => createRaceFlowStore(runtime.selection));
  const menu = useSyncExternalStore(menuStore.subscribe, menuStore.getSnapshot);
  const [mode, setMode] = useState<GameMode>('menu');
  const [cup, setCup] = useState<CupSession | null>(null);
  const [sceneRevision, setSceneRevision] = useState(0);
  const [panelOrigin, setPanelOrigin] = useState<HTMLElement | null>(null);
  const overlayOpen = useRef(false);
  const phoneStatus = useSyncExternalStore(runtime.phone.subscribe, runtime.phone.getSnapshot);
  const setupOpen = menu.currentScreen === 'setup';
  const panelOpen = menu.panel !== 'none';
  const [storageFailed, setStorageFailed] = useState(false);
  const applySelection = (next: VisualSelection) => {
    runtime.selection = next; menuStore.commit(); setStorageFailed(!saveSelection(next));
  };
  const [sceneFailed, setSceneFailed] = useState(false);
  const muted = !menu.audioEnabled;
  const changeMode = useCallback((next: GameMode) => {
    runtime.keyboard?.clear(); runtime.gamepad?.clear(); runtime.phone.clear(); runtime.uiInput.clear();
    if (next === 'playing') runtime.audio.unlock();
    else { runtime.race.pause(); runtime.audio.silence(); }
    runtime.simulation.clock.reset(); runtime.mode = next; setMode(next);
  }, [runtime]);
  const reset = useCallback(() => {
    if (runtime.mode === 'results' || runtime.mode === 'menu') return;
    runtime.keyboard?.clear(); runtime.gamepad?.clear(); runtime.phone.clear(); runtime.uiInput.clear();
    runtime.race.recover(); runtime.audio.reset();
    if (runtime.mode === 'playing' && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [runtime]);
  const start = useCallback((kind: RaceKind) => {
    runtime.keyboard?.clear(); runtime.gamepad?.clear(); runtime.phone.clear(); runtime.uiInput.clear(); runtime.audio.reset();
    runtime.race.start(kind);
    runtime.race.trial.reference = kind === 'time-trial' ? runtime.records.get(runtime.race.track, runtime.race.options.laps) : null;
    changeMode('playing');
  }, [runtime, changeMode]);
  const installRace = useCallback((race: RaceSession) => {
    runtime.race = race; runtime.simulation = race.player.simulation;
    race.trial.reference = race.kind === 'time-trial' ? runtime.records.get(race.track, race.options.laps) : null;
    setSceneRevision(value => value + 1); runtime.audio.reset(); changeMode('playing');
  }, [runtime, changeMode]);
  const restart = useCallback(() => {
    if (cup) { if (cup.restartRound()) { runtime.audio.reset(); changeMode('playing'); } }
    else start(runtime.race.kind);
  }, [cup, runtime, start, changeMode]);
  const restartCup = () => { const next = new CupSession(sunshineCup, createRaceSeed()); setCup(next); installRace(next.race); };
  const nextCupRace = () => { const next = cup?.nextRound(); if (next) installRace(next); };
  const backToMenu = useCallback(() => {
    runtime.race.start('free-drive'); setCup(null); menuStore.home(); changeMode('menu');
  }, [runtime, changeMode, menuStore]);
  const pause = useCallback(() => { if (runtime.mode === 'playing') changeMode('paused'); }, [runtime, changeMode]);
  const openPanel = (panel: MenuPanel) => {
    setPanelOrigin(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    pause(); runtime.keyboard?.clear(); runtime.gamepad?.clear(); runtime.phone.clear(); runtime.uiInput.clear(); menuStore.panel(panel);
    if (panel === 'phone') { const status = runtime.phone.getSnapshot(); if (!status.offer && !status.busy) runtime.phone.pair(); }
  };
  const completeSetup = (action: 'start' | 'save') => {
    const launch = menuStore.launch(); applySelection(launch.selection); menuStore.home();
    if (action === 'start') {
      if (launch.mode === 'vs-race' && !saveVSOptions(launch.options)) setStorageFailed(true);
      if (launch.cupId) restartCup();
      else { const race = new RaceSession(trackDefinition(launch.trackId).track, launch.options, { seed: createRaceSeed() }); race.start(launch.kind); setCup(null); installRace(race); }
    }
  };
  const finish = useCallback(() => {
    if (runtime.race.kind === 'time-trial') runtime.records.complete(runtime.race.trial);
    cup?.recordFinish(runtime.race); changeMode('results');
    runtime.audio.celebrate(resultCue(runtime.race, cup));
  }, [cup, runtime, changeMode]);
  const sceneError = useCallback(() => { changeMode('menu'); setSceneFailed(true); }, [changeMode]);
  const toggleSound = useCallback(() => {
    runtime.audio.unlock(); menuStore.audio(!menu.audioEnabled);
    if (runtime.mode === 'playing' && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [runtime, menuStore, menu.audioEnabled]);
  useEffect(() => {
    runtime.audio.setMuted(!menu.audioEnabled);
    if (!saveMenuPreferences({ audioEnabled: menu.audioEnabled, selectedTrack: menu.selectedTrack, currentMode: menu.currentMode })) setStorageFailed(true);
  }, [runtime, menu.audioEnabled, menu.currentMode, menu.selectedTrack]);
  useEffect(() => {
    const togglePause = () => {
      if (overlayOpen.current) return;
      if (runtime.mode === 'playing' || runtime.mode === 'paused') changeMode(runtime.mode === 'playing' ? 'paused' : 'playing');
    };
    const loseFocus = () => { runtime.audio.silence(); if (runtime.mode === 'playing') changeMode('paused'); };
    const keyboard = createKeyboard(window, document, {
      enabled: () => runtime.mode === 'playing', onReset: reset, onPause: togglePause, onFocusLost: loseFocus,
    });
    runtime.gamepad = new GamepadController(() => navigator.getGamepads?.() ?? [], {
      enabled: () => runtime.mode === 'playing', onPause: togglePause, onReset: reset, onDisconnect: loseFocus,
    });
    runtime.keyboard = keyboard;
    return () => { keyboard.dispose(); runtime.keyboard = null; runtime.gamepad = null; runtime.audio.dispose(); };
  }, [runtime, reset, changeMode]);
  useEffect(() => {
    overlayOpen.current = mode === 'menu' || setupOpen || panelOpen;
    runtime.phone.setGameState({ mode, enabled: mode === 'playing' && !setupOpen && !panelOpen, itemsEnabled: runtime.race.items.enabled });
  }, [runtime, mode, setupOpen, panelOpen]);
  useEffect(() => {
    runtime.phone.setHandlers({ unsafe: pause, pause: () => {
      if (!overlayOpen.current && (runtime.mode === 'playing' || runtime.mode === 'paused')) changeMode(runtime.mode === 'playing' ? 'paused' : 'playing');
    } });
    return () => runtime.phone.dispose();
  }, [runtime, pause, changeMode]);
  useEffect(() => {
    if (mode === 'playing' && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [mode]);

  const tools = <MenuTools audioEnabled={menu.audioEnabled} phoneConnected={phoneStatus.link.state === 'connected'} onSound={toggleSound} onController={() => openPanel('controller')} onPhone={() => openPanel('phone')} />;
  const sessionName = runtime.race.kind === 'free-drive' ? raceKindNames['free-drive'] : cup ? `${cup.definition.name} · RACE ${cup.round + 1}/${cup.definition.tracks.length}` : modeDefinition(menu.currentMode).name + (menu.currentMode === 'vs-race' ? ` · ${difficultyDefinition(runtime.race.options.difficulty).name.toUpperCase()} CPU` : '');
  return <main className={`game-shell mode-${mode}${mode === 'menu' || setupOpen ? ' selecting' : ''}`} data-race={runtime.race.kind} data-track={runtime.race.track.definition.id}>
    <div className="scene"><GameCanvas sceneRevision={sceneRevision} runtime={runtime} onError={sceneError} onFinish={finish} suspended={mode === 'menu' || mode === 'results' || setupOpen || panelOpen} /></div>
    {!sceneFailed && <>
      {mode !== 'menu' && <div inert={setupOpen || panelOpen} className={setupOpen || panelOpen ? 'selection-underlay' : undefined}>
        <header className="topbar"><div className="brand"><span className="brand-badge" aria-hidden="true">T<span>↗</span></span><span>TURBO KART<br /><strong>LEGENDS</strong></span></div><div className="session-tag"><span className="status-dot" />{runtime.race.track.definition.name.toUpperCase()}<span className="session-type">{sessionName}</span></div></header>
        {mode !== 'results' && <HUD key={`${sceneRevision}:${runtime.race.revision}`} runtime={runtime} onPause={pause} onReset={reset} />}
        <div className="game-menu-tools">{tools}</div>
        {mode === 'paused' && !setupOpen && !panelOpen && <PauseMenu onCustomize={() => menuStore.begin(menu.currentMode, 'cosmetic')} onResume={() => changeMode('playing')} onReset={reset} onRestart={restart} onMenu={backToMenu} muted={muted} onToggleSound={toggleSound} />}
        {mode === 'results' && (cup ? <CupResultsMenu key={cup.round} cup={cup} selection={runtime.selection} interactive={!setupOpen && !panelOpen} onNext={nextCupRace} onRestart={restartCup} onMenu={backToMenu} /> : <ResultsMenu key={runtime.race.revision} race={runtime.race} selection={runtime.selection} interactive={!setupOpen && !panelOpen} onRestart={restart} onMenu={backToMenu} />)}
      </div>}
      {mode === 'menu' && !setupOpen && <MainMenuScreen store={menuStore} tools={tools} />}
      {setupOpen && <RaceSetupScreen store={menuStore} records={runtime.records} tools={tools} onComplete={completeSetup} onClose={() => menuStore.home()} />}
      {menu.panel === 'settings' && <SettingsScreen audioEnabled={menu.audioEnabled} onAudio={toggleSound} onController={() => openPanel('controller')} onPhone={() => openPanel('phone')} onPractice={() => { menuStore.home(); setCup(null); const race = new RaceSession(trackDefinition(menu.selectedTrack).track); race.start('free-drive'); installRace(race); }} onClose={() => menuStore.back()} returnFocusElement={panelOrigin} />}
      {menu.panel === 'controller' && <ControllerSettingsPanel onClose={() => menuStore.back()} onPhone={() => openPanel('phone')} returnFocusElement={panelOrigin} />}
      {menu.panel === 'phone' && <PhoneControllerPanel host={runtime.phone} onClose={() => menuStore.back()} returnFocusElement={panelOrigin} />}
      {storageFailed && <p className="selection-notice" role="status">Preferences applied for this session. Browser storage is unavailable.</p>}
      {Diagnostics && <Suspense fallback={null}><Diagnostics runtime={runtime} /></Suspense>}
    </>}
  </main>;
}
