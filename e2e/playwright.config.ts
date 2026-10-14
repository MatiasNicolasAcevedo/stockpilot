import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  forbidOnly: true,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: '/artifacts/test-results',
  reporter: [
    ['line'],
    ['html', { outputFolder: '/artifacts/playwright-report', open: 'never' }],
    ['junit', { outputFile: '/artifacts/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
});
