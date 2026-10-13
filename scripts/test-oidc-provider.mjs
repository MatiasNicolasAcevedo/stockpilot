// Capability probe for the exact isolated provider, from Windows and a Node container on the same network.
// BLOCKED: required image 3.1.4 cannot currently be pulled; this probe is not yet runtime-verified.
// Does not authenticate StockPilot, prove negative tokens/session fixation, or replace B3.
import assert from 'node:assert/strict';
import { createPublicKey, verify } from 'node:crypto';

const issuer = 'http://host.docker.internal:8090/default';
const clientId = 'stockpilot-test';
const redirect = 'http://127.0.0.1:5175/login/oauth2/code/google';

async function checked(url, init = {}) {
  const response = await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200, `Unexpected response from ${new URL(url).pathname}`);
  return response.json();
}

const discovery = await checked(`${issuer}/.well-known/openid-configuration`);
assert.equal(discovery.issuer, issuer);
for (const [key, path] of Object.entries({ authorization_endpoint: 'authorize', token_endpoint: 'token',
  jwks_uri: 'jwks', userinfo_endpoint: 'userinfo' })) assert.equal(discovery[key], `${issuer}/${path}`);
const jwks = await checked(discovery.jwks_uri);
assert.ok(jwks.keys.length > 0);
const authorize = new URL(discovery.authorization_endpoint);
for (const [key, value] of Object.entries({ response_type: 'code', client_id: clientId, redirect_uri: redirect,
  scope: 'openid profile email', state: 'fictitious-probe-state', nonce: 'fictitious-probe-nonce' })) {
  authorize.searchParams.set(key, value);
}
const authorization = await fetch(authorize, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
assert.equal(authorization.status, 302);
const callback = new URL(authorization.headers.get('location'));
assert.equal(`${callback.origin}${callback.pathname}`, redirect);
assert.equal(callback.searchParams.get('state'), 'fictitious-probe-state');
assert.ok(callback.searchParams.get('code'));
const tokens = await checked(discovery.token_endpoint, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${Buffer.from(`${clientId}:fictitious-test-only`).toString('base64')}` },
  body: new URLSearchParams({ grant_type: 'authorization_code', code: callback.searchParams.get('code'), redirect_uri: redirect }),
});
const [headerPart, claimPart, signaturePart] = tokens.id_token.split('.');
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
assert.ok(claims.exp > Date.now() / 1000);
const user = await checked(discovery.userinfo_endpoint, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
assert.equal(user.sub, claims.sub);
assert.equal(user.email, 'persona@example.com');
console.log('Exact issuer and discovery/authorize/token/JWKS signature/UserInfo capability probe passed; no tokens printed, application protocol is B3.');
