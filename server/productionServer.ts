import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sirv from 'sirv';
import { attachPhoneRelay } from './phoneRelay.ts';
import { publicOrigin } from './productionConfig.ts';

/** Serve only the built public directory; this process never owns racing simulation. */
export function createProductionServer({ root, origin }: { root: string; origin?: string }) {
  const approvedOrigin = origin ? publicOrigin(origin) : undefined;
  const html = readFileSync(join(root, 'index.html')); // Fail at startup if the build is absent.
  const assets = sirv(root, { etag: true, maxAge: 0, extensions: [], dotfiles: false, single: false,
    setHeaders(response, path) {
      const hashed = /^\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(path);
      response.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
    },
  });
  const server = createServer((request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'accelerometer=(self), gyroscope=(self), magnetometer=()');
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD'); response.writeHead(405).end(); return;
    }
    const raw = (request.url ?? '/').split('?')[0];
    let path: string;
    try { path = decodeURIComponent(raw); } catch { response.writeHead(400).end(); return; }
    if (path.includes('\\') || path.includes('\0') || path.split('/').some(part => part.startsWith('.'))) {
      response.writeHead(404).end(); return;
    }
    if (path === '/healthz') {
      response.setHeader('Content-Type', 'application/json');
      response.writeHead(200).end(request.method === 'HEAD' ? undefined : '{"status":"ok"}'); return;
    }
    if (path === '/controller/') { response.writeHead(308, { Location: '/controller' }).end(); return; }
    if (path === '/' || path === '/index.html' || path === '/controller') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.setHeader('Content-Length', html.length);
      response.writeHead(200).end(request.method === 'HEAD' ? undefined : html); return;
    }
    // Ignore unsupported/malformed ranges instead of passing unsafe bounds to a file stream.
    const range = request.headers.range, match = range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range && (!match || match[2] && Number(match[2]) < Number(match[1]) || match[2] === '0')) delete request.headers.range;
    assets(request, response, () => { response.writeHead(404).end(); });
  });
  const relay = attachPhoneRelay(server, { publicOrigin: approvedOrigin, lan: !!approvedOrigin, origins: () => {
    if (approvedOrigin) return [approvedOrigin];
    const address = server.address();
    if (!address || typeof address === 'string') return [];
    return [`http://localhost:${address.port}`, `http://127.0.0.1:${address.port}`];
  } });
  let closing: Promise<void> | null = null;
  return { server, relay, close: () => closing ??= relay.close() };
}
