#!/usr/bin/env node
// T-002 D: smoke of the session UI in a real browser (pre-existing Windows Edge, headless, driven over CDP) through
// the real proxy (nginx `client` or, with --vite, `client-dev`) against the isolated 3.0.3 provider. Only fictitious
// versioned inputs and a unique Compose project; finally removes that project and the ephemeral browser profile.
// Output never includes codes, state, tokens or cookie values. Usage: node scripts/test-auth-ui-smoke.mjs
//   [--vite] [--screenshots <dir>]
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const args = process.argv.slice(2);
const vite = args.includes('--vite');
const shotsIndex = args.indexOf('--screenshots');
const shotsDir = shotsIndex >= 0 ? resolve(args[shotsIndex + 1]) : null;
const project = `stockpilot-t002-d-smoke-${process.pid}`;
const clientPort = vite ? 5176 : 5175;
const base = `http://127.0.0.1:${clientPort}`;
const providerPort = 8090;
// Fixed fictitious values so an inherited shell environment cannot redirect the stack.
const env = {
  ...process.env,
  POSTGRES_DB: 'stockpilot_auth_test', POSTGRES_USER: 'stockpilot_auth_test',
  POSTGRES_PASSWORD: 'fictitious-auth-test-only', APP_PUBLIC_URL: base, CLIENT_PORT: '5175',
  CLIENT_DEV_PORT: '5176', LOCAL_OIDC_PORT: String(providerPort), GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '',
};
const composeArgs = ['compose', '--env-file', 'scripts/fixtures/auth-test.env.example', '-p', project,
  '-f', 'docker-compose.yml', '-f', 'compose.auth-test.yml', '--profile', 'oidc', ...(vite ? ['--profile', 'dev'] : [])];
const clientService = vite ? 'client-dev' : 'client';

function run(command, commandArgs, timeout) {
  const result = spawnSync(command, commandArgs, { env, encoding: 'utf8', timeout });
  if (result.status !== 0) {
    const tail = `${result.stdout ?? ''}${result.stderr ?? ''}`.split('\n').slice(-15).join('\n');
    throw new Error(`${command} ${commandArgs.slice(-4).join(' ')} failed (${result.status ?? result.signal})\n${tail}`);
  }
  return result.stdout;
}
const compose = (more, timeout = 180_000) => run('docker', [...composeArgs, ...more], timeout);
const step = (text) => console.log(`✓ ${text}`);

async function until(description, check, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { last = await check(); if (last) return last; } catch (error) { last = error.message; }
    await delay(200);
  }
  throw new Error(`Timeout: ${description} (last: ${String(last).slice(0, 200)})`);
}

/** Minimal CDP client over Node's built-in WebSocket. */
class Cdp {
  #id = 0; #pending = new Map(); #listeners = new Set();
  constructor(url) { this.ws = new WebSocket(url); }
  async open() {
    await new Promise((ok, fail) => { this.ws.onopen = ok; this.ws.onerror = () => fail(new Error('CDP socket error')); });
    this.ws.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const pending = this.#pending.get(message.id);
        this.#pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result);
      } else for (const listener of this.#listeners) listener(message);
    };
  }
  send(method, params = {}) {
    const id = ++this.#id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject, method }));
  }
  on(listener) { this.#listeners.add(listener); }
  close() { try { this.ws.close(); } catch { /* already closed */ } }
}

