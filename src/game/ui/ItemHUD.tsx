import { useEffect, useState } from 'react';
import type { GameRuntime } from '../render/runtime';
import { itemConfig, itemDefinitions, type ItemId } from '../config/itemConfig';
import '../../styles/items.css';
import { turboBoost } from '../items/turboCharge';
export function SparkIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M31 3 10 26h14l-7 19 23-27H26Z" fill="currentColor" /><path d="m5 10 5 2m29 24 5 2M5 37l5-3m29-25 5-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
}
function BananaIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 9c0 14-6 18-18 23 10 2 16-1 18-9 2 8 8 11 18 9-12-5-18-9-18-23Z" fill="currentColor" /><path d="m24 8 1-5M24 23v19m0-10c-3 6-8 9-13 10m13-10c3 6 8 9 13 10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>;
}
function BubbleIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18" fill="currentColor" opacity=".2" /><circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M13 21a12 12 0 0 1 9-9m-4 13 5 5 9-12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function TurboIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M17 7h14l7 10-5 24H15l-5-24Z" fill="currentColor" opacity=".22" /><path d="M18 5h12m-14 5-5 8 5 23h16l5-23-5-8M18 23l6-7 6 7m-12 9 6-7 6 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
const itemActions: Record<ItemId, string> = { 'spark-bolt': 'Fire Spark Bolt', 'banana-trap': 'Drop Banana Trap', 'bubble-guard': 'Activate Bubble Guard', 'turbo-charge': 'Activate Turbo Charge' };
export function ItemHUD({ runtime }: { runtime: GameRuntime }) {
  const [view, setView] = useState<{ held: ItemId | null; usable: boolean; notice: string; hit: boolean; guardTenths: number; recoveryTenths: number; turboTenths: number }>({ held: null, usable: false, notice: 'FIND A PICKUP', hit: false, guardTenths: 0, recoveryTenths: 0, turboTenths: 0 });
  useEffect(() => {
    const update = () => {
      const items = runtime.race.items, slot = items.slot('player');
      const recent = [...items.events].reverse().find(event => items.time - event.time < 1.5 && (event.source === 'player' || event.target === 'player'));
      const hit = (slot?.slowRemaining ?? 0) > 0;
      const held = slot?.held ?? null, ready = !!held;
      const guardTenths = Math.ceil((slot?.shieldRemaining ?? 0) * 10), alreadyGuarded = held === 'bubble-guard' && guardTenths > 0;
      const turboTenths = Math.ceil((slot?.turboRemaining ?? 0) * 10);
      const boostActive = held === 'turbo-charge' && runtime.simulation.current.boostRemaining > 0;
      const turboTooSlow = held === 'turbo-charge' && runtime.simulation.current.forwardSpeed < itemConfig.turboMinSpeed;
      const turboSlowed = held === 'turbo-charge' && hit;
      const coolingDown = (slot?.cooldown ?? 0) > 0;
      const recoveryTenths = Math.ceil((slot?.immunity ?? 0) * 10);
      const airborneTrap = held === 'banana-trap' && runtime.simulation.current.y > itemConfig.trapMaxDropHeight;
      const fullTrapPool = held === 'banana-trap' && items.traps.length >= itemConfig.maxTraps;
      let notice = 'FIND A PICKUP';
      if (recent?.kind === 'guard-break' && recent.target === 'player') notice = 'GUARD SAVED YOU!';
      else if (hit) notice = 'HIT · GET BACK IN THE RACE';
      else if (recent?.kind === 'hit' && recent.source === 'player') notice = recent.item === 'banana-trap' ? 'TRAP TRIGGERED!' : 'BOLT LANDED!';
      else if (boostActive) notice = 'BOOST ACTIVE · SAVE YOUR CHARGE';
      else if (turboTooSlow) notice = 'DRIVE FORWARD TO CHARGE';
      else if (alreadyGuarded) notice = 'GUARD ACTIVE · SAVE YOUR NEXT ONE';
      else if (airborneTrap) notice = 'LAND TO DROP THE TRAP';
      else if (fullTrapPool) notice = 'TRAPS ACTIVE · WAIT FOR SPACE';
      else if (ready) notice = held === 'turbo-charge' ? 'ACCELERATE · USE ON A CLEAR LINE' : held === 'bubble-guard' ? 'ACTIVATE · BLOCK ONE ITEM HIT' : held === 'banana-trap' ? 'DROP BEHIND · CATCH A PURSUER' : 'READY WHEN YOU ARE';
      else if (recent?.kind === 'turbo') notice = 'TURBO CHARGE!';
      else if (recent?.kind === 'guard') notice = 'ONE HIT PROTECTED';
      else if (recent?.kind === 'guard-expire') notice = 'GUARD EXPIRED';
      else if (recent?.kind === 'fire') notice = 'SPARK AWAY!';
      else if (recent?.kind === 'drop') notice = 'TRAP PLACED!';
      const usable = ready && !boostActive && !turboTooSlow && !turboSlowed && !coolingDown && !alreadyGuarded && !airborneTrap && !fullTrapPool && runtime.mode === 'playing' && runtime.race.phase === 'racing';
      setView(previous => previous.held === held && previous.usable === usable && previous.notice === notice && previous.hit === hit && previous.guardTenths === guardTenths && previous.recoveryTenths === recoveryTenths && previous.turboTenths === turboTenths ? previous : { held, usable, notice, hit, guardTenths, recoveryTenths, turboTenths });
    };
    update(); const timer = window.setInterval(update, 100); return () => window.clearInterval(timer);
  }, [runtime]);
  if (!runtime.race.items.enabled) return null;
  return <section className="item-card" data-ready={!!view.held} data-item={view.held ?? undefined} data-hit={view.hit} data-guarded={view.guardTenths > 0} data-turbo={view.turboTenths > 0} aria-label="Held item">
    <button className="item-fire" disabled={!view.usable} onClick={() => { runtime.uiInput.pressItem(); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); }} aria-label={view.held ? itemActions[view.held] : 'Item slot empty'}>
      <span className="item-symbol">{view.held === 'turbo-charge' ? <TurboIcon /> : view.held === 'bubble-guard' ? <BubbleIcon /> : view.held === 'banana-trap' ? <BananaIcon /> : <SparkIcon />}</span><span><small>YOUR ITEM</small><strong>{view.held ? itemDefinitions[view.held].name : 'Empty slot'}</strong><span className="item-key-hint"><kbd>E</kbd> / <kbd>Shift</kbd> · PAD <kbd>X / □</kbd></span></span>
    </button>
    {view.guardTenths > 0 && <div className="guard-status" aria-label="Bubble Guard active">
      <span>◉ BUBBLE GUARD · ONE HIT</span><output role="timer" aria-live="off" aria-label="Bubble Guard time remaining">{Math.ceil(view.guardTenths / 10)} s</output>
      <div className="guard-meter" role="progressbar" aria-label="Bubble Guard duration" aria-valuemin={0} aria-valuemax={itemConfig.shieldSeconds} aria-valuenow={view.guardTenths / 10}><i style={{ transform: `scaleX(${view.guardTenths / (itemConfig.shieldSeconds * 10)})` }} /></div>
    </div>}
    {view.turboTenths > 0 && <div className="guard-status turbo-status" aria-label="Turbo Charge active">
      <span>» TURBO CHARGE</span><output role="timer" aria-live="off" aria-label="Turbo Charge time remaining">{(view.turboTenths / 10).toFixed(1)} s</output>
      <div className="guard-meter" role="progressbar" aria-label="Turbo Charge duration" aria-valuemin={0} aria-valuemax={turboBoost.duration} aria-valuenow={view.turboTenths / 10}><i style={{ transform: `scaleX(${view.turboTenths / (turboBoost.duration * 10)})` }} /></div>
    </div>}
    {view.recoveryTenths > 0 && <div className="recovery-status" aria-label="Item hit protection"><span>ITEM HIT PROTECTION</span><output role="timer" aria-live="off">{Math.ceil(view.recoveryTenths / 10)} s</output></div>}
    <output className="item-notice" aria-live="polite" aria-atomic="true">{view.notice}</output>
  </section>;
}
