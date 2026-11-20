import { useSyncExternalStore } from 'react';
import { PairingPanel } from '../../../phone/PairingPanel';
import { GameButton } from '../GameButton';
import type { RemoteHost } from '../../../phone/RemoteHost';

export function PhoneControllerPanel({ host, onClose, returnFocusElement }: { host: RemoteHost; onClose: () => void; returnFocusElement?: HTMLElement | null }) {
  const state = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getSnapshot), preferences = state.preferences;
  return <div className="phone-settings-host"><PairingPanel host={host} onClose={onClose} returnFocusElement={returnFocusElement}>
    <section className="phone-desktop-settings" aria-label="Phone steering preferences"><h3>Steering</h3><p>Motion access is granted on your phone.</p>
      <div className="phone-desktop-tuning"><label className="phone-touch-toggle"><span>Touch steering<small>Turn off to request tilt</small></span><input type="checkbox" checked={preferences.touch} onChange={event => host.configure({ ...preferences, touch: event.currentTarget.checked })} /></label>
        <label>Tilt sensitivity <output>{preferences.fullLockDegrees}°</output><input aria-label="Tilt sensitivity" type="range" min="10" max="50" value={preferences.fullLockDegrees} onChange={event => host.configure({ ...preferences, fullLockDegrees: Number(event.currentTarget.value) })} /></label>
        <GameButton tone="surface" size="small" data-selection-action disabled={state.link.state !== 'connected' || preferences.touch} onClick={() => host.configure(preferences, true)}>Calibrate on phone</GameButton>
      </div>
    </section>
  </PairingPanel></div>;
}
