// Reproducible B2 provider/topology check. Fictitious inputs, unique Compose ownership, bounded readiness,
// and cleanup in finally. No application callback/login/session or negative-token claims (B3).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = `stockpilot-t002-b2-provider-${process.pid}`;
const issuer = 'http://host.docker.internal:8090/default';
const base = ['compose', '--env-file', 'scripts/fixtures/auth-test.env.example', '-p', project,
  '-f', 'docker-compose.yml', '-f', 'compose.auth-test.yml', '--profile', 'oidc'];
let stage = 'provider startup';
let owned = false;
let browserProfile;

function run(command, args, timeout = 120_000) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'pipe', timeout, windowsHide: true,
    env: { ...process.env, APP_PUBLIC_URL: 'http://127.0.0.1:5175', CLIENT_PORT: '5175', LOCAL_OIDC_PORT: '8090' } });
}
function compose(args) { return run('docker', [...base, ...args], 180_000); }
function metadata(body) {
  const discovery = JSON.parse(body);
  assert.equal(discovery.issuer, issuer);
  for (const [key, path] of Object.entries({ authorization_endpoint: 'authorize', token_endpoint: 'token',
    jwks_uri: 'jwks', userinfo_endpoint: 'userinfo' })) assert.equal(discovery[key], `${issuer}/${path}`);
}
async function ready() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:8090/isalive', { signal: AbortSignal.timeout(1000) });
      if (response.status === 200) return;
    } catch { /* Readiness only, not test retries. */ }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error('Provider readiness deadline');
}

try {
  owned = true;
  compose(['up', '-d', 'oidc']);
  await ready();
  const provider = compose(['ps', '-q', 'oidc']).trim();
  const details = JSON.parse(run('docker', ['inspect', provider]))[0];
  assert.equal(details.Config.Image, 'ghcr.io/navikt/mock-oauth2-server:3.0.3');
  assert.deepEqual(details.HostConfig.PortBindings['8090/tcp'], [{ HostIp: '127.0.0.1', HostPort: '8090' }]);
  console.log('Provider 3.0.3 ready; only loopback 8090 published in a unique project.');
  stage = 'container protocol probe';
  const mount = `type=bind,source=${join(root, 'scripts')},target=/probe,readonly`;
  const containerOutput = run('docker', ['run', '--rm', '--network', `${project}_default`, '--mount', mount,
    'node:24.21.0-alpine', 'node', '/probe/test-oidc-provider.mjs']);
  process.stdout.write(containerOutput);
  if (process.platform === 'win32') {
    stage = 'Windows protocol probe';
    process.stdout.write(run(process.execPath, ['scripts/test-oidc-provider.mjs', '--windows-loopback']));
    stage = 'Windows browser discovery';
    const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
    assert.ok(edge, 'Pre-existing Windows Edge required');
    browserProfile = mkdtempSync(join(tmpdir(), 'stockpilot-b2-browser-'));
    const dom = run(edge, ['--headless', '--disable-gpu', '--no-first-run',
      `--user-data-dir=${browserProfile}`, '--host-resolver-rules=MAP host.docker.internal 127.0.0.1',
      '--dump-dom', `${issuer}/.well-known/openid-configuration`], 30_000);
    const pre = dom.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)?.[1];
    assert.ok(pre, 'Browser rendered discovery JSON');
    metadata(pre.replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'));
    console.log('Windows Edge rendered exact discovery issuer/endpoints with process-only loopback resolution; no global hosts change.');
  }
  stage = 'backend startup and discovery';
  compose(['up', '-d', '--build', '--wait', '--wait-timeout', '120', 'server']);
  metadata(compose(['exec', '-T', 'server', 'curl', '-fsS', '--max-time', '5', `${issuer}/.well-known/openid-configuration`]));
  const server = JSON.parse(run('docker', ['inspect', compose(['ps', '-q', 'server']).trim()]))[0];
  assert.equal(server.State.Health.Status, 'healthy');
  assert.ok(!server.HostConfig.PortBindings || Object.keys(server.HostConfig.PortBindings).length === 0);
  console.log('Real backend healthy with PostgreSQL 18.6; discovery reached from backend namespace, exact issuer/endpoints and no published backend port.');
  console.log('B2 provider/topology checks passed. StockPilot OIDC callback/session/negatives remain B3.');
} catch {
  console.error(`B2 provider stack failed at ${stage}; subprocess output and response bodies omitted.`);
  process.exitCode = 1;
} finally {
  if (owned) {
    try { compose(['down', '--volumes', '--remove-orphans']); console.log(`Cleanup complete for owned fictitious project ${project}.`); }
    catch { console.error(`Cleanup failed for owned project ${project}; inspect before retrying.`); process.exitCode = 1; }
  }
  if (browserProfile) {
    const target = resolve(browserProfile);
    const temporaryRoot = resolve(tmpdir()) + sep;
    assert.ok(target.startsWith(temporaryRoot) && target.startsWith(resolve(join(tmpdir(), 'stockpilot-b2-browser-'))), 'Verified isolated browser profile path');
    rmSync(target, { recursive: true, force: true });
    console.log('Cleanup complete for the verified isolated Windows browser profile.');
  }
}
