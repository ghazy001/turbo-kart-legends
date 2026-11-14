import { io } from 'socket.io-client';
const [token, origin = 'http://127.0.0.1:5173'] = process.argv.slice(2);
if (!/^[\w-]{32}$/.test(token ?? '')) throw new Error('Supply the temporary test QR token.');
const socket = io(origin, { path: '/phone-socket', transports: ['websocket'], reconnection: false, extraHeaders: { Origin: origin } });
await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
const reply = await socket.timeout(2000).emitWithAck('phone:join', { token });
if (!reply.ok) { socket.disconnect(); throw new Error(reply.error); }
console.log('Computer control state:', reply.game);
socket.on('phone:state', state => console.log('Computer control state:', state));
console.log('Test controller paired: neutral 1 s, throttle 10 s, coast 2 s, then disconnect.');
const start = performance.now(); let seq = 0;
const timer = setInterval(() => {
  const elapsed = performance.now() - start;
  socket.volatile.emit('phone:input', { version: 1, seq: seq++, sentAt: performance.now(), active: true,
    input: { throttle: Number(elapsed >= 1000 && elapsed < 11000), brake: 0, steer: 0, drift: false } });
  if (elapsed >= 13000) { clearInterval(timer); socket.disconnect(); console.log('Disconnected test controller; active game should pause.'); }
}, 1000 / 30);
socket.on('phone:ended', reason => { clearInterval(timer); socket.disconnect(); console.log(reason); });
