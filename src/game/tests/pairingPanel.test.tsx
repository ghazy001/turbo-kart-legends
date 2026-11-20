import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PairingPanel } from '../../phone/PairingPanel';
import { RemoteHost, type HostSnapshot } from '../../phone/RemoteHost';
import { pairingOrigins, pairingPresentation } from '../../phone/pairingPresentation';

const now = 10000;
const snapshot: HostSnapshot = {
  offer: { id: 'preview-session', token: 'preview-token', expiresAt: now + 120000, origins: ['https://race.example'], lan: true, public: true, rateHz: 30 },
  link: { state: 'waiting', reason: 'Scan to pair.' }, busy: false, error: '', preferences: { touch: true, fullLockDegrees: 25 },
};
function markup(state: HostSnapshot) {
  const host = new RemoteHost(); host.getSnapshot = () => state;
  return renderToStaticMarkup(<PairingPanel host={host} onClose={() => undefined} />);
}
describe('minimal phone pairing presentation', () => {
  it('uses only approved public origins and retains local Wi-Fi address selection', () => {
    expect(pairingOrigins(snapshot.offer, 'https://other.example')).toEqual(['https://race.example']);
    expect(pairingOrigins({ ...snapshot.offer!, public: false }, 'https://local.example')).toEqual(['https://race.example', 'https://local.example']);
    expect(pairingOrigins({ ...snapshot.offer!, public: false, lan: false }, 'http://localhost:5173')).toEqual(['http://localhost:5173']);
    expect(pairingOrigins(null, 'http://localhost:5173')).toEqual([]);
  });
  it('shows a code only during its actual waiting lifetime and bounds its countdown', () => {
    expect(pairingPresentation(snapshot, now).showCode).toBe(true);
    expect(pairingPresentation(snapshot, -100000).seconds).toBe(120);
    expect(pairingPresentation(snapshot, snapshot.offer!.expiresAt).kind).toBe('expired');
    expect(pairingPresentation(snapshot, snapshot.offer!.expiresAt + 1000).showCode).toBe(false);
    expect(pairingPresentation(snapshot, snapshot.offer!.expiresAt + 1000).seconds).toBe(0);
  });
  it.each(['connected', 'reconnecting', 'inactive'] as const)('%s never reuses a consumed QR and keeps the paired state after token expiry', state => {
    const view = pairingPresentation({ ...snapshot, link: { state, reason: '' } }, snapshot.offer!.expiresAt + 50000);
    expect(view.kind).toBe(state); expect(view.hasPhone).toBe(true); expect(view.showCode).toBe(false);
  });
  it('prioritizes busy/error states without leaving an old QR available', () => {
    expect(pairingPresentation({ ...snapshot, busy: true }, now).kind).toBe('busy');
    expect(pairingPresentation({ ...snapshot, busy: true }, now).showCode).toBe(false);
    expect(pairingPresentation({ ...snapshot, error: 'Relay unavailable' }, now).kind).toBe('error');
    expect(pairingPresentation({ ...snapshot, error: 'Relay unavailable' }, now).showCode).toBe(false);
  });
  it('keeps an accessible dialog, manual link and disconnect options without exposing a stale connected QR', () => {
    const html = markup({ ...snapshot, offer: { ...snapshot.offer!, expiresAt: Date.now() + 120000 } });
    expect(html).toContain('role="dialog" aria-modal="true" aria-labelledby="pair-title"');
    expect(html).toContain('Copy link'); expect(html).toContain('aria-label="Controller pairing link"');
    expect(html).toContain('<details class="pair-options">'); expect(html).toContain('Disconnect phone');
    const connected = markup({ ...snapshot, link: { state: 'connected', reason: 'Phone connected' } });
    expect(connected).toContain('Phone connected'); expect(connected).not.toContain('Controller pairing link'); expect(connected).not.toContain('Copy link');
    expect(connected).toContain('Pair another phone');
  });
  it('offers recovery for expiry and preserves visible actionable connection errors', () => {
    expect(markup(snapshot)).toContain('Get a new code');
    const error = markup({ ...snapshot, error: 'Relay unavailable' });
    expect(error).toContain('role="alert"'); expect(error).toContain('Relay unavailable'); expect(error).toContain('Create pairing code');
  });
});
