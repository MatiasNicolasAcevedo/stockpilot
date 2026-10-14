// A infrastructure probe only. Does not credit product scenarios B or FULL.
import './readiness.mjs';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const response = await page.goto('http://localhost');
  assert.equal(response.status(), 200);
  await page.locator('#root > *').first().waitFor();
  assert.ok(await page.locator('script[src^="/assets/"]').count(), 'Real compiled SPA required');
  console.log('A: Chromium + real nginx build boot OK (not B/FULL)');
} finally {
  await browser.close();
}
