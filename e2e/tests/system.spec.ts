import { test, expect, control, readiness, layout } from './fixtures';

test.describe.configure({ timeout: 90_000 });

test('compiled shell displays real API data and recovers accessibly through Reintentar after an outage', async ({ page }) => {
  const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/system/info' && response.status() === 200);
  await page.goto('/');
  const data = await (await response).json();
  expect(Object.keys(data).sort()).toEqual(['name', 'version']);
  expect(data.name).toBe('StockPilot');
  await expect(page.getByRole('status')).toContainText(`${data.name} · versión ${data.version}`);
  await expect(page.getByText('Servidor conectado', { exact: true })).toBeVisible();
  await layout(page);
  await control('stop');
  await page.reload();
  const error = page.getByRole('alert').filter({ hasText: 'No se pudo obtener el estado del servidor' });
  await expect(error).toBeVisible({ timeout: 20_000 });
  await expect(error).toContainText('No se pudo');
  await expect(error).toContainText('El servidor no está disponible en este momento. Intentá de nuevo en unos minutos.');
  await layout(page);
  await control('start');
  await readiness(page);
  const recovered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/system/info' && response.status() === 200);
  // Multiple alerts may expose retry while the backend is down; select the system alert explicitly.
  const retry = error.getByRole('button', { name: 'Reintentar', exact: true });
  await expect(retry).toBeEnabled();
  for (let index = 0; index < 24; index++) {
    await page.keyboard.press('Tab');
    if (await retry.evaluate(element => element === document.activeElement)) break;
  }
  await expect(retry).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await (await recovered).json()).toEqual(data);
  await expect(page.getByRole('status')).toContainText(`${data.name} · versión ${data.version}`);
  // Directed red assay changes this relevant expected UI result, never the server response.
  await expect(page.getByText(process.env.E2E_ASSERT_FAILURE === '1'
    ? 'INDUCED_WRONG_CONNECTED_LABEL' : 'Servidor conectado', { exact: true })).toBeVisible();
  await layout(page);
});
