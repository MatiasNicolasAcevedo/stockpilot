// Real capability probe for the owner-authorized isolated provider, on Windows and the backend network.
// It does not authenticate StockPilot or replace application protocol/session/negative tests in B3.
import assert from 'node:assert/strict';
import { createPublicKey, verify } from 'node:crypto';
import http from 'node:http';

const issuer = 'http://host.docker.internal:8090/default';
const clientId = 'stockpilot-test';
const redirect = 'http://127.0.0.1:5175/login/oauth2/code/google';
const windowsLoopback = process.argv.includes('--windows-loopback');
if (windowsLoopback) assert.equal(process.platform, 'win32', 'Windows-only scoped resolution');
let stage = 'discovery';

// Preserve the canonical URL and HTTP Host. Only the Windows test process maps this exact hostname.
function request(url, init = {}) {
  const target = new URL(url);
  assert.equal(target.origin, new URL(issuer).origin, 'Provider requests stay on the fixed origin');
  return new Promise((resolve, reject) => {
    const options = { method: init.method ?? 'GET', headers: init.headers ?? {} };
    if (windowsLoopback) options.lookup = (_hostname, lookupOptions, callback) => {
      if (lookupOptions.all) callback(null, [{ address: '127.0.0.1', family: 4 }]);
      else callback(null, '127.0.0.1', 4);
    };
    const req = http.request(target, options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1_000_000) res.destroy(new Error('Provider response too large'));
      });
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, json: () => JSON.parse(body) }));
    });
    req.setTimeout(5000, () => req.destroy(new Error('Provider request timeout')));
    req.on('error', reject);
    req.end(init.body?.toString());
  });
}

async function checked(url, init = {}) {
  const response = await request(url, init);
  assert.equal(response.status, 200, 'Provider HTTP status');
  return response.json();
}

async function probe() {
  const discovery = await checked(`${issuer}/.well-known/openid-configuration`);
  assert.equal(discovery.issuer, issuer);
  for (const [key, path] of Object.entries({ authorization_endpoint: 'authorize', token_endpoint: 'token',
    jwks_uri: 'jwks', userinfo_endpoint: 'userinfo' })) assert.equal(discovery[key], `${issuer}/${path}`);
  stage = 'JWKS';
  const jwks = await checked(discovery.jwks_uri);
  assert.ok(jwks.keys.length > 0);
  stage = 'authorize';
  const authorize = new URL(discovery.authorization_endpoint);
  for (const [key, value] of Object.entries({ response_type: 'code', client_id: clientId, redirect_uri: redirect,
    scope: 'openid profile email', state: 'fictitious-probe-state', nonce: 'fictitious-probe-nonce' })) {
    authorize.searchParams.set(key, value);
  }
  const authorization = await request(authorize);
  assert.equal(authorization.status, 302);
  const callback = new URL(authorization.headers.location);
  assert.equal(`${callback.origin}${callback.pathname}`, redirect);
  assert.equal(callback.searchParams.get('state'), 'fictitious-probe-state');
  assert.ok(callback.searchParams.get('code'));
  stage = 'token';
  const tokens = await checked(discovery.token_endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:fictitious-test-only`).toString('base64')}` },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: callback.searchParams.get('code'), redirect_uri: redirect }),
  });
  stage = 'ID token signature and claims';
  assert.equal(tokens.token_type.toLowerCase(), 'bearer');
  assert.ok(tokens.access_token);
  const parts = tokens.id_token.split('.');
  assert.equal(parts.length, 3);
  const [headerPart, claimPart, signaturePart] = parts;
  const header = JSON.parse(Buffer.from(headerPart, 'base64url'));
  const claims = JSON.parse(Buffer.from(claimPart, 'base64url'));
  assert.equal(header.alg, 'RS256');
  const key = jwks.keys.find((jwk) => jwk.kid === header.kid);
  assert.ok(key);
  assert.ok(verify('RSA-SHA256', Buffer.from(`${headerPart}.${claimPart}`),
    createPublicKey({ key, format: 'jwk' }), Buffer.from(signaturePart, 'base64url')));
  assert.equal(claims.iss, issuer);
  assert.ok([claims.aud].flat().includes(clientId));
  assert.equal(claims.nonce, 'fictitious-probe-nonce');
  assert.equal(claims.sub, 'stockpilot-fictitious-person');
  assert.ok(claims.exp > Date.now() / 1000);
  stage = 'UserInfo';
  const user = await checked(discovery.userinfo_endpoint, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  assert.equal(user.sub, claims.sub);
  assert.equal(user.name, 'Persona Demo');
  assert.equal(user.email, 'persona@example.com');
  assert.equal(user.email_verified, true);
  console.log(`Provider capability probe passed (${windowsLoopback ? 'Windows process loopback resolution' : 'container/native DNS'}): exact issuer/endpoints, authorize/token/JWKS signature/UserInfo, iss/aud/nonce; no tokens printed. Application protocol remains B3.`);
}

try { await probe(); }
catch { console.error(`Provider capability probe failed at ${stage}; response bodies, claims and credentials omitted.`); process.exitCode = 1; }
