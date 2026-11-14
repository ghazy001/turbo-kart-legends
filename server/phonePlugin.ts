import { networkInterfaces, hostname } from 'node:os';
import { existsSync, readFileSync } from 'node:fs';
import type { Plugin, ViteDevServer, PreviewServer } from 'vite';
import { attachPhoneRelay } from './phoneRelay.ts';

export function phonePlugin(): Plugin {
  const disposers: (() => void)[] = [];
  const attach = (server: ViteDevServer | PreviewServer) => {
    if (!server.httpServer) return;
    const lan = Boolean(process.env.TKL_PHONE_LAN);
    const relay = attachPhoneRelay(server.httpServer, { lan, origins: () => {
      const address = server.httpServer?.address(); const port = address && typeof address !== 'string' ? address.port : 5173;
      const protocol = server.config.server.https || ('https' in server.config.preview && server.config.preview.https) ? 'https' : 'http';
      const ips = lan ? Object.values(networkInterfaces()).flatMap(entries => (entries ?? []).filter(entry => entry.family === 'IPv4' && !entry.internal).map(entry => entry.address)) : [];
      return [...ips.map(ip => `${protocol}://${ip}:${port}`), `${protocol}://localhost:${port}`, `${protocol}://127.0.0.1:${port}`, `${protocol}://${hostname()}:${port}`].map(origin => new URL(origin).origin);
    } });
    disposers.push(relay.dispose);
    server.middlewares.use('/controller', (_request, response, next) => {
      response.setHeader('Referrer-Policy', 'no-referrer'); response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Permissions-Policy', 'accelerometer=(self), gyroscope=(self), magnetometer=()'); next();
    });
  };
  return { name: 'turbo-kart-phone-relay', configureServer: attach, configurePreviewServer: attach, closeBundle: () => { disposers.splice(0).forEach(dispose => dispose()); } };
}
export function phoneHttps() {
  if (!process.env.TKL_PHONE_TLS) return undefined;
  const cert = process.env.TKL_TLS_CERT ?? '.certs/localhost.pem', key = process.env.TKL_TLS_KEY ?? '.certs/localhost-key.pem';
  if (!existsSync(cert) || !existsSync(key)) throw new Error('Phone HTTPS certificates missing. Run npm run phone:cert, trust the local CA on your devices, then retry. See docs/PHONE_CONTROLLER.md.');
  return { cert: readFileSync(cert), key: readFileSync(key) };
}
