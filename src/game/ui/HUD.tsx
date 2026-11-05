import { useEffect, useRef } from 'react';
import type { GameRuntime } from '../render/runtime';
import { boostTiers } from '../config/driftConfig';
import { RaceHUD } from './RaceHUD';
import { raceKindNames } from '../race/RaceSession';
import { chargeTier } from '../kart/driftController';

function DriftMeter({ runtime }: { runtime: GameRuntime }) {
  const panel = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLOutputElement>(null);
  const hint = useRef<HTMLSpanElement>(null);
  const charge = useRef<HTMLProgressElement>(null);
  const source = useRef<HTMLSpanElement>(null);
  const nodes = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    const update = () => {
      const state = runtime.simulation.current;
      const boosting = state.boostRemaining > 0;
      const tier = boosting ? state.boostTier : chargeTier(state.driftCharge);
      const config = tier ? boostTiers[tier - 1] : null;
      const drifting = state.driftDirection !== 0;
      if (panel.current) {
        panel.current.dataset.phase = boosting ? 'boost' : drifting ? 'drift' : 'ready';
        panel.current.style.setProperty('--ability-color', config?.color ?? '#91bba5');
      }
      if (title.current) title.current.value = boosting ? `${config?.name.toUpperCase()} TURBO`
        : drifting ? config ? `${config.name.toUpperCase()} READY` : 'BUILDING CHARGE' : 'MAKE THE CORNER COUNT';
      if (hint.current) hint.current.textContent = boosting ? `${state.boostRemaining.toFixed(1)}s · Enjoy the straight!`
        : drifting ? state.y > 0 ? 'Land, hold the turn, then release Space.'
          : tier === 3 ? 'Maximum charge! Release Space for Flare.'
            : tier ? 'Release Space to boost · hold for the next tier.' : 'Keep steering to charge your mini-turbo.'
          : '27+ km/h: steer + hold Space. Release to boost.';
      if (charge.current) charge.current.value = boosting && config
        ? state.boostRemaining / config.duration * boostTiers[2].charge : state.driftCharge;
      if (source.current) source.current.textContent = runtime.gamepad?.connected ? 'CONTROLLER CONNECTED' : 'SPACE · HOLD & RELEASE';
      nodes.current.forEach((node, i) => { if (node) node.dataset.ready = String(i < tier); });
    };
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [runtime]);
  return <div ref={panel} className="drift-card" data-phase="ready">
    <span ref={source} className="micro-label">SPACE · HOLD & RELEASE</span>
    <output ref={title} aria-label="Drift and turbo status">MAKE THE CORNER COUNT</output>
    <progress ref={charge} aria-label="Drift charge or remaining turbo" max={boostTiers[2].charge} value={0} />
    <div className="tier-labels">{boostTiers.map((tier, i) => <span key={tier.name} ref={node => { nodes.current[i] = node; }} data-ready="false"><i style={{ background: tier.color }} />{i + 1} {tier.name}</span>)}</div>
    <span ref={hint} className="drift-hint">27+ km/h: steer + hold Space. Release to boost.</span>
  </div>;
}

function CircuitMap({ runtime }: { runtime: GameRuntime }) {
  const marker = useRef<SVGCircleElement>(null);
  const opponents = useRef<(SVGCircleElement | null)[]>([]);
  const samples = runtime.simulation.track.samples;
  const path = samples.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(' ') + 'Z';
  useEffect(() => {
    const timer = window.setInterval(() => {
      marker.current?.setAttribute('cx', String(runtime.simulation.current.x));
      marker.current?.setAttribute('cy', String(runtime.simulation.current.z));
      runtime.race.opponents.forEach((racer, index) => {
        const node = opponents.current[index];
        if (!node) return;
        node.setAttribute('cx', String(racer.simulation.current.x)); node.setAttribute('cy', String(racer.simulation.current.z));
        node.style.display = runtime.race.kind === 'quick-race' && racer.progress.finishTime === null ? '' : 'none';
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [runtime]);
  return <div className="map-card" aria-label="Sunshine Circuit course map">
    <span className="micro-label">FIND YOUR FLOW</span>
    <svg viewBox="-140 -125 280 270" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" />
      <circle cx={runtime.simulation.track.spawn.x} cy={runtime.simulation.track.spawn.z} r="8" fill="#b9ccc5" />
      {runtime.race.opponents.map((racer, index) => <circle key={racer.id} ref={node => { opponents.current[index] = node; }} r="8" fill={racer.color} stroke="#fff7df" strokeWidth="3" />)}
      <circle ref={marker} cx={runtime.simulation.current.x} cy={runtime.simulation.current.z} r="10" fill="#ff7654" stroke="#fff7df" strokeWidth="4" />
    </svg>
    <span className="map-caption">SUNSHINE CIRCUIT</span>
  </div>;
}

export function HUD({ runtime, onPause, onReset }: { runtime: GameRuntime; onPause: () => void; onReset: () => void }) {
  const speed = useRef<HTMLOutputElement>(null);
  const gear = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const value = runtime.simulation.current.forwardSpeed;
      if (speed.current) speed.current.value = String(Math.round(Math.abs(value) * 3.6)).padStart(2, '0');
      if (gear.current) gear.current.textContent = value < -0.15 ? 'REVERSE' : raceKindNames[runtime.race.kind];
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, Math.abs(value) / 20)})`;
    }, 100);
    return () => window.clearInterval(timer);
  }, [runtime]);
  return <>
    <CircuitMap runtime={runtime} />
    <RaceHUD runtime={runtime} />
    <DriftMeter runtime={runtime} />
    <div className="speed-card"><span ref={gear} className="micro-label">FREE DRIVE</span>
      <div className="speed-value"><output ref={speed} aria-label="Speed in kilometers per hour">00</output><span>km/h</span></div>
      <div className="speed-track"><div ref={bar} /></div>
    </div>
    <div className="drive-toolbar"><span className="drive-hint"><kbd>W</kbd> GO <kbd>S</kbd> BRAKE <kbd>A</kbd><kbd>D</kbd> STEER <kbd>space</kbd> DRIFT</span>
      <button onClick={onReset}><span aria-hidden="true">↺</span> Reset <kbd>R</kbd></button>
      <button onClick={onPause} aria-label="Pause and controls"><span aria-hidden="true">Ⅱ</span> Pause / help <kbd>esc</kbd></button>
    </div>
  </>;
}
