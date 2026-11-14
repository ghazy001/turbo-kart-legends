import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2), preview = args[0] === 'preview';
if (preview) args.shift();
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), ...(preview ? ['preview'] : []), '--host', '0.0.0.0', '--strictPort', ...args], {
  stdio: 'inherit', env: { ...process.env, TKL_PHONE_LAN: '1', TKL_PHONE_TLS: '1' },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
