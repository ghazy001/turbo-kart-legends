import { resolve } from 'node:path';
import { productionConfig } from './productionConfig.ts';
import { createProductionServer } from './productionServer.ts';

const config = productionConfig();
const app = createProductionServer({ root: resolve('dist'), origin: config.origin });
app.server.on('error', error => { console.error('Production server failed:', error); process.exitCode = 1; void app.close(); });
app.server.listen(config.port, '0.0.0.0', () => {
  console.log(`Turbo Kart Legends is listening on port ${config.port}.`);
  console.log(config.origin ? `Game and phone controller: ${config.origin}` : 'Local test mode. Public pairing activates after Railway generates a domain or TKL_PUBLIC_ORIGIN is set.');
});
let stopping = false;
const stop = () => {
  if (stopping) return; stopping = true;
  const deadline = setTimeout(() => { app.server.closeAllConnections(); process.exit(1); }, 5000); deadline.unref();
  void app.close().catch(error => { console.error('Server shutdown failed:', error); process.exitCode = 1; }).finally(() => clearTimeout(deadline));
};
process.once('SIGTERM', stop); process.once('SIGINT', stop);
