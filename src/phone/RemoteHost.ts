import { io, type Socket } from 'socket.io-client';
import { RemoteInput } from './RemoteInput';
import { PHONE_CONFIG, type ClientEvents, type ServerEvents, type PairOffer, type LinkStatus, type GameControlState, type PhonePreferences } from './protocol';

export interface HostSnapshot { offer: PairOffer | null; link: LinkStatus; busy: boolean; error: string; preferences: PhonePreferences }
export class RemoteHost {
  private socket: Socket<ServerEvents, ClientEvents> | null = null;
  private listeners = new Set<() => void>();
  private snapshot: HostSnapshot = { offer: null, link: { state: 'offline', reason: 'Use your phone as a wireless controller.' }, busy: false, error: '', preferences: { touch: true, fullLockDegrees: 25 } };
  private configured = false;
  private handlers = { pause: () => undefined as void, unsafe: () => undefined as void };
  private game: GameControlState = { mode: 'menu', enabled: false };
  readonly input = new RemoteInput(() => performance.now(), () => this.handlers.unsafe());
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<HostSnapshot>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach(listener => listener()); }
  setHandlers(handlers: { pause: () => void; unsafe: () => void }) { this.handlers = handlers; }
  private connect() {
    if (this.socket) return this.socket;
    const socket: Socket<ServerEvents, ClientEvents> = io({ path: PHONE_CONFIG.path, transports: ['websocket'], autoConnect: false, reconnection: false });
    socket.on('host:input', packet => this.input.receive(packet));
    socket.on('host:ping', ack => { if (typeof ack === 'function') ack(); });
    socket.on('host:pause', () => this.handlers.pause());
    socket.on('host:link', link => {
      if (link.state === 'connected') { this.input.connect(); if (this.configured) socket.emit('host:configure', { ...this.snapshot.preferences, calibrate: false }); } else if (link.state !== 'waiting') this.input.lose();
      this.update({ link, ...(link.state === 'offline' ? { offer: null } : {}) });
    });
    socket.on('disconnect', () => { this.input.lose(); this.update({ busy: false, offer: null, link: { state: 'offline', reason: 'Relay disconnected. Generate a new code.' } }); });
    socket.on('connect_error', () => this.update({ busy: false, error: 'Phone relay unavailable. Run npm run dev or the documented Node preview server.' }));
    this.socket = socket; return socket;
  }
  pair() {
    this.input.lose(); this.update({ busy: true, error: '' });
    const socket = this.connect();
    const create = () => socket.timeout(4000).emit('host:create', (error: Error | null, reply) => {
      if (error || !reply) { this.update({ busy: false, error: 'Pairing timed out. Check the local server and retry.' }); return; }
      if (!reply.ok) { this.update({ busy: false, error: reply.error }); return; }
      this.update({ busy: false, offer: reply }); socket.emit('host:state', this.game);
    });
    if (socket.connected) create(); else { socket.off('connect'); socket.once('connect', create); socket.connect(); }
  }
  configure(preferences: PhonePreferences, calibrate = false) {
    this.clear(); this.configured = true; this.update({ preferences });
    this.socket?.emit('host:configure', { ...preferences, calibrate });
  }
  setGameState(state: GameControlState) { this.game = state; this.socket?.emit('host:state', state); if (!state.enabled) this.input.clear(); }
  clear() { this.input.clear(); }
  sample(enabled: boolean) { return this.input.sample(enabled && this.game.enabled); }
  disconnect() { this.socket?.emit('host:revoke'); this.input.lose(); this.socket?.disconnect(); this.socket?.removeAllListeners(); this.socket = null; this.update({ offer: null, busy: false, error: '', link: { state: 'offline', reason: 'Phone disconnected. Keyboard and gamepad remain available.' } }); }
  dispose() { this.disconnect(); this.handlers = { pause: () => undefined, unsafe: () => undefined }; }
}
