import fs from 'node:fs';
import crypto from 'node:crypto';

// Run from repository root. Never print secret values. Existing values are preserved
// in ignored local files so removing tracked literals does not discard credentials.
const read = path => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const parse = text => new Map(text.split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => {
  const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
}));
let local = read('.env');
const values = parse(local);
function ensure(key, value) {
  if (!values.has(key)) { local += `\n${key}=${value}\n`; values.set(key, value); }
}
ensure('SESSION_SECRET', crypto.randomBytes(48).toString('hex'));
for (const key of ['MYSQL_ROOT_PASSWORD', 'MYSQL_PASSWORD', 'JWT_SECRET', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']) {
  if (values.has(key)) ensure(`${key}_ENV`, values.get(key));
}
let compose = read('docker-compose.yml');
compose = compose.replace(/(\s+- DATABASE_PASSWORD=)([^\r\n]+)/, (full, prefix, value) => {
  if (!value.startsWith('${')) { ensure('LOCAL_DATABASE_PASSWORD', value); return prefix + '${LOCAL_DATABASE_PASSWORD:?Set LOCAL_DATABASE_PASSWORD}'; }
  return full;
});
if (!compose.includes('SESSION_SECRET=')) compose = compose.replace('      - COOKIE_SECURE=false', '      - COOKIE_SECURE=false\n      - SESSION_SECRET=${SESSION_SECRET:?Set SESSION_SECRET}');
compose = compose.replace('"3306:3306"', '"127.0.0.1:3306:3306"').replace('"8081:80"', '"127.0.0.1:8081:80"');
if (!compose.includes('./storage/uploads:/app/uploads')) compose = compose.replace('    container_name: helpdesk-backend', '    volumes:\n      - ./storage/uploads:/app/uploads\n    container_name: helpdesk-backend');
fs.writeFileSync('docker-compose.yml', compose);
fs.writeFileSync('.env', local);

let production = read('.env.production.local');
const prodValues = parse(production);
let server = read('docker-compose.server.yml');
server = server.replace(/^(\s+- )([A-Z_]*(?:SECRET|PASSWORD|TOKEN|CLIENT_ID|SMTP_PASS)[A-Z_]*)=([^\r\n]+)$/gm, (full, prefix, key, value) => {
  if (value.startsWith('${')) return full;
  const variable = `PROD_${key}`;
  if (!prodValues.has(variable)) { production += `\n${variable}='${value.replace(/'/g, "\\'")}'\n`; prodValues.set(variable, value); }
  return `${prefix}${key}=\${${variable}:?Set ${variable}}`;
});
if (!prodValues.has('PROD_SESSION_SECRET')) production += `\nPROD_SESSION_SECRET=${crypto.randomBytes(48).toString('hex')}\n`;
server = server.replace('COOKIE_SECURE=false', 'COOKIE_SECURE=true');
if (!server.includes('SESSION_SECRET=')) server = server.replace('      - COOKIE_SECURE=true', '      - COOKIE_SECURE=true\n      - SESSION_SECRET=${PROD_SESSION_SECRET:?Set PROD_SESSION_SECRET}\n      - TRUST_PROXY=loopback\n      - HOST=127.0.0.1');
// host networking cannot be combined with a networks declaration.
server = server.replace(/^    networks:[^\r\n]*\r?\n      - helpdesk-net[^\r\n]*\r?\n/gm, '');
if (!server.includes('./storage/uploads:/app/uploads')) server = server.replace('    container_name: helpdesk-backend', '    volumes:\n      - ./storage/uploads:/app/uploads\n    container_name: helpdesk-backend');
server = server.replace('"8082:80"', '"127.0.0.1:8082:80"');
fs.writeFileSync('.env.production.local', production);
fs.writeFileSync('docker-compose.server.yml', server);
console.log('Configuration secured; secret values preserved only in ignored environment files.');
