import { useSyncExternalStore, type ReactNode } from 'react';
import { driverAssets, kartAssets } from '../../config/visualAssets';
import { SelectionPreview } from '../selection/SelectionPreview';
import { gameModes, trackCatalog } from './menuCatalog';
import type { RaceFlowStore } from './raceFlowStore';
import { RaceFlowShell, StepFooter, StepHeader } from './RaceFlowShell';
import { MenuIcon } from './MenuIcons';
import { useMenuNavigation } from './useMenuNavigation';
import '../../../styles/home.css';

export function HomeMenuList({ index, onSelect, onConfirm }: { index: number; onSelect: (index: number) => void; onConfirm: () => void }) {
  const items = [...gameModes, { id: 'settings', name: 'Settings', icon: 'settings', detail: 'Sound, controls & pocket wheel' }];
  return <nav className="home-menu-list" aria-label="Game modes">{items.map((item, i) => <button key={item.id} className="home-menu-item" data-menu-current={i === index} aria-current={i === index ? 'true' : undefined}
    aria-label={`${item.name} ${item.detail}`} tabIndex={i === index ? 0 : -1} onPointerEnter={() => onSelect(i)} onFocus={() => onSelect(i)} onClick={() => { onSelect(i); onConfirm(); }}>
    <span className="home-menu-icon"><MenuIcon name={item.icon} /></span><span className="home-menu-label"><strong>{item.name}</strong><small>{item.detail}</small></span>
    <span className="home-menu-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><span className="home-menu-arrow" aria-hidden="true">→</span>
  </button>)}</nav>;
}

export function HomeMenuHero({ store }: { store: RaceFlowStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot), mode = gameModes[state.homeIndex];
  const driver = driverAssets[state.selectedRacer], kart = kartAssets[state.selectedKart];
  return <section className="home-hero" aria-label="Race showroom">
    <header className="home-showroom-header"><div className="home-mode-heading" key={state.homeIndex}>
      <span className="home-eyebrow">{mode ? 'SELECTED MODE' : 'YOUR PREFERENCES'}</span><h2>{mode?.name ?? 'Settings'}</h2>
    </div><span className="home-session-badge"><i /> LOCAL PLAY</span></header>
    <div className="home-showroom-stage"><span className="home-stage-word" aria-hidden="true">TURBO</span>
      <SelectionPreview step="kart" driver={driver} kart={kart} presentation="showroom" animate={state.panel === 'none'} />
      <span className="home-stage-caption" aria-hidden="true">THE STARTING LINEUP</span>
    </div>
    <div className="home-showroom-details"><div className="home-mode-description" key={state.homeIndex}>
      <span className="home-mode-detail">{mode?.detail ?? 'Sound · controls · phone'}</span>
      <p>{mode?.description ?? 'Set up your sound and controls. Connect your phone for a different way to drive.'}</p>
    </div><dl className="home-lineup"><div><dt>RACER</dt><dd>{driver.name}</dd></div><div><dt>KART</dt><dd>{kart.name}</dd></div></dl></div>
  </section>;
}

export function MainMenuScreen({ store, tools }: { store: RaceFlowStore; tools: ReactNode }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const confirm = () => { const mode = gameModes[store.getSnapshot().homeIndex]; if (mode) store.begin(mode.id); else store.panel('settings'); };
  const navigation = useMenuNavigation(action => { if (action === 'confirm') confirm(); else if (action !== 'back') store.move(action); }, `home:${state.homeIndex}`, state.panel === 'none');
  return <RaceFlowShell navigation={navigation} revision={`home:${state.homeIndex}:${state.selectedRacer}:${state.selectedKart}`} home inert={state.panel !== 'none'}
    header={<StepHeader title="Home" subtitle="" mode="" steps={[]} step="racer" tools={tools} home />}
    footer={<StepFooter context="LOCAL PLAYER · READY" confirm={state.homeIndex === gameModes.length ? 'Open settings' : 'Continue'} home onBack={() => undefined} onConfirm={confirm} />}>
    <section className="home-menu-left"><div className="home-title-block"><span className="home-eyebrow">MAIN MENU</span><h1 id="home-title">Let’s race<span>.</span></h1><p className="home-intro">Choose your next starting line.</p></div>
      <HomeMenuList index={state.homeIndex} onSelect={store.selectHome} onConfirm={confirm} />
      <div className="home-catalog-note"><span><strong>{String(trackCatalog.length).padStart(2, '0')}</strong> ORIGINAL CIRCUITS</span><i /><span><strong>{String(gameModes.length).padStart(2, '0')}</strong> WAYS TO RACE</span></div>
    </section><HomeMenuHero store={store} />
  </RaceFlowShell>;
}
