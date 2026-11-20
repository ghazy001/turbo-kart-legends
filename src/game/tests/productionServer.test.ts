import { request } from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { createProductionServer } from '../../../server/productionServer';
import { productionConfig } from '../../../server/productionConfig';
import { PHONE_CONFIG, pairingUrl, type ClientEvents, type ServerEvents, type ControlPacket } from '../../phone/protocol';
import { NEUTRAL_INPUT } from '../core/types';

const clients: Socket<ServerEvents, ClientEvents>[] = [];
let app: ReturnType<typeof createProductionServer> | null = null, root = '';
async function fixture(origin?: string) {
  root = await mkdtemp(join(tmpdir(), 'tkl-production-test-'));
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'index.html'), '<!doctype html><title>Turbo Kart Legends</title>');
  await writeFile(join(root, 'assets/app-ABCDEFGH.js'), 'export const ready = true;');
  await writeFile(join(root, 'assets/kart.glb'), Buffer.from('glTF-test-model-0123456789'));
  await writeFile(join(root, '.env'), 'secret-value');
  app = createProductionServer({ root, origin });
  await new Promise<void>((resolve, reject) => { app!.server.once('error', reject); app!.server.listen(0, '127.0.0.1', resolve); });
  const address = app.server.address(); if (!address || typeof address === 'string') throw new Error('Missing test port');
  const url = `http://127.0.0.1:${address.port}`;
  const get = (path: string, method = 'GET', headers: Record<string, string> = {}) => new Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders; body: string }>((resolve, reject) => {
    const req = request(url, { path, method, headers }, res => {
      const chunks: Buffer[] = []; res.on('data', chunk => chunks.push(Buffer.from(chunk)));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString() }));
      res.on('error', reject);
    }); req.on('error', reject); req.end();
  });
  const connect = async (requestedOrigin = origin ?? url) => {
    const socket: Socket<ServerEvents, ClientEvents> = io(url, { path: PHONE_CONFIG.path, transports: ['websocket'], forceNew: true, reconnection: false,
      extraHeaders: { Origin: requestedOrigin, 'X-Forwarded-Host': 'untrusted.example' } });
    clients.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); }); return socket;
  };
  return { url, get, connect, app };
}
afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  await app?.close(); app = null;
  if (root) await rm(root, { recursive: true, force: true }); root = '';
});

describe('Railway production configuration', () => {
  it('reads the platform port and HTTPS domain, with an explicit custom-domain override', () => {
    expect(productionConfig({})).toEqual({ port: 3000, origin: undefined });
    expect(productionConfig({ PORT: '8080', RAILWAY_PUBLIC_DOMAIN: 'kart.up.railway.app' })).toEqual({ port: 8080, origin: 'https://kart.up.railway.app' });
    expect(productionConfig({ TKL_PUBLIC_ORIGIN: 'https://race.example/', RAILWAY_PUBLIC_DOMAIN: 'kart.up.railway.app' }).origin).toBe('https://race.example');
  });
  it('rejects malformed ports and origins rather than deriving trust from incoming headers', () => {
    for (const PORT of ['', '0', '-1', '12.5', 'NaN', '65536']) expect(() => productionConfig({ PORT })).toThrow();
    for (const TKL_PUBLIC_ORIGIN of ['*', '', 'http://game.example', 'https://name:password@game.example', 'https://game.example/path', 'https://game.example?x=1', 'https://game.example#token']) expect(() => productionConfig({ TKL_PUBLIC_ORIGIN })).toThrow();
  });
});

