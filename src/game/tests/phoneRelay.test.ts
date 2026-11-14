import { createServer } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { attachPhoneRelay, allowedPhoneOrigin } from '../../../server/phoneRelay';
import { PHONE_CONFIG, type ClientEvents, type ServerEvents, type LinkStatus, type ControlPacket } from '../../phone/protocol';
import { NEUTRAL_INPUT } from '../core/types';

const clients: Socket<ServerEvents, ClientEvents>[] = [];
let relay: ReturnType<typeof attachPhoneRelay> | null = null;
async function setup() {
  const server = createServer((_req, response) => { response.writeHead(404).end(); });
  let now = Date.now(); relay = attachPhoneRelay(server, { origins: () => [], lan: false, now: () => now });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No test port');
  const url = `http://127.0.0.1:${address.port}`;
  const connect = async (origin = url) => {
    const socket: Socket<ServerEvents, ClientEvents> = io(url, { path: PHONE_CONFIG.path, transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: { Origin: origin } }); clients.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); }); return socket;
  };
  return { connect, advance: (ms: number) => { now += ms; } };
}
afterEach(async () => { for (const socket of clients.splice(0)) socket.disconnect(); await relay?.close(); relay = null; });
const link = (socket: Socket<ServerEvents, ClientEvents>, state?: LinkStatus['state']) => new Promise<LinkStatus>(resolve => {
  const handler = (value: LinkStatus) => { if (!state || value.state === state) { socket.off('host:link', handler); resolve(value); } }; socket.on('host:link', handler);
});
const input = (socket: Socket<ServerEvents, ClientEvents>) => new Promise<ControlPacket>(resolve => socket.once('host:input', resolve));
const packet = (seq: number): ControlPacket => ({ version: 1, seq, sentAt: performance.now(), active: true, input: { ...NEUTRAL_INPUT, throttle: 1, steer: 1 } });

