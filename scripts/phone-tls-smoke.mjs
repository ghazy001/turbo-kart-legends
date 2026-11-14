import { readFileSync } from 'node:fs';
import { get } from 'node:https';
import { performance } from 'node:perf_hooks';
import { io } from 'socket.io-client';
const url = process.argv[2] ?? 'https://localhost:5175';
const ca = readFileSync('.certs/turbo-kart-ca.pem');
const page = await new Promise((resolve, reject) => { get(`${url}/controller`, { ca }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); }).on('error', reject); });
const keyStatus = await new Promise((resolve, reject) => { get(`${url}/.certs/localhost-key.pem`, { ca }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); }).on('error', reject); });
if (keyStatus !== 403) throw new Error(`Expected private certificate denial, got ${keyStatus}`);
if (page !== 200) throw new Error(`Controller page HTTP ${page}`);
const sockets = [];
async function connect() {
  const socket = io(url, { path: '/phone-socket', transports: ['websocket'], forceNew: true, reconnection: false, ca, extraHeaders: { Origin: url } }); sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); }); return socket;
}
try {
  const host = await connect(), phone = await connect(); host.on('host:ping', ack => ack());
  const offer = await host.timeout(2000).emitWithAck('host:create'); if (!offer.ok) throw new Error(offer.error);
  if (!offer.lan || !offer.origins.every(origin => origin.startsWith('https://'))) throw new Error('Expected HTTPS LAN origins');
  const paired = await phone.timeout(2000).emitWithAck('phone:join', { token: offer.token }); if (!paired.ok) throw new Error(paired.error);
  let received = 0; host.on('host:input', () => received++);
  const sender = setInterval(() => phone.volatile.emit('phone:input', { version: 1, seq: received + 1, sentAt: performance.now(), active: true, input: { throttle: 0.5, brake: 0, steer: 0.25, drift: false } }), 1000 / 30);
  const samples = [];
  try { for (let i = 0; i < 4; i++) { const start = performance.now(); await phone.timeout(1800).emitWithAck('phone:ping'); samples.push(performance.now() - start); if (i < 3) await new Promise(resolve => setTimeout(resolve, 1000)); } }
  finally { clearInterval(sender); }
  if (received < 60) throw new Error(`Too few relayed frames: ${received}`);
  samples.sort((a, b) => a - b);
  console.log(JSON.stringify({ tlsVerified: true, privateKeyDenied: keyStatus === 403, controllerHttp: page, paired: true, frames: received, roundTripMedianMs: +samples[2].toFixed(2), roundTripMaxMs: +samples[3].toFixed(2), note: 'Encrypted loopback relay measurement; not physical Wi-Fi/device latency.' }, null, 2));
  host.emit('host:revoke');
} finally { sockets.forEach(socket => socket.disconnect()); }
