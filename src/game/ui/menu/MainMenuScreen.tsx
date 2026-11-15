import { useSyncExternalStore } from 'react';
import { driverAssets, kartAssets } from '../../config/visualAssets';
import { HomeScene } from './HomeScene';
import { gameModes } from './menuCatalog';
import type { RaceFlowStore } from './raceFlowStore';
import { RaceFlowShell, StepHeader } from './RaceFlowShell';
import { useMenuNavigation } from './useMenuNavigation';
import '../../../styles/home.css';

export function HomeMenuList({ index, onSelect, onConfirm }: { index: number; onSelect: (index: number) => void; onConfirm: () => void }) {
  const items = [...gameModes, { id: 'settings', name: 'Settings', icon: 'settings', detail: 'Sound, controls & pocket wheel' }];
  return <nav className="home-menu-list" aria-label="Game modes">{items.map((item, i) => <button key={item.id} className="home-menu-item" data-menu-current={i === index} aria-current={i === index ? 'true' : undefined}
    aria-label={`${item.name} ${item.detail}`} tabIndex={i === index ? 0 : -1} onPointerEnter={() => onSelect(i)} onFocus={() => onSelect(i)} onClick={() => { onSelect(i); onConfirm(); }}>
    <strong>{item.name}</strong>
  </button>)}</nav>;
}

export function HomeMenuHero({ store }: { store: RaceFlowStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot), mode = gameModes[state.homeIndex];
  const driver = driverAssets[state.selectedRacer], kart = kartAssets[state.selectedKart];
  return <section className="home-hero" aria-label="Coastal starting line">
    <div className="home-showroom-stage">
      <HomeScene driver={driver} kart={kart} />
    </div>
    <div className="home-showroom-details">
      <p className="home-lineup">{driver.name}<span aria-hidden="true"> / </span>{kart.name}</p>
      <p className="home-mode-description" key={state.homeIndex}>{mode?.description ?? 'Sound, controls and phone pairing.'}</p>
    </div>
  </section>;
}

export function MainMenuScreen({ store }: { store: RaceFlowStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const confirm = () => { const mode = gameModes[store.getSnapshot().homeIndex]; if (mode) store.begin(mode.id); else store.panel('settings'); };
  const navigation = useMenuNavigation(action => { if (action === 'confirm') confirm(); else if (action !== 'back') store.move(action); }, `home:${state.homeIndex}`, state.panel === 'none');
  return <RaceFlowShell navigation={navigation} revision={`home:${state.homeIndex}:${state.selectedRacer}:${state.selectedKart}`} home inert={state.panel !== 'none'}
    header={<StepHeader title="Home" subtitle="" mode="" steps={[]} step="racer" tools={null} home />}
    footer={null}>
    <section className="home-menu-left"><div className="home-title-block"><h1 id="home-title">Let’s race<span>.</span></h1></div>
      <HomeMenuList index={state.homeIndex} onSelect={store.selectHome} onConfirm={confirm} />
    </section><HomeMenuHero store={store} />
  </RaceFlowShell>;
}
