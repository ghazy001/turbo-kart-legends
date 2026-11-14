import { io, type Socket } from 'socket.io-client';
import type { KartInput } from '../game/core/types';
import { PHONE_CONFIG, validPhoneConfiguration, type ClientEvents, type ServerEvents, type GameControlState, type ResumeCredentials, type PhoneConfiguration } from './protocol';
interface PhoneSnapshot { status: 'connecting' | 'connected' | 'reconnecting' | 'error' | 'ended'; message: string; game: GameControlState; rtt: number | null }
const storageKey = 'turbo-kart.phone-session.v1';
export class PhoneConnection {
  private configure: (configuration: PhoneConfiguration) => void = () => undefined;
  setConfigurationHandler(handler: (configuration: PhoneConfiguration) => void) { this.configure = handler; }
  private socket: Socket<ServerEvents, ClientEvents> | null = null;
  private listeners = new Set<() => void>(); private credentials: ResumeCredentials | null = null;
  private timer: ReturnType<typeof setInterval> | null = null; private pingTimer: ReturnType<typeof setInterval> | null = null;
  private seq = 0; private lastTick = 0;
  private snapshot: PhoneSnapshot = { status: 'connecting', message: 'Connecting to the computer…', game: { enabled: false, mode: 'menu' }, rtt: null };
  constructor(private token: string, private readonly sample: (dt: number) => { input: KartInput; active: boolean }, private readonly clear: () => void) {
    try { const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null'); if (saved && typeof saved === 'object' && 'id' in saved && 'resume' in saved && typeof saved.id === 'string' && typeof saved.resume === 'string' && saved.id.length === 32 && saved.resume.length === 32) this.credentials = { id: saved.id, resume: saved.resume }; }
    catch { this.credentials = null; }
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  private update(patch: Partial<PhoneSnapshot>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach(listener => listener()); }
  private save(credentials: ResumeCredentials | null) { this.credentials = credentials; try { if (credentials) sessionStorage.setItem(storageKey, JSON.stringify(credentials)); else sessionStorage.removeItem(storageKey); } catch { /* Memory-only reconnect still works when storage is denied. */ } }
  start() {
    if (this.socket) return;
    if (!this.token && !this.credentials) { this.update({ status: 'error', message: 'Open Connect Phone on the computer and scan its QR code.' }); return; }
    const socket: Socket<ServerEvents, ClientEvents> = io({ path: PHONE_CONFIG.path, transports: ['websocket'], autoConnect: false, reconnectionAttempts: 8, reconnectionDelay: 500, reconnectionDelayMax: 3000, timeout: 4000 });
    this.socket = socket;
    socket.on('connect', () => {
      this.clear();
      socket.timeout(4000).emit('phone:join', this.token ? { token: this.token } : this.credentials ?? {}, (error: Error | null, reply) => {
        if (error || !reply) { this.update({ status: 'error', message: 'Pairing timed out. Check Wi-Fi and generate a new QR code.' }); return; }
        if (!reply.ok) { this.save(null); this.update({ status: 'error', message: reply.error }); socket.disconnect(); return; }
        this.token = ''; this.save({ id: reply.id, resume: reply.resume }); this.seq = 0;
        this.update({ status: 'connected', message: 'Connected. Release buttons and center steering to arm.', game: reply.game });
      });
    });
    socket.on('phone:state', game => { if (!game.enabled) this.clear(); this.update({ game }); });
    socket.on('phone:configure', configuration => { if (validPhoneConfiguration(configuration)) { this.neutralize(); this.configure(configuration); } });
    socket.on('phone:ended', reason => { this.clear(); this.save(null); this.update({ status: 'ended', message: reason }); socket.disconnect(); });
    socket.on('disconnect', () => { this.clear(); if (this.snapshot.status !== 'ended' && this.snapshot.status !== 'error') this.update({ status: 'reconnecting', message: 'Connection lost. Controls released; reconnecting…', rtt: null }); });
    socket.on('connect_error', () => { this.clear(); this.update({ status: 'reconnecting', message: 'Cannot reach the computer. Check Wi-Fi, server and certificate trust.', rtt: null }); });
    socket.io.on('reconnect_failed', () => this.update({ status: 'error', message: 'Reconnect window ended. Generate a new code on the computer.' }));
    socket.connect(); this.setRate(PHONE_CONFIG.rateHz);
    this.pingTimer = setInterval(() => {
      if (!socket.connected || this.snapshot.status !== 'connected' || document.hidden) return;
      const start = performance.now(); socket.timeout(1800).emit('phone:ping', (error: Error | null) => this.update({ rtt: error ? null : Math.round(performance.now() - start) }));
    }, 2000);
  }
  setRate(hz: number) {
    if (this.timer) clearInterval(this.timer);
    const rate = [20, 30, 45, 60].includes(hz) ? hz : PHONE_CONFIG.rateHz;
    this.lastTick = performance.now(); this.timer = setInterval(() => this.send(), 1000 / rate);
  }
  private send() {
    const now = performance.now(), dt = Math.min(0.1, (now - this.lastTick) / 1000); this.lastTick = now;
    if (!this.socket?.connected || this.snapshot.status !== 'connected') return;
    const value = this.sample(dt);
    this.socket.volatile.emit('phone:input', { version: 1, seq: this.seq++, sentAt: now, active: value.active && !document.hidden, input: value.input });
  }
  neutralize() { this.clear(); if (this.socket?.connected) this.socket.emit('phone:input', { version: 1, seq: this.seq++, sentAt: performance.now(), active: false, input: { throttle: 0, brake: 0, steer: 0, drift: false, useItem: false } }); }
  pause() { this.clear(); if (this.snapshot.status === 'connected') this.socket?.emit('phone:pause'); }
  dispose() { this.neutralize(); if (this.timer) clearInterval(this.timer); if (this.pingTimer) clearInterval(this.pingTimer); this.socket?.io.removeAllListeners(); this.socket?.removeAllListeners(); this.socket?.disconnect(); this.socket = null; this.timer = null; this.pingTimer = null; }
}