describe('production HTTP and same-origin phone relay', () => {
  it('serves both routes and health checks with private controller responses and HEAD support', async () => {
    const { get } = await fixture();
    for (const path of ['/', '/controller', '/index.html']) {
      const result = await get(path); expect(result.status).toBe(200); expect(result.body).toContain('Turbo Kart Legends');
      expect(result.headers['cache-control']).toBe('no-store'); expect(result.headers['referrer-policy']).toBe('no-referrer');
      expect(result.headers['permissions-policy']).toContain('gyroscope=(self)');
    }
    const health = await get('/healthz'); expect(health.status).toBe(200); expect(JSON.parse(health.body)).toEqual({ status: 'ok' });
    const head = await get('/controller', 'HEAD'); expect(head.status).toBe(200); expect(head.body).toBe(''); expect(Number(head.headers['content-length'])).toBeGreaterThan(0);
    expect((await get('/controller/')).headers.location).toBe('/controller');
    expect((await get('/not-a-route')).status).toBe(404);
  });
  it('serves correct model MIME types, bounded byte ranges, immutable bundles and revalidated models', async () => {
    const { get } = await fixture();
    const model = await get('/assets/kart.glb'); expect(model.headers['content-type']).toBe('model/gltf-binary');
    expect(model.headers['cache-control']).toContain('must-revalidate');
    const range = await get('/assets/kart.glb', 'GET', { Range: 'bytes=0-3' });
    expect(range.status).toBe(206); expect(range.body).toBe('glTF'); expect(range.headers['content-range']).toBe('bytes 0-3/26');
    const bundle = await get('/assets/app-ABCDEFGH.js'); expect(bundle.headers['cache-control']).toContain('immutable');
    expect((await get('/assets/app-ABCDEFGH.js', 'GET', { 'If-None-Match': String(bundle.headers.etag) })).status).toBe(304);
  });
  it('does not serve private paths, missing models or source files as an HTML fallback', async () => {
    const { get } = await fixture();
    for (const path of ['/.env', '/.certs/key.pem', '/.git/config', '/%2e%2e/package.json', '/assets/%2e%2e/.env', '/%5c.env', '/assets/missing.glb', '/server/index.ts', '/package.json']) {
      const result = await get(path); expect(result.status).toBe(404); expect(result.body).not.toContain('secret-value'); expect(result.body).not.toContain('<!doctype');
    }
    expect((await get('/bad%ZZ')).status).toBe(400);
    const post = await get('/', 'POST'); expect(post.status).toBe(405); expect(post.headers.allow).toBe('GET, HEAD');
  });
  it('ignores unsupported ranges safely and stays available after malformed requests', async () => {
    const { get } = await fixture();
    for (const Range of ['bytes=8-2', 'bytes=-5', 'bytes=0-0', 'not-a-range']) expect((await get('/assets/kart.glb', 'GET', { Range })).status).toBe(200);
    expect((await get('/assets/kart.glb', 'GET', { Range: 'bytes=999-' })).status).toBe(416);
    expect((await get('/healthz')).status).toBe(200);
  });
  it('pairs and relays on an explicitly trusted HTTPS origin behind a proxy', async () => {
    const { connect } = await fixture('https://race.example'), host = await connect(), phone = await connect();
    const offer = await host.timeout(1500).emitWithAck('host:create'); if (!offer.ok) throw new Error(offer.error);
    expect(offer.public).toBe(true); expect(offer.origins).toEqual(['https://race.example']);
    expect(pairingUrl(offer.origins[0], offer.token)).toMatch(/^https:\/\/race\.example\/controller#/);
    const reply = await phone.timeout(1500).emitWithAck('phone:join', { token: offer.token }); expect(reply.ok).toBe(true);
    const received = new Promise<ControlPacket>(resolve => host.once('host:input', resolve));
    phone.emit('phone:input', { version: 1, seq: 0, sentAt: 0, active: true, input: { ...NEUTRAL_INPUT, throttle: 1, useItem: true } });
    expect((await received).input).toEqual({ ...NEUTRAL_INPUT, throttle: 1, useItem: true });
  });
  it('rejects other origins even when a forwarded-host header tries to select them', async () => {
    const { connect } = await fixture('https://race.example');
    await expect(connect('https://untrusted.example')).rejects.toThrow();
    await expect(connect('http://race.example')).rejects.toThrow();
  });
  it('retains local-only startup and closes all connections idempotently', async () => {
    const { connect, app } = await fixture(), host = await connect();
    const offer = await host.timeout(1500).emitWithAck('host:create'); if (!offer.ok) throw new Error(offer.error);
    expect(offer.lan).toBe(false); expect(offer.public).toBeUndefined(); expect(offer.origins[0]).toContain('http://localhost:');
    const disconnected = new Promise<void>(resolve => host.once('disconnect', () => resolve()));
    await app.close(); await disconnected; await app.close(); expect(app.server.listening).toBe(false);
  });
});
