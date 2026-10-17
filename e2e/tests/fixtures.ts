import { test as base, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';

export const issuer = 'http://host.docker.internal:8090/default';
export async function control(operation: string, identity?: string): Promise<unknown> {
  const id = randomUUID();
  await writeFile('/artifacts/control/request.tmp', JSON.stringify({ id, operation, identity }));
  await rename('/artifacts/control/request.tmp', '/artifacts/control/request.json');
  let response: { id: string; ok: boolean; result: unknown };
  await expect.poll(async () => {
    try { response = JSON.parse(await readFile('/artifacts/control/response.json', 'utf8')); }
    catch { return false; }
    return response.id === id;
  }, { timeout: 120_000, message: 'Own-project control deadline' }).toBe(true);
  await unlink('/artifacts/control/response.json');
  expect(response!.ok, 'Own-project control succeeded').toBe(true);
  return response!.result;
}

export async function readiness(page: Page) {
  await expect.poll(async () => {
    try {
      const discovery = await page.request.get(`${issuer}/.well-known/openid-configuration`, { timeout: 3000 });
      const metadata = await discovery.json();
      if (metadata.issuer !== issuer || !metadata.jwks_uri.startsWith(`${issuer}/`)) return false;
      const jwks = await page.request.get(metadata.jwks_uri, { timeout: 3000 });
      const api = await page.request.get('/api/v1/system/info', { timeout: 3000 });
      return jwks.status() === 200 && api.status() === 200;
    } catch { return false; }
  }, { timeout: 60_000, message: 'Real provider/JWKS/API readiness' }).toBe(true);
}

export const test = base.extend<{ identity: string }>({
  identity: [async ({ page }, use) => {
    const identity = randomUUID();
    await control('reset', identity);
    await readiness(page);
    try { await use(identity); }
    finally {
      // Every case restores its own backend, even after assertion failure/outage.
      await control('start');
      await readiness(page);
    }
  }, { auto: true, timeout: 180_000 }],
});
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  const url = new URL(page.url());
  // Only the known SPA screens can enter the shareable export. Auto screenshots stay raw/local.
  if (url.origin === 'http://localhost' && ['/', '/login'].includes(url.pathname)
    && (!url.search || url.search === '?error=authentication')) {
    await page.screenshot({ path: testInfo.outputPath('safe-failure.png') });
    await writeFile(testInfo.outputPath('safe-screenshot.json'), JSON.stringify({ safe: true }));
  }
});
export { expect };

export function label(identity: string) { return `Persona ${identity.slice(0, 8)}`; }

export async function keyboardActivate(page: Page, role: 'link' | 'button', name: string) {
  const target = page.getByRole(role, { name, exact: true });
  await expect(target).toBeEnabled();
  // Reach the actual control through tab order, without focus() bypassing keyboard navigation.
  for (let index = 0; index < 24; index++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate(element => element === document.activeElement)) break;
  }
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
}

export async function layout(page: Page) {
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'No horizontal overflow at the configured viewport').toBe(true);
  const controls = page.getByRole('main').locator('a:visible, button:visible');
  for (const element of await controls.all()) {
    const bounds = await element.boundingBox();
    expect(bounds !== null && bounds.x >= 0 && bounds.x + bounds.width <= page.viewportSize()!.width,
      'Visible main controls fit within the viewport').toBe(true);
    expect((await element.innerText()).trim().length > 0, 'Controls have visible labels').toBe(true);
  }
}

export async function login(page: Page, identity: string) {
  await page.goto('/login');
  const authorization = page.waitForRequest(request => request.url().startsWith(`${issuer}/authorize?`));
  const callback = page.waitForResponse(response => new URL(response.url()).pathname === '/login/oauth2/code/google');
  await keyboardActivate(page, 'link', 'Continuar con Google');
  const request = new URL((await authorization).url());
  expect(request.searchParams.get('redirect_uri')).toBe('http://localhost/login/oauth2/code/google');
  expect(Boolean(request.searchParams.get('state')), 'Real authorization state is present').toBe(true);
  expect((await callback).status()).toBe(302);
  await expect(page).toHaveURL('http://localhost/');
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeEnabled();
  await expect(page.getByText(label(identity), { exact: true })).toBeVisible();
  const me = await page.request.get('/api/v1/auth/me');
  expect(me.status()).toBe(200);
  expect(me.headers()['cache-control']).toContain('no-store');
  const user = await me.json();
  expect(Object.keys(user).sort()).toEqual(['displayName', 'email', 'emailVerified', 'id']);
  expect(user.displayName).toBe(label(identity));
  expect(user.email).toBe(`${identity}@example.invalid`);
  expect(user.emailVerified).toBe(true);
  expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  return user.id as string;
}
