/**
 * Fixtures for the code-first Playwright Test runner.
 *
 * What every spec gets for free:
 *  - `consoleErrors`  — console errors / page errors seen during the test;
 *  - `failedRequests` — requests that failed or answered 4xx/5xx during the test;
 *  - `signedInPage`   — the shared `page`, already signed in through the same LoginPage object the
 *                       Cucumber steps use;
 *  - `attachEvidence` — put a named JSON/text artifact on the HTML report.
 */

import { test as base, expect, type Page, type TestInfo } from '@playwright/test';

import { InventoryPage } from '../src/pages/inventory.page';
import { LoginPage } from '../src/pages/login.page';
import { config } from '../src/support/config';

export interface AppFixtures {
  /** Console errors seen during the test (empty array when the page was clean). */
  consoleErrors: string[];
  /** Requests that failed or answered 4xx/5xx during the test. */
  failedRequests: string[];
  /** A page signed in as the standard user, ready on the products page. */
  signedInPage: Page;
  /** Attach JSON/text evidence to the report under a label. */
  attachEvidence: (label: string, content: unknown) => Promise<void>;
}

export const test = base.extend<AppFixtures>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await use(errors);
  },

  failedRequests: async ({ page }, use) => {
    const failures: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
    page.on('requestfailed', (request) => {
      failures.push(`${request.failure()?.errorText ?? 'failed'} ${request.url()}`);
    });
    await use(failures);
  },

  signedInPage: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(config.standardUser, config.password);
    await expect(page).toHaveURL(/inventory\.html/, { timeout: config.navigationTimeout });
    await new InventoryPage(page).expectLoaded();
    await use(page);
  },

  attachEvidence: async ({}, use, testInfo: TestInfo) => {
    await use(async (label, content) => {
      await testInfo.attach(label, {
        body: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
        contentType: 'application/json',
      });
    });
  },
});

/**
 * One JSON blob per test with the environment facts worth keeping next to the result.
 */
export async function attachRunContext(
  testInfo: TestInfo,
  context: Record<string, unknown> = {},
  url?: string,
): Promise<void> {
  await testInfo.attach('run context', {
    body: JSON.stringify({ ...context, url: url ?? null, retry: testInfo.retry }, null, 2),
    contentType: 'application/json',
  });
}

export { expect };
