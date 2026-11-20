import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react';
import { PhoneConnection } from './PhoneConnection';
import { TouchInput, type TouchAction } from './TouchInput';
import { TiltSteering, defaultTiltSettings } from './steering';
import { GameLogo } from '../game/ui/GameLogo';
import './phone.css';

function HoldButton({ action, touch, children, disabled = false }: { action: TouchAction; touch: TouchInput; disabled?: boolean; children: React.ReactNode }) {
  const release = (event: ReactPointerEvent<HTMLButtonElement>) => { touch.button(action, event.pointerId, false); event.currentTarget.dataset.pressed = 'false'; };
  return <button disabled={disabled} className={`drive-button ${action}`} onContextMenu={event => event.preventDefault()} onPointerDown={event => {
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); touch.button(action, event.pointerId, true); event.currentTarget.dataset.pressed = 'true';
  }} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onKeyDown={event => {
    if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); touch.button(action, -1, true); }
  }} onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') touch.button(action, -1, false); }} onBlur={() => touch.button(action, -1, false)}>{children}</button>;
}
function screenAngle() { return screen.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0; }
export function PhoneController() {
  const [touch] = useState(() => new TouchInput()), [tilt] = useState(() => new TiltSteering());
  const [settings, setSettings] = useState(defaultTiltSettings), settingsRef = useRef(settings); settingsRef.current = settings;
  const [mode, setMode] = useState<'touch' | 'tilt'>('touch'), modeRef = useRef(mode); modeRef.current = mode;
  const [sensor, setSensor] = useState(false), [message, setMessage] = useState('Touch steering is ready. Rotate your phone to landscape.');
  const [calibrated, setCalibrated] = useState(false), [rate, setRate] = useState(30), gauge = useRef<HTMLDivElement>(null);
  const [connection] = useState(() => new PhoneConnection(window.location.hash.slice(1), dt => {
    const input = touch.sample(); let active = true;
    if (modeRef.current === 'tilt') { const sample = tilt.sample(performance.now(), dt, settingsRef.current); input.steer = sample.steer; active = sample.available; }
    else if (settingsRef.current.inverted) input.steer *= -1;
    if (gauge.current) gauge.current.style.transform = `translateX(${input.steer * 75}px)`;
    return { input, active };
  }, () => { touch.clear(); document.querySelectorAll<HTMLElement>('.drive-button').forEach(button => { button.dataset.pressed = 'false'; }); }));
  const state = useSyncExternalStore(connection.subscribe, connection.getSnapshot);
  useEffect(() => {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    connection.start();
    const inactive = () => connection.neutralize();
    const visibility = () => { if (document.hidden) inactive(); };
    const rotate = () => { inactive(); tilt.reset(); setCalibrated(false); if (modeRef.current === 'tilt') setMessage('Orientation changed. Hold comfortably and recalibrate.'); };
    window.addEventListener('blur', inactive); window.addEventListener('pagehide', inactive); window.addEventListener('orientationchange', rotate); document.addEventListener('visibilitychange', visibility);
    screen.orientation?.addEventListener('change', rotate);
    return () => { connection.dispose(); window.removeEventListener('blur', inactive); window.removeEventListener('pagehide', inactive); window.removeEventListener('orientationchange', rotate); document.removeEventListener('visibilitychange', visibility); screen.orientation?.removeEventListener('change', rotate); };
  }, [connection, tilt]);
  useEffect(() => { connection.setRate(rate); }, [connection, rate]);
  useEffect(() => {
    if (!sensor || mode !== 'tilt') return;
    const update = (event: DeviceOrientationEvent) => { if (!document.hidden) tilt.update(event.beta, event.gamma, screenAngle(), performance.now()); };
    window.addEventListener('deviceorientation', update);
    return () => window.removeEventListener('deviceorientation', update);
  }, [sensor, mode, tilt]);
  async function enableMotion() {
    connection.neutralize();
    if (!window.isSecureContext) { setMessage('Motion requires trusted HTTPS. Touch steering remains available.'); return; }
    const orientation = window.DeviceOrientationEvent as (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }) | undefined;
    if (!orientation) { setMessage('This browser has no motion API. Use touch steering.'); return; }
    try {
      // Invoke directly from this button gesture, before unrelated asynchronous work.
      const permission = orientation.requestPermission ? await orientation.requestPermission() : 'granted';
      if (permission !== 'granted') { setMessage('Motion permission was denied. Touch steering remains available.'); return; }
      tilt.reset(); setCalibrated(false); setSensor(true); setMode('tilt'); setMessage('Hold the phone comfortably, then tap Calibrate. If no samples arrive, use touch steering.');
    } catch { setMessage('Motion permission is unavailable. Use touch steering or check browser settings.'); }
  }
  useEffect(() => {
    connection.setConfigurationHandler(configuration => {
      setSettings(previous => ({ ...previous, fullLockDegrees: configuration.fullLockDegrees }));
      if (configuration.touch) { setMode('touch'); setSensor(false); setCalibrated(false); setMessage('Computer selected touch steering. Slide left or right.'); }
      else if (sensor) { setMode('tilt'); setMessage('Computer selected motion steering. Calibrate your neutral angle.'); }
      else setMessage('Computer requested motion steering. Tap Motion steering here to grant permission, then calibrate.');
      if (configuration.calibrate) {
        const ready = sensor && tilt.calibrate(); setCalibrated(ready);
        setMessage(ready ? 'Neutral calibrated from the computer. Return to this angle to go straight.' : 'Enable Motion steering on this phone first, then hold neutral and calibrate.');
      }
    });
    return () => connection.setConfigurationHandler(() => undefined);
  }, [connection, sensor, tilt]);
  const steer = (event: ReactPointerEvent<HTMLDivElement>, begin = false) => {
    const box = event.currentTarget.getBoundingClientRect(); touch.steering(event.pointerId, (event.clientX - box.left - box.width / 2) / (box.width * 0.42), begin);
  };
  return <main className="phone-controller">
    <header className="phone-header"><a href="/controller" className="phone-brand" onClick={event => event.preventDefault()}><GameLogo variant="phone" /><strong>POCKET WHEEL</strong></a><div className="phone-link" data-connected={state.status === 'connected'}><i />{state.status === 'connected' ? 'CONNECTED' : state.status.toUpperCase()}<small>{state.rtt === null ? '—' : `${state.rtt} ms round trip`}</small></div><button className="phone-pause" onClick={() => connection.pause()} disabled={state.status !== 'connected'}>{state.game.mode === 'paused' ? 'Resume' : 'Pause'} Ⅱ</button></header>
    <div className="phone-notice" role="status">{state.status !== 'connected' ? state.message : !state.game.enabled ? `Computer: ${state.game.mode}. Start or resume there; release all controls before driving.` : mode === 'tilt' && !calibrated ? 'Calibrate motion steering before driving, or switch to touch.' : 'Ready. Hold GO, slide the steering pad, and hold DRIFT through a bend.'}</div>
    <div className="phone-controls"><section className="phone-steering" aria-label="Steering controls"><div className="phone-mode-picker"><button aria-pressed={mode === 'touch'} onClick={() => { connection.neutralize(); setMode('touch'); setSensor(false); setMessage('Touch steering active. Slide left or right.'); }}>Touch steering</button><button aria-pressed={mode === 'tilt'} onClick={enableMotion}>Motion steering</button></div>
      {mode === 'touch' ? <div className="steering-pad" role="slider" tabIndex={0} aria-label="Touch steering" aria-valuemin={-1} aria-valuemax={1} aria-valuenow={0} aria-valuetext="Slide left or right; release to center" onContextMenu={event => event.preventDefault()} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); steer(event, true); }} onPointerMove={event => steer(event)} onPointerUp={event => touch.releaseSteering(event.pointerId)} onPointerCancel={event => touch.releaseSteering(event.pointerId)} onLostPointerCapture={event => touch.releaseSteering(event.pointerId)} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); touch.steering(-1, event.key === 'ArrowLeft' ? -1 : 1, true); } }} onKeyUp={() => touch.releaseSteering(-1)} onBlur={() => touch.releaseSteering(-1)}><span>←</span><div className="wheel-icon">T<span>↗</span></div><span>→</span><small>SLIDE TO STEER · RELEASE TO CENTER</small></div>
        : <div className="motion-pad"><div className="wheel-icon">↶ T ↷</div><strong>{calibrated ? 'Tilt into the corner.' : 'Find your neutral.'}</strong><button onClick={() => { connection.neutralize(); const ready = tilt.calibrate(); setCalibrated(ready); setMessage(ready ? 'Calibrated. Return to this angle to go straight.' : 'No sensor readings yet. Check permissions or use touch steering.'); }}>Calibrate neutral</button></div>}
      <div className="steering-meter" aria-hidden="true"><i ref={gauge} /></div><p className="motion-message" role="status">{message}</p>
    </section><section className="phone-pedals" aria-label="Driving controls"><div className="phone-action-row"><HoldButton action="useItem" touch={touch} disabled={!state.game.enabled || !state.game.itemsEnabled}><span>ϟ</span><strong>ITEM</strong><small>TAP TO USE</small></HoldButton><HoldButton action="drift" touch={touch}><span>↝</span><strong>DRIFT</strong><small>HOLD · RELEASE FOR TURBO</small></HoldButton></div><div className="pedal-row"><HoldButton action="brake" touch={touch}><span>↓</span><strong>BRAKE</strong><small>HOLD TO REVERSE</small></HoldButton><HoldButton action="throttle" touch={touch}><span>↑</span><strong>GO</strong><small>HOLD TO ACCELERATE</small></HoldButton></div></section></div>
    <details className="phone-settings"><summary>Controller tuning & connection</summary><div className="phone-setting-grid"><label>Sensitivity · full lock at {settings.fullLockDegrees}°<input type="range" min="10" max="50" value={settings.fullLockDegrees} onChange={event => setSettings({ ...settings, fullLockDegrees: Number(event.currentTarget.value) })} /></label><label>Motion dead zone · {Math.round(settings.deadzone * 100)}%<input type="range" min="0" max="0.2" step="0.01" value={settings.deadzone} onChange={event => setSettings({ ...settings, deadzone: Number(event.currentTarget.value) })} /></label><label>Motion smoothing · {Math.round(settings.smoothingSeconds * 1000)} ms<input type="range" min="0.02" max="0.2" step="0.01" value={settings.smoothingSeconds} onChange={event => setSettings({ ...settings, smoothingSeconds: Number(event.currentTarget.value) })} /></label><label>Transmit rate<select value={rate} onChange={event => setRate(Number(event.currentTarget.value))}>{[20, 30, 45, 60].map(value => <option key={value} value={value}>{value} Hz</option>)}</select></label><label><input type="checkbox" checked={settings.inverted} onChange={event => { connection.neutralize(); setSettings({ ...settings, inverted: event.currentTarget.checked }); }} /> Invert steering</label></div><p>Keep both screens awake and on the same Wi-Fi. A lost connection releases controls and pauses the game. ITEM fires Spark Bolt, drops Banana Trap, or activates Bubble Guard in CPU races. A guard lasts five seconds or one item hit. Time Trial has no pickups.</p></details>
    <footer className="phone-footer">YOUR LINE. YOUR LITTLE LEGEND.<span>LANDSCAPE RECOMMENDED · TOUCH FALLBACK ALWAYS AVAILABLE</span></footer>
  </main>;
}
