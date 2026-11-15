import { useEffect, useState, type ReactNode } from 'react';
import { MenuIcon } from './MenuIcons';
import { GameButton } from '../GameButton';
import { panelCommand, useMenuNavigation } from './useMenuNavigation';

export function MenuPanel({ title, subtitle, children, onClose, returnFocusElement }: { title: string; subtitle: string; children: ReactNode; onClose: () => void; returnFocusElement?: HTMLElement | null }) {
  const navigation = useMenuNavigation(action => panelCommand(navigation.ref.current, action, onClose), title, true, returnFocusElement);
  return <div className="menu-panel-scrim"><div {...navigation} className="menu-settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="menu-panel-heading"><span className="flow-overline">MAKE YOURSELF AT HOME</span><button className="menu-icon-button" data-selection-action aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>×</button><h2 id="settings-title">{title}<em>.</em></h2><p>{subtitle}</p></div>{children}<footer className="menu-panel-footer"><GameButton className="selection-confirm" data-selection-action onClick={onClose}>Back</GameButton></footer></div></div>;
}
export function SettingsScreen({ audioEnabled, onAudio, onController, onPhone, onPractice, onClose, returnFocusElement }: {
  audioEnabled: boolean; onAudio: () => void; onController: () => void; onPhone: () => void; onPractice: () => void; onClose: () => void; returnFocusElement?: HTMLElement | null;
}) {
  return <MenuPanel title="Your settings" subtitle="A few small things. A better time behind the wheel." onClose={onClose} returnFocusElement={returnFocusElement}><div className="settings-options">
    <button data-menu-current="true" data-selection-action onClick={onAudio} aria-pressed={audioEnabled}><MenuIcon name={audioEnabled ? 'sound' : 'muted'} /><span><strong>Game sound</strong><small>Synthesized engine, drift and race cues</small></span><b>{audioEnabled ? 'ON' : 'OFF'}</b></button>
    <button data-selection-action onClick={onController}><MenuIcon name="controller" /><span><strong>Controller & input</strong><small>Keyboard mappings and standard gamepads</small></span></button>
    <button data-selection-action onClick={onPhone}><MenuIcon name="phone" /><span><strong>Phone controller</strong><small>Pair over Wi-Fi, tune touch or motion steering</small></span></button>
    <button data-selection-action onClick={onPractice}><MenuIcon name="flag" /><span><strong>Free Drive practice</strong><small>Keep exploring without a clock or opponents</small></span></button>
  </div><p className="settings-smallprint">Appearance changes never affect handling. Sound preferences are saved on this browser.</p></MenuPanel>;
}
export function ControllerSettingsPanel({ onClose, onPhone, returnFocusElement }: { onClose: () => void; onPhone: () => void; returnFocusElement?: HTMLElement | null }) {
  const [pads, setPads] = useState<string[]>([]);
  useEffect(() => {
    const read = () => { try { setPads(Array.from(navigator.getGamepads?.() ?? []).filter(pad => pad?.connected && pad.mapping === 'standard').map(pad => pad!.id)); } catch { setPads([]); } };
    read(); const timer = setInterval(read, 1500); window.addEventListener('gamepadconnected', read); window.addEventListener('gamepaddisconnected', read);
    return () => { clearInterval(timer); window.removeEventListener('gamepadconnected', read); window.removeEventListener('gamepaddisconnected', read); };
  }, []);
  return <MenuPanel title="Take the wheel" subtitle="Your controls, all in one place." onClose={onClose} returnFocusElement={returnFocusElement}><div className="input-device-status"><MenuIcon name="controller" /><div><strong>{pads.length ? 'Gamepad connected' : 'Keyboard ready'}</strong><span>{pads.join(' · ') || 'Connect a standard gamepad and press a button to wake it.'}</span></div></div><table className="input-mappings"><thead><tr><th>Action</th><th>Keyboard</th><th>Gamepad</th></tr></thead><tbody>{[['Accelerate', 'W / ↑', 'RT'], ['Brake / reverse', 'S / ↓', 'LT'], ['Steer', 'A D / ← →', 'Left stick / D-pad'], ['Drift / hop', 'Space', 'A / cross or RB'], ['Use item', 'E / Shift', 'X / square'], ['Pause', 'Escape', 'Menu / Start'], ['Recover kart', 'R', 'View / Select'], ['Menu confirm / back', 'Enter / Escape', 'A / B']].map(row => <tr key={row[0]}>{row.map((cell, i) => i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>)}</tr>)}</tbody></table><p className="settings-smallprint">Release held buttons after connecting or resuming. Keyboard steering takes priority. Rebinding is not yet available.</p><GameButton className="settings-phone-link" data-selection-action onClick={onPhone}><MenuIcon name="phone" /> Use your phone instead</GameButton></MenuPanel>;
}
