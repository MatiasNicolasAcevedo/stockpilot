// Regresión R1 sobre el stack local healthy. Ejecutar desde la raíz: node scripts/test-proxy-outage.mjs
// Detiene/restaura solo server y reinicia client para vaciar DNS; nunca borra contenedores ni volúmenes.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

function compose(...args) {
  return execFileSync('docker', ['compose', ...args], { cwd: ROOT, encoding: 'utf8' }).trim();
}

const origin = `http://${compose('port', 'client', '80')}`;
const endpoint = `${origin}/api/v1/system/info`;
// Misma conexión downstream = mismo worker/cache DNS entre el GET exitoso y la caída.
const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
const limitMs = 3000; // DNS 1 s + conexión 1 s + margen local; no esperar el timeout del SO.

function request() {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.get(endpoint, { agent }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        clearTimeout(deadline);
        resolve({ status: res.statusCode, body, ms: performance.now() - start });
      });
      res.on('error', reject);
    });
    const deadline = setTimeout(() => req.destroy(new Error(`Sin respuesta dentro de ${limitMs} ms`)), limitMs);
    req.on('error', (error) => { clearTimeout(deadline); reject(error); });
  });
}

async function success() {
  const result = await request();
  assert.equal(result.status, 200);
  assert.equal(JSON.parse(result.body).name, 'StockPilot');
}

async function recovery() {
  // La caché DNS negativa también expira: sondear disponibilidad, sin una espera fija que oculte el fallo.
  const deadline = performance.now() + 15000;
  while (true) {
    try { await success(); return; } catch (error) {
      if (performance.now() >= deadline) throw error;
      await delay(250);
    }
  }
}

async function outage(label, logPattern, allowedStatuses) {
  const since = new Date().toISOString();
  const result = await request();
  console.log(`${label}: HTTP ${result.status}, ${result.ms.toFixed(3)} ms`);
  assert.ok(allowedStatuses.includes(result.status), `HTTP inesperado: ${result.status}`);
  assert.ok(result.ms < limitMs, `${label} excedió ${limitMs} ms`);
  const logs = compose('logs', '--since', since, 'client');
  console.log(logs);
  assert.match(logs, logPattern, `No se ejercitó el camino ${label}`);
}

await success(); // Precondición: stack healthy existente; no levantarlo si falta al iniciar.
try {
  compose('stop', '-t', '1', 'server');
  await outage('IP resuelta tras GET exitoso', /while connecting to upstream/, [502, 504]);
  compose('up', '-d', '--wait', 'server');
  await recovery();
  console.log('Recuperación sin reiniciar client: OK');

  compose('stop', '-t', '1', 'server');
  agent.destroy();
  compose('restart', 'client'); // Nuevo proceso nginx: DNS frío, no solo expiración supuesta.
  compose('up', '-d', '--wait', '--no-deps', 'client'); // Readiness del origen antes de medir el proxy.
  await outage('DNS frío', /could not be resolved/, [502]);
  compose('up', '-d', '--wait', 'server');
  await recovery();
  console.log('Recuperación después de DNS frío: OK');
} finally {
  agent.destroy();
  compose('up', '-d', '--wait', 'server', 'client');
}