describe('real Socket.IO pairing relay', () => {
  it('forwards item availability and the validated item action through real sockets', async () => {
    const { connect } = await setup(), host = await connect(), phone = await connect();
    const offer = await host.timeout(1500).emitWithAck('host:create'); if (!offer.ok) throw new Error(offer.error);
    await phone.timeout(1500).emitWithAck('phone:join', { token: offer.token });
    const state = new Promise<unknown>(resolve => phone.once('phone:state', resolve));
    host.emit('host:state', { mode: 'playing', enabled: true, itemsEnabled: true });
    expect(await state).toEqual({ mode: 'playing', enabled: true, itemsEnabled: true });
    const received = input(host); phone.emit('phone:input', { ...packet(0), input: { ...NEUTRAL_INPUT, useItem: true } });
    expect((await received).input.useItem).toBe(true);
  });
  it('only the paired host can forward bounded steering configuration and calibration requests', async () => {
    const { connect } = await setup(), host = await connect(), phone = await connect(), stranger = await connect();
    const offer = await host.timeout(1500).emitWithAck('host:create'); if (!offer.ok) throw new Error(offer.error);
    await phone.timeout(1500).emitWithAck('phone:join', { token: offer.token });
    const configuration = { touch: false, fullLockDegrees: 30, calibrate: true };
    let count = 0; phone.on('phone:configure', () => count++);
    stranger.emit('host:configure', configuration); phone.emit('host:configure', configuration);
    host.emit('host:configure', { ...configuration, fullLockDegrees: 900 });
    const received = new Promise<unknown>(resolve => phone.once('phone:configure', resolve));
    const extra = { ...configuration, unexpected: 'discard this' }; host.emit('host:configure', extra);
    expect(await received).toEqual(configuration);
    host.on('host:ping', ack => ack()); await phone.timeout(1500).emitWithAck('phone:ping'); expect(count).toBe(1);
  });
  it('rejects cross-origin WebSocket handshakes and invalid origins', async () => {
    expect(allowedPhoneOrigin('http://evil.example', 'localhost:5173')).toBe(false); expect(allowedPhoneOrigin(undefined, 'localhost')).toBe(false); expect(allowedPhoneOrigin('http://localhost:5173', 'localhost:5173')).toBe(true);
    const fixture = await setup(); await expect(fixture.connect('http://evil.example')).rejects.toThrow();
  });
  it('pairs once, validates inputs and sequences, and measures phone→host acknowledgement latency', async () => {
    const { connect } = await setup(), host = await connect(), phone = await connect(), stranger = await connect();
    const offer = await host.timeout(1500).emitWithAck('host:create'); if (!offer.ok) throw new Error(offer.error);
    expect(offer.token).toMatch(/^[\w-]{32}$/); const connected = link(host);
    const joined = await phone.timeout(1500).emitWithAck('phone:join', { token: offer.token }); expect(joined.ok).toBe(true); expect((await connected).state).toBe('connected');
    expect((await stranger.timeout(1500).emitWithAck('phone:join', { token: offer.token })).ok).toBe(false);
    let count = 0; host.on('host:input', () => count++);
    stranger.emit('phone:input', packet(0)); phone.emit('phone:input', { ...packet(1), input: { ...NEUTRAL_INPUT, throttle: 5 } });
    const received = input(host); phone.emit('phone:input', packet(2)); expect((await received).input.steer).toBe(1);
    phone.emit('phone:input', packet(1)); phone.emit('phone:input', packet(2));
    host.on('host:ping', ack => ack()); const start = performance.now(); await phone.timeout(1500).emitWithAck('phone:ping'); expect(performance.now() - start).toBeLessThan(1000); expect(count).toBe(1);
  });
  it('resumes one disconnected phone, rotates credentials and expires the reconnect window', async () => {
    const fixture = await setup(), host = await fixture.connect(), phone = await fixture.connect();
    const offer = await host.timeout(1500).emitWithAck('host:create'); if (!offer.ok) throw new Error(offer.error);
    const joined = await phone.timeout(1500).emitWithAck('phone:join', { token: offer.token }); if (!joined.ok) throw new Error(joined.error);
    const lost = link(host, 'reconnecting'); phone.disconnect(); expect((await lost).state).toBe('reconnecting');
    const replacement = await fixture.connect(); const resumed = await replacement.timeout(1500).emitWithAck('phone:join', { id: joined.id, resume: joined.resume }); if (!resumed.ok) throw new Error(resumed.error); expect(resumed.resume).not.toBe(joined.resume);
    const lostAgain = link(host, 'reconnecting'); replacement.disconnect(); await lostAgain; fixture.advance(PHONE_CONFIG.reconnectGraceMs + 1);
    const late = await fixture.connect(); expect((await late.timeout(1500).emitWithAck('phone:join', { id: resumed.id, resume: resumed.resume })).ok).toBe(false);
  });
  it('expires unused tokens and revokes active credentials on desktop disconnect', async () => {
    const fixture = await setup(), host = await fixture.connect(), phone = await fixture.connect();
    const offer = await host.timeout(1500).emitWithAck('host:create'); if (!offer.ok) throw new Error(offer.error);
    fixture.advance(PHONE_CONFIG.pairLifetimeMs + 1); expect((await phone.timeout(1500).emitWithAck('phone:join', { token: offer.token })).ok).toBe(false);
    const fresh = await host.timeout(1500).emitWithAck('host:create'); if (!fresh.ok) throw new Error(fresh.error);
    const joined = await phone.timeout(1500).emitWithAck('phone:join', { token: fresh.token }); if (!joined.ok) throw new Error(joined.error);
    const ended = new Promise<string>(resolve => phone.once('phone:ended', resolve)); host.disconnect(); expect(await ended).toContain('computer disconnected');
    const next = await fixture.connect(); expect((await next.timeout(1500).emitWithAck('phone:join', { id: joined.id, resume: joined.resume })).ok).toBe(false);
  });
  it('signals a stale input stream and disconnects an excessive sender', async () => {
    const fixture = await setup(), host = await fixture.connect(), phone = await fixture.connect();
    const offer = await host.timeout(1500).emitWithAck('host:create'); if (!offer.ok) throw new Error(offer.error);
    await phone.timeout(1500).emitWithAck('phone:join', { token: offer.token });
    const stale = link(host, 'inactive'); fixture.advance(351); expect((await stale).state).toBe('inactive');
    const disconnected = new Promise<void>(resolve => phone.once('disconnect', () => resolve()));
    for (let i = 0; i < 100; i++) phone.emit('phone:input', packet(i)); await disconnected; expect(phone.connected).toBe(false);
  });
});
