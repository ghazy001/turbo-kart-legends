import type { HostSnapshot } from './RemoteHost';
import { PHONE_CONFIG, type PairOffer } from './protocol';

export function pairingOrigins(offer: PairOffer | null, currentOrigin: string): string[] {
  if (!offer) return [];
  const origins = offer.public ? offer.origins : offer.lan ? [...offer.origins, currentOrigin] : [currentOrigin];
  return [...new Set(origins.filter(Boolean))];
}

/** Presentation only. Never changes token lifetime, connection or rearming rules. */
export function pairingPresentation(state: HostSnapshot, now: number) {
  const seconds = state.offer ? Math.min(PHONE_CONFIG.pairLifetimeMs / 1000, Math.max(0, Math.ceil((state.offer.expiresAt - now) / 1000))) : 0;
  const kind = state.busy ? 'busy' : state.error ? 'error' : state.link.state === 'connected' ? 'connected'
    : state.link.state === 'reconnecting' ? 'reconnecting' : state.link.state === 'inactive' ? 'inactive'
    : state.link.state === 'waiting' && state.offer ? seconds > 0 ? 'waiting' : 'expired' : 'idle';
  const status = { busy: 'Getting ready', error: 'Connection unavailable', connected: 'Phone connected', reconnecting: 'Reconnecting', inactive: 'Phone inactive', waiting: 'Ready to pair', expired: 'Code expired', idle: 'Not connected' }[kind];
  const description = { busy: 'Preparing a secure connection for your phone.', error: 'Try a new code when your connection is ready.',
    connected: 'You’re all set. Start or resume your race on the computer.', reconnecting: 'Controls are released. Return to your phone to reconnect.',
    inactive: 'Controls are released. Keep your phone’s controller page visible.',
    waiting: state.offer?.public ? 'Scan with your phone’s camera. Touch or tilt. Your choice.' : state.offer?.lan ? 'Connect to the same Wi-Fi, then scan with your phone’s camera.' : 'Local preview. Open Options for Wi-Fi setup on a real phone.',
    expired: 'A fresh code is one tap away.', idle: 'Bring your phone along for the next race.' }[kind];
  return { kind, status, description, seconds, showCode: kind === 'waiting', hasPhone: ['connected', 'reconnecting', 'inactive'].includes(kind) };
}
