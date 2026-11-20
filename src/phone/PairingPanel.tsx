import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { GameButton } from '../game/ui/GameButton';
import { panelCommand, useMenuNavigation } from '../game/ui/menu/useMenuNavigation';
import type { RemoteHost } from './RemoteHost';
import { pairingUrl } from './protocol';
import { pairingOrigins, pairingPresentation } from './pairingPresentation';
import { ControllerIcon } from './ControllerIcon';
import './phone.css';

function PairCode({ url }: { url: string }) {
  const [code, setCode] = useState<{ url: string; image: string } | null>(null);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 288, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#173c48', light: '#ffffff' } })
      .then(image => { if (active) setCode({ url, image }); }).catch(() => { if (active) setCode({ url, image: '' }); });
    return () => { active = false; };
  }, [url]);
  // Never display a previous token while its replacement QR is being generated.
  return code?.url === url && code.image
    ? <img className="pair-qr" src={code.image} width={216} height={216} alt="Scan to pair your phone with this game" />
    : <div className="pair-qr-placeholder" role="status"><ControllerIcon name="phone" /><span>{code?.url === url ? 'Use Copy link to pair' : 'Preparing your code…'}</span></div>;
}

export function PairingPanel({ host, onClose, children, returnFocusElement }: { host: RemoteHost; onClose: () => void; children?: ReactNode; returnFocusElement?: HTMLElement | null }) {
  const state = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getSnapshot);
  const navigation = useMenuNavigation(action => panelCommand(navigation.ref.current, action, onClose), 'Phone pairing', true, returnFocusElement);
  const [origin, setOrigin] = useState(''), [now, setNow] = useState(Date.now);
  const [copy, setCopy] = useState<{ url: string; ok: boolean } | null>(null);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const offer = state.offer, view = pairingPresentation(state, now);
  const origins = pairingOrigins(offer, typeof window === 'undefined' ? '' : window.location.origin);
  const selectedOrigin = origins.includes(origin) ? origin : origins[0];
  const url = offer && selectedOrigin ? pairingUrl(selectedOrigin, offer.token) : '';
  const copyLink = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url); setCopy({ url, ok: true });
    } catch { setCopy({ url, ok: false }); }
  };
  return <div className="pair-scrim"><div {...navigation} className="pair-panel" role="dialog" aria-modal="true" aria-labelledby="pair-title" data-pair-state={view.kind}>
    <header className="pair-header"><span className="pair-wordmark"><ControllerIcon name="phone" />POCKET WHEEL</span><button type="button" data-selection-action className="pair-close" onClick={onClose} aria-label="Close phone pairing"><ControllerIcon name="close" /></button></header>
    <div className="pair-scroll">
      <div className="pair-content"><div className="pair-intro"><p className="pair-status" role="status" data-state={view.kind}><i />{view.status}</p>
        <h2 id="pair-title">Your phone.<br />Your steering wheel<span>.</span></h2><p className="pair-description">{view.description}</p>
        {view.kind === 'connected' && <span className="pair-ready-note"><ControllerIcon name="check" />Release controls before driving</span>}
        {state.error && <p role="alert" className="pair-error">{state.error}</p>}
      </div>
      <div className="pair-visual">
        {view.showCode && url ? <><div className="pair-code-frame"><PairCode url={url} /></div><span className="pair-expiry">Expires in <time>{Math.floor(view.seconds / 60)}:{String(view.seconds % 60).padStart(2, '0')}</time></span>
          <button type="button" data-selection-action className="pair-copy" onClick={() => { void copyLink(); }}><ControllerIcon name={copy?.url === url && copy.ok ? 'check' : 'copy'} />{copy?.url === url && copy.ok ? 'Link copied' : 'Copy link'}</button></>
          : <div className="pair-device-stage" aria-hidden="true"><div className="pair-device"><span /><ControllerIcon name="wheel" /><i><ControllerIcon name={view.kind === 'connected' ? 'check' : view.kind === 'busy' ? 'settings' : 'phone'} /></i></div><div className="pair-device-ring" /></div>}
        {!view.showCode && !view.hasPhone && <GameButton size="small" data-selection-action disabled={state.busy} className="pair-create" onClick={() => host.pair()}>{state.busy ? 'Preparing…' : view.kind === 'expired' ? 'Get a new code' : 'Create pairing code'}</GameButton>}
      </div></div>
      {copy?.url === url && !copy.ok && view.showCode && <p className="pair-error" role="alert">Copy unavailable. Open Options to select the link manually.</p>}
      <details className="pair-options"><summary data-selection-action><ControllerIcon name="settings" /><span>Options</span><i aria-hidden="true">+</i></summary><div className="pair-options-content">
        {children}
        <section className="pair-connection-options" aria-label="Connection options"><h3>Connection</h3><p className="pair-detail-status">{state.link.reason}</p>
          {view.showCode && <><label className="pair-link-label">Controller link<input aria-label="Controller pairing link" readOnly value={url} onFocus={event => event.currentTarget.select()} /></label>
            {origins.length > 1 && <label className="pair-address">Game address<select value={selectedOrigin} onChange={event => setOrigin(event.currentTarget.value)}>{origins.map(value => <option key={value}>{value}</option>)}</select></label>}</>}
          <div className="pair-secondary-actions">{(view.showCode || view.hasPhone) && <button type="button" data-selection-action disabled={state.busy} className="pair-text-button" onClick={() => host.pair()}>{view.hasPhone ? 'Pair another phone' : 'New pairing code'}</button>}
            {offer && <button type="button" data-selection-action className="pair-text-button pair-disconnect" onClick={() => host.disconnect()}>Disconnect phone</button>}</div>
          <p className="pair-safety">Connection loss pauses the race. Keyboard and gamepad remain available.</p>
          {!offer?.lan && <div className="pair-help"><strong>Local Wi-Fi setup</strong><p>Run <code>npm run phone:cert</code>, trust the development CA on both devices, then run <code>npm run dev:phone</code>. Details: <code>docs/PHONE_CONTROLLER.md</code>. Online deployments use the public HTTPS address.</p></div>}
        </section>
      </div></details>
    </div>
    <footer className="pair-footer"><GameButton data-menu-current="true" data-selection-action className="pair-done" onClick={onClose}>Done</GameButton></footer>
  </div></div>;
}
