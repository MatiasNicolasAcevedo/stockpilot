// Windows process-local resolution keeps URL/Host/issuer identical; no global hosts changes.
import assert from 'node:assert/strict';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

const mode = process.argv[2];
assert.ok(['nginx', 'vite'].includes(mode));
const origin = `http://127.0.0.1:${mode === 'vite' ? 5176 : 5175}`;
const issuer = 'http://host.docker.internal:8090/default';
const get = (url) => new Promise((resolve, reject) => {
  const request = http.get(url, {
    lookup(hostname, options, callback) {
      assert.equal(hostname, 'host.docker.internal');
      callback(null, options.all ? [{ address: '127.0.0.1', family: 4 }] : '127.0.0.1', 4);
    },
  }, (response) => {
    let body = '';
    response.on('data', (part) => { body += part; });
    response.on('end', () => resolve({ status: response.statusCode, body }));
  });
  request.on('error', reject);
  request.setTimeout(3000, () => request.destroy(new Error('deadline')));
});
const deadline = Date.now() + 60_000;
let ready = false;
while (Date.now() < deadline) {
  try {
    const discovery = await get(`${issuer}/.well-known/openid-configuration`);
    assert.equal(discovery.status, 200);
    const metadata = JSON.parse(discovery.body);
    assert.equal(metadata.issuer, issuer);
    assert.equal((await get(metadata.jwks_uri)).status, 200);
    for (const path of ['/', '/api/v1/system/info']) {
      assert.equal((await fetch(origin + path, { signal: AbortSignal.timeout(3000) })).status, 200);
    }
    ready = true;
    break;
  } catch { await delay(250); }
}
assert.ok(ready, 'Dev proxy/API/OIDC readiness exceeded deadline (details withheld)');
console.log(`A: ${mode} dev readiness/issuer/JWKS on Windows OK`);
