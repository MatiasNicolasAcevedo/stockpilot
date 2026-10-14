// Real nginx/Vite, first an upstream header observer, then real Tomcat/PostgreSQL. No provider protocol claim.
// All Compose inputs are fictitious/versioned, projects unique; cleanup never targets development volumes.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = `stockpilot-t002-b2-${process.pid}`;
const base = ['compose', '--env-file', 'scripts/fixtures/auth-test.env.example', '-p', project,
  '-f', 'docker-compose.yml', '-f', 'compose.auth-test.yml'];
const echoFile = ['-f', 'scripts/fixtures/compose.proxy-test.yml'];
const spoofing = {
  Forwarded: 'for=192.0.2.99;host=attacker.example;proto=http',
  'X-Forwarded-For': '192.0.2.99,198.51.100.99',
  'X-Forwarded-Host': 'attacker.example',
  'X-Forwarded-Proto': 'http',
  'X-Forwarded-Port': '80',
  'X-Forwarded-Prefix': '/evil',
  'X-Forwarded-Ssl': 'off',
  'X-Forwarded-Server': 'attacker.example',
  'X-Forwarded-Unknown-Extension': 'attacker.example',
};
const origins = ['http://127.0.0.1:5175', 'https://demo.example:8443', 'https://demo.example:443'];
const headersOnly = process.argv.includes('--headers-only');
let activeFiles = [];
let origin = origins[0];

function compose(args, capture = false) {
  return execFileSync('docker', [...base, ...activeFiles, '--profile', 'dev', ...args], {
    cwd: root, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit',
    env: { ...process.env, APP_PUBLIC_URL: origin },
  });
}

function request(port, path, headers = {}, method = 'GET', body = '') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method,
      headers: { Host: new URL(origin).host, ...headers }, timeout: 5000 }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: text }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Proxy request timeout')));
    req.on('error', reject);
    req.end(body);
  });
}

async function rejectHosts(port) {
  for (const Host of ['attacker.example', '127.0.0.1:9999', 'demo.example', `${new URL(origin).host},attacker.example`]) {
    if (Host === new URL(origin).host) continue;
    const result = await request(port, '/oauth2/authorization/google', { ...spoofing, Host });
    assert.equal(result.status, 400, `Host ${Host} on ${port}`);
    assert.equal(result.headers.location, undefined);
    assert.equal(result.headers['set-cookie'], undefined);
  }
}

async function headerContract(port) {
  const payload = '{"fictitious":true}';
  const result = await request(port, '/api/v1/proxy-fixture', {
    ...spoofing, Cookie: 'XSRF-TOKEN=fictitious', 'X-XSRF-TOKEN': 'fictitious',
    'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload),
  }, 'POST', payload);
  assert.equal(result.status, 200);
  const observed = JSON.parse(result.body);
  const url = new URL(origin);
  assert.equal(observed.headers.host, url.host);
  assert.equal(observed.headers['x-forwarded-host'], url.host);
  assert.equal(observed.headers['x-forwarded-proto'], url.protocol.slice(0, -1));
  assert.equal(observed.headers['x-forwarded-port'], url.port || (url.protocol === 'https:' ? '443' : '80'));
  assert.ok(observed.headers['x-forwarded-for']);
  assert.ok(!observed.headers['x-forwarded-for'].includes('192.0.2.99'));
  assert.ok(!observed.headers['x-forwarded-for'].includes('198.51.100.99'));
  assert.equal(observed.headers.forwarded, undefined);
  assert.deepEqual(Object.keys(observed.headers).filter((key) => key.startsWith('x-forwarded-')).sort(),
    ['x-forwarded-for', 'x-forwarded-host', 'x-forwarded-port', 'x-forwarded-proto']);
  assert.equal(observed.headers.cookie, 'XSRF-TOKEN=fictitious');
  assert.equal(observed.headers['x-xsrf-token'], 'fictitious');
  assert.equal(observed.headers['content-type'], 'application/json');
  assert.equal(observed.method, 'POST');
  assert.equal(observed.path, '/api/v1/proxy-fixture');
  assert.equal(observed.body, payload);
  await rejectHosts(port);
  console.log(`${port}: entire forwarding namespace sanitized, peer reconstructed, body/cookie/header preserved, Host rejected (${origin})`);
}

