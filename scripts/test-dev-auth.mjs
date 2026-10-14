#!/usr/bin/env node
// Directed A/AC-10 assay on Windows Edge. Not the product Playwright suite B.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '../e2e/node_modules/@playwright/test/index.mjs';

const mode = process.argv[2];
assert.ok(['nginx', 'vite'].includes(mode), 'Usage: node scripts/test-dev-auth.mjs nginx|vite');
const project = `stockpilot-dev-auth-a-${mode}-${process.pid}`;
const base = `http://127.0.0.1:${mode === 'vite' ? 5176 : 5175}`;
const bash = 'C:\\Program Files\\Git\\bin\\bash.exe';
const log = createWriteStream(join(tmpdir(), `stockpilot-T003-A-dev-${mode}.log`));
const args = ['scripts/dev-auth.sh', mode, project];
let ready = false;
let exited = false;
const session = spawn(bash, [...args, 'session'], { stdio: ['ignore', 'pipe', 'pipe'] });
session.stdout.pipe(log, { end: false });
session.stderr.pipe(log, { end: false });
session.stdout.on('data', (data) => { if (data.toString().includes('Dev auth ready:')) ready = true; });
session.on('exit', () => { exited = true; });
function run(command, commandArgs, timeout = 300_000) {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8', timeout });
  log.write(result.stdout ?? '');
  log.write(result.stderr ?? '');
  assert.equal(result.status, 0, 'Directed A command failed; inspect local build/lifecycle log');
  return result.stdout;
}
async function until(check, timeout) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(200);
  }
  throw new Error('Directed A deadline exceeded');
}
const composeArgs = ['compose', '--env-file', 'scripts/fixtures/auth-test.env.example', '-p', project,
  '-f', 'docker-compose.yml', '-f', 'compose.auth-test.yml', '-f', 'compose.dev-auth.yml', '--profile', 'oidc', '--profile', 'dev'];
const fingerprint = () => run('docker', [...composeArgs, 'exec', '-T', 'db', 'psql', '-U', 'stockpilot_auth_test',
  '-d', 'stockpilot_auth_test', '-Atc', "SELECT id::text || '|' || created_at::text FROM app_user ORDER BY id"]);
const source = 'client/src/features/system/SystemInfoPanel.tsx';
const original = readFileSync(source);
let browser;
try {
  await until(() => { assert.ok(!exited, 'Dev session exited before readiness'); return ready; }, 600_000);
  browser = await chromium.launch({ channel: 'msedge', args: ['--host-resolver-rules=MAP host.docker.internal 127.0.0.1'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  async function login() {
    await page.goto(`${base}/login`);
    await page.getByRole('link', { name: 'Continuar con Google' }).click();
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled();
    const me = await page.evaluate(async () => (await fetch('/api/v1/auth/me')).json());
    assert.equal(me.displayName, 'Persona Demo');
    assert.equal(me.email, 'persona@example.com');
    return me.id;
  }
  const first = await login();
  const row = fingerprint();
  assert.equal(row.trim().split('\n').length, 1);
  assert.ok(row.startsWith(first + '|'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled();
  assert.equal(await page.evaluate(async () => (await (await fetch('/api/v1/auth/me')).json()).id), first);
  if (mode === 'vite') {
    // Check a DOM update without a navigation/reload, using the actual Windows bind mount.
    await expect(page.getByText('Servidor conectado', { exact: true })).toBeVisible();
    const navigations = [];
    page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations.push(1); });
    writeFileSync(source, original.toString('utf8').replace('Servidor conectado', 'Servidor HMR ficticio'));
    await expect(page.getByText('Servidor HMR ficticio', { exact: true })).toBeVisible();
    writeFileSync(source, original);
    await expect(page.getByText('Servidor conectado', { exact: true })).toBeVisible();
    assert.equal(navigations.length, 0, 'HMR must update without reload');
    console.log('A: real Windows bind-mount HMR and restoration OK');
  }
  for (const action of ['restart', 'rebuild']) {
    run(bash, [...args, action], 600_000);
    assert.equal(await login(), first);
    assert.equal(fingerprint(), row, 'Own volume must preserve id/created_at on restart/rebuild');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled();
    console.log(`A: ${mode} ${action}/resume/login/reload + DB fingerprint OK`);
  }
  run(bash, [...args, 'status']);
  console.log(`A: ${mode} isolated development assay OK (not ordinary B-01/Google/B/FULL)`);
} finally {
  writeFileSync(source, original);
  await browser?.close();
  // stop uses the exact session's validated project and origin. It also verifies zero residuals.
  try {
    // A startup failure may have already removed the proxy. Still finish and inspect cleanup.
    const live = spawnSync('docker', [...composeArgs, 'ps', '-a', '-q', mode === 'vite' ? 'client-dev' : 'client'], { encoding: 'utf8' });
    assert.equal(live.status, 0);
    if (live.stdout.trim()) run(bash, [...args, 'stop']);
    else run('docker', [...composeArgs, 'down', '--volumes', '--remove-orphans']);
    for (const kind of ['container', 'network', 'volume']) {
      const flags = kind === 'container' ? '-aq' : '-q';
      assert.equal(run('docker', [kind, 'ls', flags, '--filter', `label=com.docker.compose.project=${project}`]).trim(), '');
    }
    await until(() => exited, 30_000);
  }
  finally {
    // Close pipe handles on Windows after the explicit, validated Compose cleanup.
    session.kill();
    session.stdout.destroy();
    session.stderr.destroy();
    session.unref();
    log.end();
  }
}