let browser;
let profile;
let page;
const diagnostics = [];
try {
  run('docker', ['version', '--format', '{{.Server.Version}}'], 30_000);
  const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
  assert.ok(edge, 'Pre-existing Windows Edge required');

  compose(['up', '-d', '--build', '--wait', '--wait-timeout', '300', 'db', 'oidc', 'server', clientService], 900_000);
  await until('provider discovery on loopback', async () =>
    (await fetch(`http://127.0.0.1:${providerPort}/default/.well-known/openid-configuration`)).ok, 60_000);
  await until(`${clientService} serving the SPA`, async () => (await fetch(`${base}/`)).ok, 120_000);
  step(`Isolated stack healthy: project ${project}, ${vite ? 'Vite' : 'nginx'} origin ${base}, provider 3.0.3 loopback`);

  profile = mkdtempSync(join(tmpdir(), 'stockpilot-d-edge-'));
  browser = spawn(edge, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--host-resolver-rules=MAP host.docker.internal 127.0.0.1', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-sync', 'about:blank'], { stdio: 'ignore' });
  const port = await until('Edge DevTools port', () => {
    const file = join(profile, 'DevToolsActivePort');
    return existsSync(file) && readFileSync(file, 'utf8').split('\n')[0].trim();
  });
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  page = new Cdp(target.webSocketDebuggerUrl);
  await page.open();

  const requests = [];
  const responses = [];
  page.on(({ method, params }) => {
    if (method === 'Network.requestWillBeSent') {
      const url = new URL(params.request.url);
      requests.push({ method: params.request.method, host: url.host, path: url.pathname });
    }
    if (method === 'Network.responseReceived') {
      const url = new URL(params.response.url);
      responses.push({ host: url.host, path: url.pathname, status: params.response.status });
      diagnostics.push(`${params.response.status} ${url.host}${url.pathname}`);
    }
    if (method === 'Network.loadingFailed') diagnostics.push(`failed ${params.errorText}`);
    if (method === 'Runtime.exceptionThrown') diagnostics.push(`exception ${params.exceptionDetails?.text}`);
  });
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Network.enable');

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await page.send('Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  const text = () => evaluate('document.body.textContent');
  const path = () => evaluate('location.pathname + location.search');
  const viewport = async (width, height, mobile) => {
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await delay(300);
  };
  const desktop = () => viewport(1280, 800, false);
  const phone = () => viewport(375, 812, true);
  const noOverflow = async (label) => {
    const widths = await evaluate(`({ doc: document.documentElement.scrollWidth, body: document.body.scrollWidth,
      view: window.innerWidth, outside: [...document.querySelectorAll('header *, main *')]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 0.5 || r.left < -0.5); })
        .length })`);
    assert.ok(widths.doc <= widths.view && widths.body <= widths.view && widths.outside === 0,
      `${label}: horizontal overflow ${JSON.stringify(widths)}`);
    return `${widths.view}px`;
  };
  const shot = async (name) => {
    if (!shotsDir) return;
    mkdirSync(shotsDir, { recursive: true });
    const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
    writeFileSync(join(shotsDir, `${name}.jpg`), Buffer.from(data, 'base64'));
  };
  const bothLayouts = async (label, name) => {
    await desktop();
    const wide = await noOverflow(`${label} 1280`);
    await shot(`${name}-1280`);
    await phone();
    const narrow = await noOverflow(`${label} 375`);
    await shot(`${name}-375`);
    await desktop();
    step(`${label}: no horizontal overflow at ${wide} and ${narrow} (device emulation)`);
  };
  const clickByText = async (label, tag = 'a, button') => {
    const box = await until(`clickable "${label}"`, () => evaluate(`(() => {
      const element = [...document.querySelectorAll(${JSON.stringify(tag)})]
        .find((e) => e.textContent.trim() === ${JSON.stringify(label)} && !e.disabled);
      if (!element) return null;
      element.scrollIntoView({ block: 'center' });
      const r = element.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`));
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
    }
  };
  const key = async (keyName, code, keyCode) => {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode: keyCode });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: keyCode });
  };
  const bannerHas = (value) => evaluate(`document.querySelector('header')?.textContent.includes(${JSON.stringify(value)})`);
  const cookieNames = () => evaluate(`document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter(Boolean)`);
  const xsrf = () => evaluate(`document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith('XSRF-TOKEN=')) ?? null`);
  const meStatus = () => evaluate(`fetch('/api/v1/auth/me').then((r) => r.status)`);
  const meCalls = () => requests.filter((r) => r.path === '/api/v1/auth/me').length;
  const loggedIn = async () => (await path()) === '/' && (await bannerHas('Persona Demo')) &&
    evaluate(`[...document.querySelectorAll('header button')].some((b) => b.textContent.trim() === 'Cerrar sesión' && !b.disabled)`);

  // 1. Visitor.
  await desktop();
  await page.send('Page.navigate', { url: `${base}/` });
  await until('visitor shell with Ingresar and server info', async () =>
    (await bannerHas('Ingresar')) && (await text()).includes('versión'));
  await until('CSRF cookie obtained on mount', async () => (await cookieNames()).includes('XSRF-TOKEN'));
  assert.equal(await meStatus(), 401);
  step('Visitor: shell offers Ingresar, real API data renders, CSRF cookie obtained on mount, me 401');
  await bothLayouts('Visitor home', '01-visitante');

  // 2. /login and keyboard entry through the real provider.
  await clickByText('Ingresar');
  await until('/login page', async () => (await path()) === '/login' && (await text()).includes('Ingresar a StockPilot'));
  await bothLayouts('Login page', '02-login');
  await evaluate('document.activeElement?.blur(); document.body.focus()');
  let focused = '';
  for (let i = 0; i < 12 && focused !== 'Continuar con Google'; i += 1) {
    await key('Tab', 'Tab', 9);
    focused = await evaluate('document.activeElement?.textContent?.trim() ?? ""');
  }
  assert.equal(focused, 'Continuar con Google', 'Google entry reachable by keyboard');
  assert.equal(await evaluate('document.activeElement.tagName + " " + document.activeElement.getAttribute("href")'),
    'A /oauth2/authorization/google');
  await key('Enter', 'Enter', 13);
  await until('authenticated shell after OIDC round trip', loggedIn, 45_000);
  const hops = requests.map((r) => `${r.host}${r.path}`);
  for (const hop of [`127.0.0.1:${clientPort}/oauth2/authorization/google`, `host.docker.internal:${providerPort}/default/authorize`,
    `127.0.0.1:${clientPort}/login/oauth2/code/google`]) assert.ok(hops.includes(hop), `navigation hop ${hop}`);
  assert.deepEqual(await cookieNames(), ['XSRF-TOKEN'], 'only the readable CSRF cookie is visible to JS');
  assert.equal(await evaluate('localStorage.length + sessionStorage.length'), 0, 'no browser storage for session');
  assert.deepEqual(await evaluate(`fetch('/api/v1/auth/me').then((r) => r.json()).then((b) => Object.keys(b).sort())`),
    ['displayName', 'email', 'emailVerified', 'id']);
  step('Login by keyboard: full navigation /oauth2/authorization/google → provider authorize → callback → / with Persona Demo');
  step('Browser holds only the XSRF-TOKEN cookie readable by JS, no local/session storage, me exposes 4 fields only');

  // 3. Reload keeps the session.
  await page.send('Page.reload');
  await until('session survives reload', loggedIn);
  step('Reload keeps the backend session');
  await bothLayouts('Authenticated shell', '03-sesion');

  // 4. Expiry: the server restarts (in-memory session lost) and focus revalidation reports it once, without a loop.
  compose(['restart', 'server']);
  compose(['up', '-d', '--wait', '--wait-timeout', '180', 'server'], 300_000);
  await until('server reachable again through the proxy', async () => (await fetch(`${base}/api/v1/system/info`)).ok, 60_000);
  const beforeExpiry = meCalls();
  await evaluate(`document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))`);
  await until('expiry message', async () => (await text()).includes('La sesión terminó. Volvé a ingresar.'));
  assert.equal(await path(), '/', 'no automatic redirect');
  assert.ok(await bannerHas('Ingresar'));
  assert.ok(!(await bannerHas('Persona Demo')));
  await delay(3_000); // bounded observation window: proves no request loop after the single 401
  assert.equal(meCalls() - beforeExpiry, 1, 'exactly one me request: no retry/loop');
  assert.equal(await path(), '/');
  step('Expiry: one me 401 after restart → fixed message, cache/user cleared, no retry, no redirect loop (3 s window)');
  await bothLayouts('Expired session', '04-expirada');

  // 5. Login again (mouse), then logout.
  await clickByText('Ingresar');
  await until('/login', async () => (await path()) === '/login');
  await clickByText('Continuar con Google');
  await until('authenticated again', loggedIn, 45_000);
  assert.ok(!(await text()).includes('La sesión terminó'), 'expiry notice gone after a new login');
  const tokenBefore = await xsrf();
  await clickByText('Cerrar sesión', 'header button');
  await until('logout lands on /login', async () => (await path()) === '/login' && (await text()).includes('Ingresar a StockPilot'));
  assert.ok(responses.some((r) => r.path === '/logout' && r.status === 204), 'POST /logout 204');
  assert.ok(!(await bannerHas('Persona Demo')));
  const tokenAfter = await until('anonymous CSRF cookie after logout', xsrf);
  assert.notEqual(tokenAfter, tokenBefore, 'CSRF token renewed after logout');
  assert.equal(await meStatus(), 401, 'old session no longer valid');
  step('Logout: POST /logout 204 → /login, user gone, new anonymous CSRF cookie, me 401');

  // 6. Cancellation at the provider: the authorize response is replaced by an error redirect with the real state.
  await page.send('Fetch.enable', { patterns: [{ urlPattern: `*host.docker.internal:${providerPort}/default/authorize*` }] });
  const cancelled = new Promise((resolveCancel) => page.on(async ({ method, params }) => {
    if (method !== 'Fetch.requestPaused') return;
    const authorize = new URL(params.request.url);
    const callback = new URL(authorize.searchParams.get('redirect_uri'));
    callback.searchParams.set('error', 'access_denied');
    callback.searchParams.set('error_description', 'Detalle-del-proveedor-ficticio');
    callback.searchParams.set('state', authorize.searchParams.get('state'));
    await page.send('Fetch.fulfillRequest', { requestId: params.requestId, responseCode: 302,
      responseHeaders: [{ name: 'Location', value: callback.toString() }] });
    resolveCancel();
  }));
  await clickByText('Continuar con Google');
  await cancelled;
  await page.send('Fetch.disable');
  await until('fixed failure message', async () => (await path()) === '/login?error=authentication' &&
    (await text()).includes('No se pudo iniciar sesión'));
  assert.ok(!(await text()).includes('Detalle-del-proveedor-ficticio'), 'provider description never shown');
  assert.ok(!(await evaluate('location.href')).includes('Detalle'), 'provider description not forwarded');
  assert.equal(await meStatus(), 401, 'cancelled login authenticates nobody');
  assert.equal(await evaluate(`[...document.querySelectorAll('[role=alert] a')].map((a) => a.textContent.trim() + ' ' + a.getAttribute('href')).join()`),
    'Reintentar /oauth2/authorization/google');
  step('Cancellation with valid state → /login?error=authentication, fixed message + Reintentar, no description, me 401');
  await bothLayouts('Login failure', '05-fallo');

  // 7. Orphan callback (no authorization request in the session) also fails safely.
  await page.send('Page.navigate', { url: `${base}/login/oauth2/code/google?code=codigo-ficticio&state=estado-ficticio` });
  await until('orphan callback rejected', async () => (await path()) === '/login?error=authentication');
  assert.equal(await meStatus(), 401);
  step('Orphan callback → /login?error=authentication, no session');

  console.log(`Smoke OK (${vite ? 'Vite' : 'nginx'}). Screenshots: ${shotsDir ?? 'not requested'}`);
} catch (error) {
  // Sanitized diagnostics: path without query, visible text and request paths/statuses only.
  if (page) {
    try {
      const { result } = await page.send('Runtime.evaluate', { returnByValue: true,
        expression: `({ path: location.pathname, text: document.body?.textContent.slice(0, 400) })` });
      console.error('Page at failure:', JSON.stringify(result.value));
    } catch { /* page unavailable */ }
  }
  console.error('Recent responses:', JSON.stringify(diagnostics.slice(-15)));
  throw error;
} finally {
  page?.close();
  if (browser && browser.exitCode === null) browser.kill();
  await delay(500);
  if (profile) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try { rmSync(profile, { recursive: true, force: true }); break; } catch { await delay(500); }
    }
    console.log(`Ephemeral browser profile ${existsSync(profile) ? 'NOT removed' : 'removed'}.`);
  }
  try {
    compose(['down', '--volumes', '--remove-orphans'], 300_000);
    console.log(`Cleanup complete for owned fictitious project ${project}.`);
  } catch (error) {
    console.error(`Cleanup FAILED for ${project}: ${error.message}`);
    process.exitCode = 1;
  }
}