async function authBoundary(port) {
  const login = await request(port, '/oauth2/authorization/google', spoofing);
  assert.equal(login.status, 302);
  const location = new URL(login.headers.location);
  assert.equal(location.origin, 'http://host.docker.internal:8090');
  assert.equal(location.searchParams.get('redirect_uri'), `${origin}/login/oauth2/code/google`);
  const session = login.headers['set-cookie'].find((cookie) => cookie.startsWith('JSESSIONID='));
  assert.ok(session.includes('HttpOnly') && session.includes('SameSite=Lax'));
  assert.equal(session.includes('Secure'), origin.startsWith('https:'));
  const csrf = await request(port, '/api/v1/auth/csrf', spoofing);
  assert.equal(csrf.status, 204);
  const cookie = csrf.headers['set-cookie'].find((value) => value.startsWith('XSRF-TOKEN='));
  assert.equal(cookie.includes('Secure'), origin.startsWith('https:'));
  const pair = cookie.split(';')[0];
  const logout = await request(port, '/logout', {
    ...spoofing, Cookie: pair, 'X-XSRF-TOKEN': pair.slice('XSRF-TOKEN='.length),
  }, 'POST');
  assert.equal(logout.status, 204);
  for (const deleted of logout.headers['set-cookie']) assert.equal(deleted.includes('Secure'), origin.startsWith('https:'));
  assert.equal((await request(port, '/api/v1/auth/me', spoofing)).status, 401);
  await rejectHosts(port);
  console.log(`${port}: real backend first-hop callback/cookies/anonymous CSRF/logout resist spoofing (${origin}); no token exchange`);
}

function invalidOrigins() {
  for (const value of ['', 'http://attacker.example', 'https://demo.example/path',
    'https://user@demo.example', 'https://demo.example:0', 'https://demo.example?query=hidden']) {
    for (const service of ['client', 'client-dev']) {
      let failure;
      try {
        execFileSync('docker', [...base, '--profile', 'dev', 'run', '--rm', '--no-deps',
          '-e', `APP_PUBLIC_URL=${value}`, service], {
          cwd: root, encoding: 'utf8', timeout: 10000,
          env: { ...process.env, APP_PUBLIC_URL: origin }, stdio: 'pipe',
        });
      } catch (error) { failure = error; }
      assert.ok(failure, `${service} must reject invalid configuration`);
      assert.equal(failure.status, 1, 'Startup must fail explicitly, without waiting for a timeout');
      assert.match(`${failure.stdout}${failure.stderr}`, /APP_PUBLIC_URL must be an HTTPS origin/);
      assert.ok(!`${failure.stdout}${failure.stderr}`.includes(value || 'never-match-empty'));
    }
  }
  console.log('Both proxy runtimes reject invalid origin configuration without printing supplied values.');
}

// Refuse a reused project BEFORE entering the cleanup scope.
assert.match(project, /^stockpilot-t002-b2-\d+$/);
assert.equal(JSON.parse(compose(['ps', '--all', '--format', 'json'], true) || '[]').length, 0);
try {
  // Observe both real proxies directly upstream. Unknown forwarding extensions cannot be inferred from callback alone.
  activeFiles = echoFile;
  for (origin of origins) {
    compose(['up', '-d', '--build', '--wait', 'server', 'client', 'client-dev']);
    for (const port of [5175, 5176]) await headerContract(port);
  }
  compose(['down', '-v', '--remove-orphans']);
  activeFiles = [];
  // Same boundary, now the real application and a new fictitious PostgreSQL volume, still no mock fallback.
  for (origin of headersOnly ? [] : origins) {
    compose(['up', '-d', '--build', '--wait', 'db', 'server', 'client', 'client-dev']);
    const model = JSON.parse(compose(['config', '--format', 'json'], true));
    assert.ok(!model.services.server.ports?.length, 'Ordinary server must remain internal');
    assert.equal(model.services.server.environment.SERVER_FORWARD_HEADERS_STRATEGY, 'framework');
    for (const port of [5175, 5176]) await authBoundary(port);
  }
  if (!headersOnly) invalidOrigins();
  console.log(`${headersOnly ? 'Header' : 'Proxy'} contract passed; HTTPS simulated over local HTTP. `
    + 'OIDC protocol is out of scope here (OidcLoginIT/OidcFailureIT, test-auth-ui-smoke.mjs).');
} finally {
  try {
    compose(['logs', '--no-color', '--tail', '30', 'server', 'client', 'client-dev']);
  } finally {
    compose(['down', '-v', '--remove-orphans']);
  }
}
