import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { GameButton } from '../game/ui/GameButton';
import type { RemoteHost } from './RemoteHost';
import { pairingUrl, PHONE_CONFIG } from './protocol';
import { useDialogFocus } from '../game/ui/useDialogFocus';
import './phone.css';
function PairCode({ url }: { url: string }) {
  const [image, setImage] = useState('');
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 280, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#173c48', light: '#ffffff' } }).then(data => { if (active) setImage(data); }).catch(() => { if (active) setImage(''); });
    return () => { active = false; };
  }, [url]);
  return image ? <img className="pair-qr" src={image} width={240} height={240} alt="Scan to pair this phone with this game session" /> : <p role="status">Preparing QR code… Use the link below if it cannot render.</p>;
}
export function PairingPanel({ host, onClose, children }: { host: RemoteHost; onClose: () => void; children?: ReactNode }) {
  const state = useSyncExternalStore(host.subscribe, host.getSnapshot), { ref, trapFocus } = useDialogFocus();
  const [origin, setOrigin] = useState(''), [now, setNow] = useState(Date.now), [copied, setCopied] = useState(false);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const offer = state.offer;
  const origins = offer ? [...new Set([...(offer.lan ? offer.origins : []), window.location.origin])] : [];
  const selectedOrigin = origins.includes(origin) ? origin : origins[0];
  const url = offer && selectedOrigin ? pairingUrl(selectedOrigin, offer.token) : '';
  const waiting = state.link.state === 'waiting' && offer && now < offer.expiresAt;
  return <div className="pair-scrim"><div ref={ref} className="pair-panel" role="dialog" aria-modal="true" aria-labelledby="pair-title" onKeyDown={event => { trapFocus(event); if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <button className="pair-close" onClick={onClose} aria-label="Close phone pairing">×</button><span className="eyebrow">A LITTLE MORE FREEDOM</span><h2 id="pair-title">Your phone.<br />Your steering wheel<span>.</span></h2>
    <p className="pair-status" role="status" data-state={state.link.state}>{state.busy ? 'Starting local relay…' : state.link.reason}</p>
    {state.error && <p role="alert" className="pair-error">{state.error}</p>}
    {waiting && <><div className="pair-code"><PairCode url={url} /><div><strong>{offer.lan ? 'Scan. Pair. Take the wheel.' : 'Computer-only test link'}</strong><p>One phone per player. Code expires in {Math.min(PHONE_CONFIG.pairLifetimeMs / 1000, Math.max(0, Math.ceil((offer.expiresAt - now) / 1000)))} seconds.</p>
      <label>Computer address<select value={selectedOrigin} onChange={event => setOrigin(event.currentTarget.value)}>{origins.map(value => <option key={value}>{value}</option>)}</select></label>
      <p>Phone and computer must be on the same Wi-Fi. Keep this game tab visible.</p></div></div>
      <label className="pair-link-label">Controller link<input aria-label="Controller pairing link" readOnly value={url} onFocus={event => event.currentTarget.select()} /></label>
      <GameButton tone="surface" size="small" className="pair-secondary" onClick={() => { navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => setCopied(false)); }}>{copied ? 'Copied' : 'Copy controller link'}</GameButton>
    </>}
    {offer && !waiting && state.link.state !== 'connected' && <p>Return to the phone to reconnect within 30 seconds, or generate a new code. A consumed QR code cannot pair another phone.</p>}
    {state.link.state === 'connected' && <div className="pair-connected"><span aria-hidden="true">✓</span><strong>Ready for the next corner.</strong><p>Close this panel, start or resume on the computer, then release the phone controls to arm. Touch works immediately; motion steering is optional.</p></div>}
    {children}
    {!offer?.lan && <div className="pair-help"><strong>For a real phone</strong><p>Stop the normal server, generate certificates with <code>npm run phone:cert</code>, trust the local CA on both devices, then run <code>npm run dev:phone</code>. Full Wi-Fi and certificate instructions are in <code>docs/PHONE_CONTROLLER.md</code>.</p></div>}
    <div className="pair-actions"><GameButton className="primary" onClick={onClose}>Back to the game</GameButton><GameButton tone="surface" size="small" disabled={state.busy} className="pair-secondary" onClick={() => host.pair()}>{offer ? 'New pairing code' : 'Generate code'}</GameButton><GameButton tone="surface" size="small" className="pair-secondary" onClick={() => host.disconnect()}>Disconnect phone</GameButton></div>
    <p className="pair-footnote">Connection loss pauses driving and clears phone input. Keyboard and gamepad remain available.</p>
  </div></div>;
}
