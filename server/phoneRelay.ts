import { createHash, randomBytes } from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import type { Http2SecureServer } from 'node:http2';
import { Server } from 'socket.io';
import { PHONE_CONFIG, validPhoneConfiguration, validPacket, validGameState, type ClientEvents, type ServerEvents, type GameControlState } from '../src/phone/protocol.ts';

const secret = () => randomBytes(24).toString('base64url');
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
interface Session {
  id: string; host: string; phone: string | null; tokenHash: string; tokenExpires: number;
  resumeHash: string; disconnectedAt: number | null; createdAt: number; lastSeq: number;
  lastInput: number; stale: boolean; game: GameControlState;
}
/** Same-origin only, including WebSocket handshakes (CORS alone does not protect them). */
export function allowedPhoneOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin || !host) return false;
  try { const url = new URL(origin); return ['http:', 'https:'].includes(url.protocol) && url.host === host && url.origin === origin; }
  catch { return false; }
}
/** Ephemeral local relay only: never owns physics, race state, accounts or persistence. */
export function attachPhoneRelay(http: HttpServer | Http2SecureServer, options: { origins: () => string[]; lan: boolean; now?: () => number }) {
  const now = options.now ?? Date.now;
  const sessions = new Map<string, Session>(), hostSessions = new Map<string, string>();
  const io = new Server<ClientEvents, ServerEvents>(http, {
    path: PHONE_CONFIG.path, serveClient: false, transports: ['websocket'], maxHttpBufferSize: 2048,
    pingInterval: 2000, pingTimeout: 3000, perMessageDeflate: false,
    allowRequest: (request, done) => {
      const origins = options.origins();
      done(null, io.engine.clientsCount < 64 && allowedPhoneOrigin(request.headers.origin, request.headers.host) && (!origins.length || origins.includes(request.headers.origin ?? '')));
    },
  });
  const end = (id: string, reason: string) => {
    const session = sessions.get(id); if (!session) return;
    if (session.phone) { io.to(session.phone).emit('phone:ended', reason); io.sockets.sockets.get(session.phone)?.disconnect(true); }
    io.to(session.host).emit('host:link', { state: 'offline', reason }); hostSessions.delete(session.host); sessions.delete(id);
  };
  io.on('connection', socket => {
    const authenticate = setTimeout(() => { if (!role) socket.disconnect(true); }, 10_000); authenticate.unref();
    let sessionId: string | null = null, role: 'host' | 'phone' | null = null;
    let windowStart = now(), events = 0, lastCreate = -Infinity, lastPause = -Infinity, lastPing = -Infinity;
    const withinRate = () => {
      if (now() - windowStart >= 1000) { windowStart = now(); events = 0; }
      if (++events <= PHONE_CONFIG.maxPacketsPerSecond) return true;
      socket.disconnect(true); return false;
    };
    const live = (kind: 'host' | 'phone') => {
      const session = role === kind && sessionId ? sessions.get(sessionId) : undefined;
      return session && (kind === 'host' ? session.host === socket.id : session.phone === socket.id) ? session : undefined;
    };
    socket.on('host:create', ack => {
      if (typeof ack !== 'function' || !withinRate()) return;
      if (role === 'phone' || now() - lastCreate < 1500) { ack({ ok: false, error: 'Wait a moment before generating another code.' }); return; }
      lastCreate = now();
      const old = hostSessions.get(socket.id); if (old) end(old, 'A new pairing code was requested.');
      if (sessions.size >= PHONE_CONFIG.maxSessions) { ack({ ok: false, error: 'Local pairing capacity reached. Close unused game tabs.' }); return; }
      const token = secret(), id = secret();
      const session: Session = { id, host: socket.id, phone: null, tokenHash: hash(token), tokenExpires: now() + PHONE_CONFIG.pairLifetimeMs,
        resumeHash: '', disconnectedAt: null, createdAt: now(), lastSeq: -1, lastInput: 0, stale: false, game: { enabled: false, mode: 'menu' } };
      sessions.set(id, session); hostSessions.set(socket.id, id); role = 'host'; sessionId = id;
      ack({ ok: true, id, token, expiresAt: session.tokenExpires, origins: options.origins(), lan: options.lan, rateHz: PHONE_CONFIG.rateHz });
      socket.emit('host:link', { state: 'waiting', reason: 'Scan the QR code with your phone.' });
    });
    socket.on('host:revoke', () => { if (withinRate() && live('host') && sessionId) end(sessionId, 'Disconnected by the computer.'); });
    socket.on('host:state', value => {
      const session = live('host'); if (!withinRate() || !session || !validGameState(value)) return;
      session.game = { enabled: value.enabled && value.mode === 'playing', mode: value.mode, ...(value.itemsEnabled === undefined ? {} : { itemsEnabled: value.itemsEnabled }) };
      if (session.phone) io.to(session.phone).emit('phone:state', session.game);
    });
    socket.on('host:configure', value => {
      const session = live('host'); if (!withinRate() || !session || !validPhoneConfiguration(value)) return;
      if (session.phone) io.to(session.phone).emit('phone:configure', { touch: value.touch, fullLockDegrees: value.fullLockDegrees, calibrate: value.calibrate });
    });
    socket.on('phone:join', (request, ack) => {
      if (typeof ack !== 'function' || !withinRate()) return;
      if (role || !request || typeof request !== 'object') { ack({ ok: false, error: 'This connection already has a role.' }); return; }
      let session: Session | undefined;
      if (typeof request.token === 'string' && request.token.length === 32) {
        const digest = hash(request.token); session = [...sessions.values()].find(item => item.tokenHash === digest && item.tokenExpires > now());
      } else if (typeof request.id === 'string' && typeof request.resume === 'string' && request.id.length === 32 && request.resume.length === 32) {
        const candidate = sessions.get(request.id);
        if (candidate && candidate.resumeHash === hash(request.resume) && candidate.disconnectedAt !== null && now() - candidate.disconnectedAt <= PHONE_CONFIG.reconnectGraceMs) session = candidate;
      }
      if (!session || !io.sockets.sockets.has(session.host) || now() - session.createdAt > PHONE_CONFIG.sessionLifetimeMs) { ack({ ok: false, error: 'Pairing expired or unavailable. Generate a new QR code on the computer.' }); return; }
      if (session.phone) { ack({ ok: false, error: 'A phone is already paired. Disconnect it on the computer first.' }); return; }
      const resume = secret(); session.resumeHash = hash(resume); session.tokenHash = ''; session.phone = socket.id; session.disconnectedAt = null;
      session.lastSeq = -1; session.lastInput = now(); session.stale = false; sessionId = session.id; role = 'phone';
      ack({ ok: true, id: session.id, resume, game: session.game });
      io.to(session.host).emit('host:link', { state: 'connected', reason: 'Phone connected. Release controls to arm.' });
    });
    socket.on('phone:input', packet => {
      const session = live('phone'); if (!withinRate() || !session || !validPacket(packet) || packet.seq <= session.lastSeq) return;
      session.lastSeq = packet.seq; session.lastInput = now();
      if (session.stale && packet.active) { session.stale = false; io.to(session.host).emit('host:link', { state: 'connected', reason: 'Phone input restored. Release controls to arm.' }); }
      // Build a bounded object: never forward arbitrary client fields or executable commands.
      io.to(session.host).volatile.emit('host:input', { version: 1, seq: packet.seq, sentAt: packet.sentAt, active: packet.active,
        input: { throttle: packet.input.throttle, brake: packet.input.brake, steer: packet.input.steer, drift: packet.input.drift, useItem: !!packet.input.useItem } });
    });
    socket.on('phone:pause', () => {
      const session = live('phone'); if (!withinRate() || !session || now() - lastPause < 500) return;
      lastPause = now(); io.to(session.host).emit('host:pause');
    });
    socket.on('phone:ping', ack => {
      const session = live('phone'); if (typeof ack !== 'function' || !withinRate() || !session || now() - lastPing < 900) return;
      lastPing = now(); io.to(session.host).timeout(1000).emit('host:ping', error => { if (!error && socket.connected) ack(); });
    });
    socket.on('disconnect', () => {
      clearTimeout(authenticate);
      if (role === 'host' && sessionId) end(sessionId, 'The computer disconnected. Pair again.');
      const session = live('phone');
      if (session && session.phone === socket.id) {
        session.phone = null; session.disconnectedAt = now(); session.stale = true;
        io.to(session.host).emit('host:link', { state: 'reconnecting', reason: 'Phone disconnected. Race paused; reconnect within 30 seconds.' });
      }
    });
  });
  const maintenance = setInterval(() => {
    const time = now();
    for (const session of sessions.values()) {
      if (time - session.createdAt > PHONE_CONFIG.sessionLifetimeMs || (!session.resumeHash && time >= session.tokenExpires)
        || (session.disconnectedAt !== null && time - session.disconnectedAt > PHONE_CONFIG.reconnectGraceMs)) { end(session.id, 'Pairing expired. Generate a new QR code.'); continue; }
      if (session.phone && !session.stale && time - session.lastInput > PHONE_CONFIG.inputTimeoutMs) {
        session.stale = true; io.to(session.host).emit('host:link', { state: 'inactive', reason: 'Phone input timed out. Race paused.' });
      }
    }
  }, 100); maintenance.unref();
  let stopped = false;
  const dispose = () => {
    if (stopped) return; stopped = true; clearInterval(maintenance);
    io.disconnectSockets(true); io.engine.close(); sessions.clear(); hostSessions.clear();
  };
  http.once('close', dispose);
  return { io, dispose, close: async () => { dispose(); await io.close(); } };
}
