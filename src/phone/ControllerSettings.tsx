import { useDialogFocus } from '../game/ui/useDialogFocus';
import { ControllerIcon } from './ControllerIcon';
import type { TiltSettings } from './steering';

interface ControllerSettingsProps {
  settings: TiltSettings; rate: number; message: string; rtt: number | null;
  onSettings: (settings: TiltSettings) => void; onRate: (rate: number) => void; onClose: () => void;
}
export function ControllerSettings({ settings, rate, message, rtt, onSettings, onRate, onClose }: ControllerSettingsProps) {
  const { ref, trapFocus } = useDialogFocus();
  return <div className="controller-settings-scrim"><div ref={ref} className="controller-settings" role="dialog" aria-modal="true" aria-labelledby="controller-settings-title"
    onKeyDown={event => { trapFocus(event); if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    <header><div><span className="controller-overline">MAKE IT YOURS</span><h2 id="controller-settings-title">Your controls<span>.</span></h2></div><button type="button" className="phone-tool" aria-label="Close controller settings" onClick={onClose}><ControllerIcon name="close" /></button></header>
    <p className="controller-sensor-message" role="status">{message}</p>
    <div className="phone-setting-grid">
      <label><span>Tilt sensitivity <output>{settings.fullLockDegrees}°</output></span><input type="range" min="10" max="50" value={settings.fullLockDegrees} onChange={event => onSettings({ ...settings, fullLockDegrees: Number(event.currentTarget.value) })} /><small>Smaller angle, quicker turns</small></label>
      <label><span>Dead zone <output>{Math.round(settings.deadzone * 100)}%</output></span><input type="range" min="0" max="0.2" step="0.01" value={settings.deadzone} onChange={event => onSettings({ ...settings, deadzone: Number(event.currentTarget.value) })} /></label>
      <label><span>Smoothing <output>{Math.round(settings.smoothingSeconds * 1000)} ms</output></span><input type="range" min="0.02" max="0.2" step="0.01" value={settings.smoothingSeconds} onChange={event => onSettings({ ...settings, smoothingSeconds: Number(event.currentTarget.value) })} /></label>
      <label><span>Input rate</span><select value={rate} onChange={event => onRate(Number(event.currentTarget.value))}>{[20, 30, 45, 60].map(value => <option key={value} value={value}>{value} Hz</option>)}</select></label>
      <label className="phone-invert"><span>Invert steering</span><input type="checkbox" checked={settings.inverted} onChange={event => onSettings({ ...settings, inverted: event.currentTarget.checked })} /></label>
    </div>
    <footer><span>Connection · {rtt === null ? 'Checking connection' : `${rtt} ms round trip`}<small>Connection loss releases all controls.</small></span><button type="button" className="phone-settings-done" onClick={onClose}>Done</button></footer>
  </div></div>;
}
