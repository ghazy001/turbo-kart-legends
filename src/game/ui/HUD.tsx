import { useEffect, useRef } from 'react';
import type { GameRuntime } from '../render/runtime';

function CircuitMap({ runtime }: { runtime: GameRuntime }) {
  const marker = useRef<SVGCircleElement>(null);
  const samples = runtime.simulation.track.samples;
  const path = samples.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(' ') + 'Z';
  useEffect(() => {
    const timer = window.setInterval(() => {
      marker.current?.setAttribute('cx', String(runtime.simulation.current.x));
      marker.current?.setAttribute('cy', String(runtime.simulation.current.z));
    }, 100);
    return () => window.clearInterval(timer);
  }, [runtime]);
  return <div className="map-card" aria-label="Sunshine Circuit course map">
    <span className="micro-label">FIND YOUR FLOW</span>
    <svg viewBox="-140 -125 280 270" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" />
      <circle cx={runtime.simulation.track.spawn.x} cy={runtime.simulation.track.spawn.z} r="8" fill="#b9ccc5" />
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
      if (gear.current) gear.current.textContent = value < -0.15 ? 'REVERSE' : 'FREE DRIVE';
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, Math.abs(value) / 20)})`;
    }, 100);
    return () => window.clearInterval(timer);
  }, [runtime]);
  return <>
    <CircuitMap runtime={runtime} />
    <div className="speed-card"><span ref={gear} className="micro-label">FREE DRIVE</span>
      <div className="speed-value"><output ref={speed} aria-label="Speed in kilometers per hour">00</output><span>km/h</span></div>
      <div className="speed-track"><div ref={bar} /></div>
    </div>
    <div className="drive-toolbar"><span className="drive-hint"><kbd>W</kbd> GO <kbd>S</kbd> BRAKE <kbd>A</kbd><kbd>D</kbd> STEER</span>
      <button onClick={onReset}><span aria-hidden="true">↺</span> Reset <kbd>R</kbd></button>
      <button onClick={onPause} aria-label="Pause and controls"><span aria-hidden="true">Ⅱ</span> Pause / help <kbd>esc</kbd></button>
    </div>
  </>;
}
