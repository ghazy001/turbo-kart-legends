import { useSyncExternalStore, type ReactNode } from 'react';
import { driverAssets, kartAssets } from '../../config/visualAssets';
import { SelectionPreview } from '../selection/SelectionPreview';
import { gameModes, trackCatalog } from './menuCatalog';
import type { RaceFlowStore } from './raceFlowStore';
import { RaceFlowShell, StepFooter, StepHeader } from './RaceFlowShell';
import { MenuIcon } from './MenuIcons';
import { useMenuNavigation } from './useMenuNavigation';

export function HomeMenuList({ index, onSelect, onConfirm }: { index: number; onSelect: (index: number) => void; onConfirm: () => void }) {
  const items = [...gameModes, { id: 'settings', name: 'Settings', icon: 'settings', detail: 'Sound, controls & pocket wheel' }];
  return <nav className="home-menu-list" aria-label="Game modes">{items.map((item, i) => <button key={item.id} className="home-menu-item" data-menu-current={i === index} aria-current={i === index ? 'true' : undefined}
    tabIndex={i === index ? 0 : -1} onPointerEnter={() => onSelect(i)} onFocus={() => onSelect(i)} onClick={() => { onSelect(i); onConfirm(); }}>
    <span className="home-menu-icon"><MenuIcon name={item.icon} /></span><span><strong>{item.name}</strong><small>{item.detail}</small></span><span className="home-menu-arrow" aria-hidden="true">↗</span>
  </button>)}</nav>;
}
export function HomeMenuHero({ store }: { store: RaceFlowStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot), mode = gameModes[state.homeIndex];
  return <div className="home-hero"><div className="home-hero-copy" key={state.homeIndex}><span>{mode?.tag ?? 'MAKE YOURSELF AT HOME'}</span><h3>{mode?.name ?? 'Your setup'}<em> / {mode ? 'Ready when you are.' : 'Just your style.'}</em></h3><p>{mode?.description ?? 'Tune the sound, check your controls or bring a phone along for the ride.'}</p></div><SelectionPreview step="kart" driver={driverAssets[state.selectedRacer]} kart={kartAssets[state.selectedKart]} animate={state.panel === 'none'} /><span className="home-hero-note">COAST TO CALDERA <i /> {trackCatalog.length} ORIGINAL CIRCUITS</span></div>;
}
export function MainMenuScreen({ store, tools }: { store: RaceFlowStore; tools: ReactNode }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const confirm = () => { const mode = gameModes[store.getSnapshot().homeIndex]; if (mode) store.begin(mode.id); else store.panel('settings'); };
  const navigation = useMenuNavigation(action => { if (action === 'confirm') confirm(); else if (action !== 'back') store.move(action); }, `home:${state.homeIndex}`, state.panel === 'none');
  return <RaceFlowShell navigation={navigation} revision={`home:${state.homeIndex}:${state.selectedRacer}:${state.selectedKart}`} home inert={state.panel !== 'none'}
    header={<StepHeader title="Home" subtitle="" mode="" steps={[]} step="racer" tools={tools} home />}
    footer={<StepFooter context="GOOD TIMES. GREAT CORNERS." confirm={state.homeIndex === 4 ? 'Open settings' : 'Let’s race'} home onBack={() => undefined} onConfirm={confirm} />}>
    <section className="home-menu-left"><span className="flow-overline">A SUNNY LITTLE ESCAPE</span><h1 id="home-title">TAKE THE<br /><em>SUNNY LINE<span>.</span></em></h1><p className="home-intro">A little kart. A lot of possibility.</p><HomeMenuList index={state.homeIndex} onSelect={store.selectHome} onConfirm={confirm} /></section><HomeMenuHero store={store} />
  </RaceFlowShell>;
}
