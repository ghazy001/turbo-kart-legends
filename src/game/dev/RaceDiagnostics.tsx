import { useEffect, useState } from 'react';
import type { GameRuntime } from '../render/runtime';
import { previewItemReward } from './itemPreview';
import { itemDefinitions } from '../config/itemConfig';

/** Explicit development-only QA mode. Movement still uses normal normalized inputs. */
export function RaceDiagnostics({ runtime }: { runtime: GameRuntime }) {
  const [automatic, setAutomatic] = useState(false);
  const [autoItems, setAutoItems] = useState(false);
  const [counters, setCounters] = useState('0 pickups · 0 shots · 0 traps · 0 guards · 0 turbos · 0 blocks · 0 hits');
  const [pace, setPace] = useState(18.2);
  const [lane, setLane] = useState(0);
  const query = new URLSearchParams(window.location.search);
  const collisions = query.has('collision-preview'), items = query.has('item-preview');
  const fixedReward = previewItemReward(window.location.search);
  useEffect(() => { runtime.demoDriving = automatic; runtime.demoItems = autoItems; runtime.demoLane = lane; runtime.demoSpeed = pace; return () => { runtime.demoDriving = false; runtime.demoItems = false; runtime.demoLane = 0; runtime.demoSpeed = 18.2; }; }, [automatic, autoItems, lane, pace, runtime]);
  useEffect(() => { const timer = window.setInterval(() => { const stats = runtime.race.items.stats, rewards = runtime.race.items.rewards; setCounters(`${stats.pickups} pickups · ${stats.shots} shots · ${stats.drops} traps · ${stats.guards} guards · ${stats.turbos} turbos · ${stats.blocks} blocks · ${stats.hits} hits · rewards ${rewards['spark-bolt']}/${rewards['banana-trap']}/${rewards['bubble-guard']}/${rewards['turbo-charge']}`); }, 250); return () => window.clearInterval(timer); }, [runtime]);
  return <aside className="race-diagnostics"><span>DEVELOPMENT · RACE QA</span>{fixedReward && <strong>FIXED PICKUP REWARD · {itemDefinitions[fixedReward].name} · QUICK / VS ONLY</strong>}<label><input type="checkbox" checked={automatic} onChange={event => setAutomatic(event.currentTarget.checked)} /> Autodrive with normal inputs</label><label><input type="checkbox" checked={autoItems} onChange={event => setAutoItems(event.currentTarget.checked)} /> Auto-use collected items</label><output aria-label="Item QA counters">{counters}</output>{(collisions || items) && <label>Autodrive line <select aria-label="Autodrive line" value={lane} onChange={event => setLane(Number(event.currentTarget.value))}><option value={0}>Center</option>{items && <><option value={-3}>Left pickup lane (−3 m)</option><option value={3}>Right pickup lane (+3 m)</option></>}<option value={1.75}>Rival line (+1.75 m)</option><option value={-1.75}>Rival line (−1.75 m)</option><option value={4}>Near rail (+4 m)</option><option value={-4}>Near rail (−4 m)</option></select></label>}{items && <label>Autodrive pace <select aria-label="Autodrive pace" value={pace} onChange={event => setPace(Number(event.currentTarget.value))}><option value={18.2}>Normal</option><option value={14}>Gentle</option></select></label>}</aside>;
}
