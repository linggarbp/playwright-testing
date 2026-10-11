import { defineConfig, devices } from '@playwright/test';

// The specs read the same environment the Cucumber suite does (the Gherkin side resolves it in
// src/support/config.ts); this file loads the values Playwright Test needs at config time.
require('dotenv').config({ quiet: true });

const BASE_URL = (process.env.BASE_URL || 'https://www.saucedemo.com').replace(/\/+$/, '');
const BROWSER = (process.env.BROWSER ?? 'chromium').toLowerCase();
const RETRIES = Number(process.env.RETRIES ?? 0);
const WORKERS = Number(process.env.PW_WORKERS ?? 0);

const PROJECTS = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
} as const;
type BrowserName = keyof typeof PROJECTS;
const browserName: BrowserName = (BROWSER in PROJECTS ? BROWSER : 'chromium') as BrowserName;

/**
 * The code-first runner (`npx playwright test`).
 *
 * `testDir` is `spec/` on purpose: the Gherkin feature files in `features/` belong to Cucumber, so
 * the two runners never collect each other's tests. Both share the page objects in `src/pages/`.
 *
 * Browser, base URL, timeouts and retries come from the same environment variables the Cucumber
 * runner uses — see .env.example for the full list.
 */
export default defineConfig({
  testDir: './spec',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: RETRIES,
  workers: WORKERS > 0 ? WORKERS : undefined,
  timeout: Number(process.env.DEFAULT_TIMEOUT ?? 60_000),
  expect: { timeout: Number(process.env.EXPECT_TIMEOUT ?? 10_000) },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/spec-results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    headless: process.env.HEADLESS !== 'false',
    ignoreHTTPSErrors: true,
    navigationTimeout: Number(process.env.NAVIGATION_TIMEOUT ?? 30_000),
    launchOptions: { slowMo: Number(process.env.SLOW_MO ?? 0) },
  },
  projects: [
    { name: browserName, use: { ...PROJECTS[browserName] } },
  ],
  // Kept below test-results/ so a `playwright test` run never clears the Cucumber reports.
  outputDir: 'test-results/playwright',
});
