// Probe from the browser namespace; no assumed tools inside the provider image.
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const issuer = 'http://host.docker.internal:8090/default';
const deadline = Date.now() + 60_000;
let ready = false;
while (Date.now() < deadline) {
  try {
    const discovery = await fetch(`${issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(3000) });
    const metadata = await discovery.json();
    assert.equal(metadata.issuer, issuer);
    for (const key of ['authorization_endpoint', 'token_endpoint', 'jwks_uri', 'userinfo_endpoint']) {
      assert.ok(metadata[key].startsWith(`${issuer}/`));
    }
    assert.equal((await fetch(metadata.jwks_uri, { signal: AbortSignal.timeout(3000) })).status, 200);
    for (const url of ['http://server:8080/actuator/health/readiness', 'http://localhost/healthz', 'http://localhost/api/v1/system/info']) {
      assert.equal((await fetch(url, { signal: AbortSignal.timeout(3000) })).status, 200);
    }
    ready = true;
    break;
  } catch {
    await delay(250);
  }
}
assert.ok(ready, 'DB/API/proxy/provider readiness deadline exceeded (details withheld)');
console.log('A: readiness HTTP/issuer/JWKS through private network OK');
