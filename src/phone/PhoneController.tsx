import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PhoneConnection } from './PhoneConnection';
import { TouchInput } from './TouchInput';
import { TiltSteering, defaultTiltSettings } from './steering';
import { GameLogo } from '../game/ui/GameLogo';
import { PhoneControlDeck } from './PhoneControlDeck';
import { ControllerSettings } from './ControllerSettings';
import { ControllerIcon } from './ControllerIcon';
import './phone.css';
import './controller.css';

function screenAngle() { return screen.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0; }
export function PhoneController() {
  const [touch] = useState(() => new TouchInput()), [tilt] = useState(() => new TiltSteering());
  const [settings, setSettings] = useState(defaultTiltSettings), settingsRef = useRef(settings); settingsRef.current = settings;
  const [mode, setMode] = useState<'touch' | 'tilt'>('touch'), modeRef = useRef(mode); modeRef.current = mode;
  const [sensor, setSensor] = useState(false), [message, setMessage] = useState('Touch steering is ready. Tilt is optional.');
  const [warning, setWarning] = useState(''), [settingsOpen, setSettingsOpen] = useState(false);
  const [calibrated, setCalibrated] = useState(false), [rate, setRate] = useState(30);
  const deck = useRef<HTMLDivElement>(null), slider = useRef<HTMLDivElement>(null), canDrive = useRef(false);
  const [connection] = useState(() => new PhoneConnection(window.location.hash.slice(1), dt => {
    const input = touch.sample(); let active = canDrive.current;
    if (modeRef.current === 'tilt') { const sample = tilt.sample(performance.now(), dt, settingsRef.current); input.steer = sample.steer; active = active && sample.available; }
    else if (settingsRef.current.inverted) input.steer *= -1;
    deck.current?.style.setProperty('--steer', String(input.steer));
    slider.current?.setAttribute('aria-valuenow', input.steer.toFixed(2));
    slider.current?.setAttribute('aria-valuetext', Math.abs(input.steer) < 0.01 ? 'Centered' : `${Math.round(Math.abs(input.steer) * 100)}% ${input.steer < 0 ? 'left' : 'right'}`);
    return { input, active };
  }, () => {
    touch.clear(); deck.current?.style.setProperty('--steer', '0');
    slider.current?.setAttribute('aria-valuenow', '0'); slider.current?.setAttribute('aria-valuetext', 'Centered');
    deck.current?.querySelectorAll<HTMLElement>('.drive-button').forEach(button => { button.dataset.pressed = 'false'; });
  }));
  const state = useSyncExternalStore(connection.subscribe, connection.getSnapshot);
  const connected = state.status === 'connected';
  const enabled = connected && state.game.enabled && (mode === 'touch' || calibrated) && !settingsOpen;
  canDrive.current = enabled;
  useEffect(() => { if (!enabled) connection.neutralize(); }, [connection, enabled]);
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
    connection.neutralize(); setWarning('');
    if (!window.isSecureContext) { setWarning('Tilt needs trusted HTTPS. Touch steering is ready.'); return; }
    const orientation = window.DeviceOrientationEvent as (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }) | undefined;
    if (!orientation) { setWarning('Tilt is unavailable in this browser. Use Touch.'); return; }
    try {
      // Request directly from this gesture; do not move it behind another await.
      const permission = orientation.requestPermission ? await orientation.requestPermission() : 'granted';
      if (permission !== 'granted') { setWarning('Motion access was denied. Touch steering is ready.'); return; }
      tilt.reset(); setCalibrated(false); setSensor(true); setMode('tilt'); setMessage('Hold the phone comfortably, then calibrate your neutral angle.');
    } catch { setWarning('Motion access is unavailable. Use Touch or check browser settings.'); }
  }
  const calibrate = () => {
    connection.neutralize(); const ready = tilt.calibrate(); setCalibrated(ready);
    setMessage(ready ? 'Calibrated. Return to this angle to go straight.' : 'No sensor readings yet. Check permissions or use Touch.');
  };
  useEffect(() => {
    connection.setConfigurationHandler(configuration => {
      setSettings(previous => ({ ...previous, fullLockDegrees: configuration.fullLockDegrees }));
      if (configuration.touch) { setMode('touch'); setSensor(false); setCalibrated(false); setMessage('Computer selected touch steering. Slide left or right.'); }
      else if (sensor) { setMode('tilt'); setMessage('Computer selected tilt steering. Calibrate your neutral angle.'); }
      else { setMessage('Computer requested tilt. Tap Tilt on this phone, then calibrate.'); setWarning('Tap Tilt here to enable motion steering.'); }
      if (configuration.calibrate) {
        const ready = sensor && tilt.calibrate(); setCalibrated(ready);
        setMessage(ready ? 'Neutral calibrated from the computer.' : 'Enable Tilt here, then hold neutral and calibrate.');
      }
    });
    return () => connection.setConfigurationHandler(() => undefined);
  }, [connection, sensor, tilt]);
  const notice = !connected ? state.message : !state.game.enabled
    ? state.game.mode === 'paused' ? 'Race paused. Tap Resume when you’re ready.' : 'Paired. Start your race on the computer.'
    : mode === 'tilt' && !calibrated ? message : warning || 'Ready to race. Release controls to center.';
  return <main className="phone-controller">
    <div className="controller-horizon" aria-hidden="true" />
    <header className="phone-header"><div className="phone-brand"><GameLogo variant="phone" /><span>POCKET WHEEL</span></div>
      <div className="phone-link" data-connected={connected}><i /><span>{connected ? 'Connected' : state.status === 'connecting' ? 'Pairing' : state.status === 'reconnecting' ? 'Reconnecting' : 'Not paired'}</span>{connected && state.rtt !== null && <small>{state.rtt} ms</small>}</div>
      <div className="phone-tools"><button type="button" className="phone-tool" aria-label="Controller settings" aria-haspopup="dialog" onClick={() => { connection.neutralize(); if (state.game.enabled) connection.pause(); setSettingsOpen(true); }}><ControllerIcon name="settings" /></button>
        <button type="button" className="phone-tool phone-pause" aria-label={state.game.mode === 'paused' ? 'Resume race' : 'Pause race'} onClick={() => connection.pause()} disabled={!connected || (state.game.mode !== 'paused' && !state.game.enabled)}><ControllerIcon name={state.game.mode === 'paused' ? 'play' : 'pause'} /><span>{state.game.mode === 'paused' ? 'Resume' : 'Pause'}</span></button></div>
    </header>
    <div className="phone-notice" role="status" data-ready={enabled}><span>{notice}</span><small className="phone-landscape-hint">More room in landscape</small></div>
    <PhoneControlDeck touch={touch} mode={mode} enabled={enabled} itemsEnabled={!!state.game.itemsEnabled} calibrated={calibrated} deckRef={deck} sliderRef={slider}
      onTouch={() => { connection.neutralize(); setMode('touch'); setSensor(false); setWarning(''); setMessage('Touch steering active. Slide left or right; release to center.'); }} onMotion={() => { void enableMotion(); }} onCalibrate={calibrate} />
    {settingsOpen && <ControllerSettings settings={settings} rate={rate} rtt={state.rtt} message={message} onSettings={next => { connection.neutralize(); setSettings(next); }} onRate={setRate} onClose={() => setSettingsOpen(false)} />}
  </main>;
}
