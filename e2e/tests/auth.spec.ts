import { randomUUID } from 'node:crypto';
import { test, expect, control, readiness, login, label, layout, keyboardActivate, issuer } from './fixtures';

test.describe.configure({ timeout: 90_000 });

test('visitor, real OIDC callback, reload and repeated login preserve the PostgreSQL identity', async ({ page, identity }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Ingresar', exact: true })).toBeVisible();
  expect((await page.request.get('/api/v1/auth/me')).status()).toBe(401);
  await layout(page);
  await keyboardActivate(page, 'link', 'Ingresar');
  await expect(page.getByRole('heading', { name: 'Ingresar a StockPilot' })).toBeVisible();
  await layout(page);
  const id = await login(page, identity);
  const fingerprint = await control('fingerprint', identity) as { id: string; createdAt: string }[];
  expect(fingerprint).toHaveLength(1);
  expect(fingerprint[0].id).toBe(id);
  expect(Number.isFinite(Date.parse(fingerprint[0].createdAt))).toBe(true);
  await layout(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled();
  expect((await (await page.request.get('/api/v1/auth/me')).json()).id).toBe(id);
  // Fresh authorize/callback, even while already authenticated.
  await page.goto('/oauth2/authorization/google');
  await expect(page).toHaveURL('http://localhost/');
  await expect(page.getByText(label(identity), { exact: true })).toBeVisible();
  expect((await (await page.request.get('/api/v1/auth/me')).json()).id).toBe(id);
  expect(await control('fingerprint', identity)).toEqual(fingerprint);
  const exposure = await page.evaluate(() => ({
    cookies: document.cookie.split(';').filter(Boolean).map(item => item.trim().split('=')[0]),
    local: localStorage.length, session: sessionStorage.length,
  }));
  expect(exposure.cookies).toEqual(['XSRF-TOKEN']);
  expect(exposure.local).toBe(0);
  expect(exposure.session).toBe(0);
});

test('logout requires CSRF, confirms 204, renews protection and rejects the old session cookie', async ({ page, context, browser, identity }) => {
  const id = await login(page, identity);
  const old = (await context.cookies()).find(cookie => cookie.name === 'JSESSIONID');
  const csrf = (await context.cookies()).find(cookie => cookie.name === 'XSRF-TOKEN');
  expect(Boolean(old?.httpOnly)).toBe(true);
  expect(Boolean(csrf && !csrf.httpOnly)).toBe(true);
  const missing = await page.request.post('/logout');
  expect(missing.status()).toBe(403);
  expect((await (await page.request.get('/api/v1/auth/me')).json()).id).toBe(id);
  await expect(page.getByText('La sesión terminó. Volvé a ingresar.')).toHaveCount(0);
  const logout = page.waitForResponse(response => new URL(response.url()).pathname === '/logout' && response.request().method() === 'POST');
  await keyboardActivate(page, 'button', 'Cerrar sesión');
  expect((await logout).status()).toBe(204);
  await expect(page).toHaveURL('http://localhost/login');
  await expect.poll(async () => (await context.cookies()).some(cookie => cookie.name === 'XSRF-TOKEN' && cookie.value !== csrf?.value)).toBe(true);
  expect((await page.request.get('/api/v1/auth/me')).status()).toBe(401);
  await expect(page.getByText(label(identity), { exact: true })).toHaveCount(0);
  expect((await page.request.post('/logout', { headers: { 'X-XSRF-TOKEN': csrf!.value } })).status()).toBe(403);
  // Cookie values remain in memory only; never attach storageState or log them.
  const stale = await browser.newContext({ baseURL: 'http://localhost' });
  try {
    await stale.addCookies([old!]);
    expect((await stale.request.get('/api/v1/auth/me')).status()).toBe(401);
  } finally { await stale.close(); }
  expect((await control('fingerprint', identity) as { id: string }[])[0].id).toBe(id);
  await layout(page);
});

test('backend restart expires the session once without redirects; a different identity replaces the old one', async ({ page, identity }) => {
  const first = await login(page, identity);
  const fingerprint = await control('fingerprint', identity);
  await control('restart');
  await readiness(page);
  let meRequests = 0;
  let redirects = 0;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/v1/auth/me') meRequests++;
    if (request.isNavigationRequest()) redirects++;
  });
  const expired = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/me');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange', { bubbles: true })));
  expect((await expired).status()).toBe(401);
  await expect(page.getByRole('alert')).toContainText('La sesión terminó. Volvé a ingresar.');
  await expect(page.getByText(label(identity), { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0);
  await expect(page).toHaveURL('http://localhost/');
  // Observe a bounded interval through polling, with a positive completion condition, no fixed sleep.
  const deadline = Date.now() + 3000;
  await expect.poll(() => {
    expect(meRequests).toBe(1);
    expect(redirects).toBe(0);
    return Date.now() >= deadline;
  }, { timeout: 5000, intervals: [100, 200, 300] }).toBe(true);
  expect(await control('fingerprint', identity)).toEqual(fingerprint);
  await layout(page);
  const second = randomUUID();
  await control('identity', second);
  await readiness(page);
  expect(await login(page, second)).not.toBe(first);
  await expect(page.getByText(label(identity), { exact: true })).toHaveCount(0);
  await expect(page.getByText('La sesión terminó. Volvé a ingresar.')).toHaveCount(0);
  await layout(page);
});

test('provider cancellation uses real state; orphan callback also shows only the fixed accessible error', async ({ page, identity }) => {
  await page.goto('/login');
  // Use the context's real HTTP cookie jar to pause the redirect chain before an automatic login.
  // Playwright route only handles the initial URL in a redirect chain; no route/fulfill is used here.
  const start = await page.request.get('/oauth2/authorization/google', { maxRedirects: 0 });
  expect(start.status()).toBe(302);
  const authorization = new URL(start.headers().location);
  expect(authorization.origin + authorization.pathname).toBe(`${issuer}/authorize`);
  const state = authorization.searchParams.get('state');
  expect(Boolean(state), 'Real backend state is present').toBe(true);
  expect(authorization.searchParams.get('redirect_uri')).toBe('http://localhost/login/oauth2/code/google');
  // Exercise the real provider authorize too; discard its success code and return a controlled denial.
  expect((await page.request.get(authorization.href, { maxRedirects: 0 })).status()).toBe(302);
  const callback = new URL('http://localhost/login/oauth2/code/google');
  callback.searchParams.set('state', state!);
  callback.searchParams.set('error', 'access_denied');
  callback.searchParams.set('error_description', 'UNTRUSTED_FICTITIOUS_DESCRIPTION');
  await page.goto(callback.href);
  for (const orphan of [false, true]) {
    if (orphan) await page.goto('/login/oauth2/code/google?code=FICTITIOUS_ORPHAN&state=FICTITIOUS_ORPHAN&error_description=UNTRUSTED_FICTITIOUS_DESCRIPTION');
    await expect(page).toHaveURL('http://localhost/login?error=authentication');
    await expect(page.getByRole('alert')).toContainText('El ingreso con Google se canceló o no se pudo completar. Podés volver a intentarlo.');
    await expect(page.getByText('UNTRUSTED_FICTITIOUS_DESCRIPTION')).toHaveCount(0);
    expect((await page.request.get('/api/v1/auth/me')).status()).toBe(401);
    expect(await control('fingerprint', identity)).toEqual([]);
    await layout(page);
  }
  // The accessible retry performs a subsequent successful real OIDC flow.
  await keyboardActivate(page, 'link', 'Reintentar');
  await expect(page.getByText(label(identity), { exact: true })).toBeVisible();
});
