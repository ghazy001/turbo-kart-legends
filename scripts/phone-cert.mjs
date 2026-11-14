import { networkInterfaces, hostname } from 'node:os';
import { mkdirSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Generates local files only. Never installs a CA or changes OS/browser trust.
mkdirSync('.certs', { recursive: true, mode: 0o700 });
const supplied = process.argv.slice(2);
if (supplied.some(value => !/^[a-zA-Z0-9.:-]+$/.test(value))) throw new Error('Certificate names must be hostnames or IP addresses.');
const ips = [...new Set(['127.0.0.1', ...Object.values(networkInterfaces()).flatMap(entries => (entries ?? []).filter(entry => entry.family === 'IPv4' && !entry.internal).map(entry => entry.address)), ...supplied.filter(value => /^\d+\.\d+\.\d+\.\d+$/.test(value))])];
const names = [...new Set(['localhost', hostname(), ...supplied.filter(value => !/^\d+\.\d+\.\d+\.\d+$/.test(value))])];
const run = args => execFileSync('openssl', args, { stdio: ['ignore', 'ignore', 'pipe'] });
if (!existsSync('.certs/turbo-kart-ca.pem') || !existsSync('.certs/turbo-kart-ca-key.pem')) {
  writeFileSync('.certs/ca.cnf', '[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ca\n[dn]\nCN=Turbo Kart Local Development CA\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash\n');
  run(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '365', '-config', '.certs/ca.cnf', '-keyout', '.certs/turbo-kart-ca-key.pem', '-out', '.certs/turbo-kart-ca.pem']);
}
writeFileSync('.certs/server.cnf', `[req]\nprompt=no\ndistinguished_name=dn\nreq_extensions=server\n[dn]\nCN=localhost\n[server]\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=@names\n[names]\n${names.map((name, i) => `DNS.${i + 1}=${name}`).join('\n')}\n${ips.map((ip, i) => `IP.${i + 1}=${ip}`).join('\n')}\n`);
run(['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-config', '.certs/server.cnf', '-keyout', '.certs/localhost-key.pem', '-out', '.certs/localhost.csr']);
run(['x509', '-req', '-in', '.certs/localhost.csr', '-CA', '.certs/turbo-kart-ca.pem', '-CAkey', '.certs/turbo-kart-ca-key.pem', '-CAcreateserial', '-days', '30', '-extfile', '.certs/server.cnf', '-extensions', 'server', '-out', '.certs/localhost.pem']);
chmodSync('.certs/turbo-kart-ca-key.pem', 0o600); chmodSync('.certs/localhost-key.pem', 0o600);
console.log('Generated .certs/localhost.pem and private key (30 days). No device trust settings were changed.');
console.log('Public CA certificate: .certs/turbo-kart-ca.pem — trust this certificate manually on your test devices. Never share either private key.');
console.log('LAN certificate addresses:', ips.join(', '));
