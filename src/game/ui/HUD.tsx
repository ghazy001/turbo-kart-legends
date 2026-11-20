import { useEffect, useRef } from 'react';
import type { GameRuntime } from '../render/runtime';
import { boostTiers } from '../config/boostConfig';
import { ItemHUD } from './ItemHUD';
import { RaceHUD } from './RaceHUD';
import { GameButton } from './GameButton';
import '../../styles/hud.css';

function TurboMeter({ runtime }: { runtime: GameRuntime }) {
  const panel = useRef<HTMLDivElement>(null), title = useRef<HTMLOutputElement>(null), charge = useRef<HTMLProgressElement>(null);
  useEffect(() => {
    const update = () => {
      const state = runtime.simulation.current, boosting = state.boostRemaining > 0;
      const tier = state.boostTier, config = tier ? boostTiers[tier - 1] : null;
      if (panel.current) {
        panel.current.hidden = !boosting;
        panel.current.style.setProperty('--ability-color', config?.color ?? '#a5ded4');
      }
      if (title.current) title.current.value = `${config?.name ?? 'Turbo'} · ${state.boostRemaining.toFixed(1)}s`;
      if (charge.current) charge.current.value = boosting && config ? state.boostRemaining / config.duration : 0;
    };
    update(); const timer = window.setInterval(update, 100); return () => window.clearInterval(timer);
  }, [runtime]);
  return <div ref={panel} className="hud-turbo" hidden>
    <output ref={title} aria-label="Turbo status">Turbo</output>
    <progress ref={charge} aria-label="Remaining turbo" max={1} value={0} />
  </div>;
}

function CircuitMap({ runtime }: { runtime: GameRuntime }) {
  const marker = useRef<SVGCircleElement>(null), opponents = useRef<(SVGCircleElement | null)[]>([]);
  const samples = runtime.simulation.track.samples;
  const minX = Math.min(...samples.map(p => p.x)) - 22, minZ = Math.min(...samples.map(p => p.z)) - 22;
  const width = Math.max(...samples.map(p => p.x)) - minX + 22, height = Math.max(...samples.map(p => p.z)) - minZ + 22;
  const path = samples.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(' ') + 'Z';
  useEffect(() => {
    const update = () => {
      marker.current?.setAttribute('cx', String(runtime.simulation.current.x)); marker.current?.setAttribute('cy', String(runtime.simulation.current.z));
      runtime.race.opponents.forEach((racer, index) => {
        const node = opponents.current[index]; if (!node) return;
        node.setAttribute('cx', String(racer.simulation.current.x)); node.setAttribute('cy', String(racer.simulation.current.z));
        node.style.display = runtime.race.kind === 'quick-race' && racer.progress.finishTime === null ? '' : 'none';
      });
    };
    update(); const timer = window.setInterval(update, 100); return () => window.clearInterval(timer);
  }, [runtime]);
  return <div className="hud-map" aria-label={`${runtime.race.track.definition.name} course map`}>
    <svg viewBox={`${minX} ${minZ} ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke="#153946" strokeOpacity=".38" strokeWidth="16" strokeLinejoin="round" />
      <path d={path} fill="none" stroke="#fff9e5" strokeOpacity=".86" strokeWidth="8" strokeLinejoin="round" />
      <circle cx={runtime.simulation.track.spawn.x} cy={runtime.simulation.track.spawn.z} r="6" fill="#fff9e5" />
      {runtime.race.opponents.map((racer, index) => <circle key={racer.id} ref={node => { opponents.current[index] = node; }} r="8" fill={racer.color} stroke="#173c48" strokeWidth="3" />)}
      <circle ref={marker} cx={runtime.simulation.current.x} cy={runtime.simulation.current.z} r="11" fill="#ffda86" stroke="#fff9e5" strokeWidth="5" />
    </svg>
    <span>THE CIRCUIT</span>
  </div>;
}

export function HUD({ runtime, onPause }: { runtime: GameRuntime; onPause: () => void }) {
  const speed = useRef<HTMLOutputElement>(null), gear = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const update = () => {
      const value = runtime.simulation.current.forwardSpeed;
      if (speed.current) speed.current.value = String(Math.round(Math.abs(value) * 3.6)).padStart(2, '0');
      if (gear.current) gear.current.textContent = value < -0.15 ? 'REV' : 'km/h';
    };
    update(); const timer = window.setInterval(update, 100); return () => window.clearInterval(timer);
  }, [runtime]);
  return <div className="race-hud" aria-label="Race dashboard">
    <CircuitMap runtime={runtime} /><RaceHUD runtime={runtime} /><ItemHUD runtime={runtime} /><TurboMeter runtime={runtime} />
    <div className="hud-speed"><output ref={speed} aria-label="Speed in kilometers per hour">00</output><span ref={gear}>km/h</span></div>
    <GameButton className="hud-pause" tone="quiet" size="small" onClick={onPause} aria-label="Pause and controls" title="Pause · Escape"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg></GameButton>
  </div>;
}
