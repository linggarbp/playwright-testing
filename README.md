# playwright-testing

[![CI](https://github.com/linggarbp/playwright-testing/actions/workflows/ci.yml/badge.svg)](https://github.com/linggarbp/playwright-testing/actions/workflows/ci.yml)

A standalone Playwright + Cucumber (BDD) test framework with two runners sharing one page-object
model, demonstrated against the public [Sauce Demo](https://www.saucedemo.com) shop.

## Why this repository exists

It is a compact, self-contained reference for how a real web-automation suite is put together:

- **Two runners, one suite.** Business-facing Gherkin scenarios run under Cucumber; the same flows
  can be expressed as code-first Playwright Test specs. Both share the page objects, the
  configuration and the target, so there is no duplicated automation logic.
- **Page Object Model.** Locators and actions live in `src/pages/`; features, steps and specs stay
  about intent and assertions.
- **Tag-driven execution.** `@smoke`, `@regression`, and friends select scenarios per run without
  editing files.
- **Artifacts worth debugging with.** HTML + JSON reports, per-step context JSON (URL, console
  errors, failed requests, duration) and screenshots on failure.
- **One validated configuration.** Every environment variable is read exactly once, in
  `src/support/config.ts`, and covered by unit tests.
- **CI that proves the suite is real.** The pipeline typechecks, unit-tests the configuration,
  dry-runs the Gherkin (so an undefined step fails the build) and executes the smoke suite against
  the live demo.

## Demo target

The suite runs against **[saucedemo.com](https://www.saucedemo.com)** — Sauce Labs' public demo
shop, intentionally available for automation practice. The accounts are public and safe to ship in
`.env.example`:

| Account | Behaviour |
| --- | --- |
| `standard_user` | signs in normally |
| `locked_out_user` | refused with "Sorry, this user has been locked out." |
| `problem_user` | signs in, with rendering quirks |
| password (all) | `secret_sauce` |

A second, browser-free spec exercises Playwright's `request` fixture against
[jsonplaceholder.typicode.com](https://jsonplaceholder.typicode.com).

## Tech stack

- Node.js 22+
- TypeScript (strict)
- [Playwright](https://playwright.dev) — browser automation and the code-first test runner
- [Cucumber](https://cucumber.io) + Gherkin — the BDD runner, driven by ts-node
- `node:test` — unit tests for the configuration (no browser needed)

## Quick start

```bash
git clone https://github.com/linggarbp/playwright-testing.git
cd playwright-testing
npm install
cp .env.example .env
npx playwright install chromium
npm test            # run every Gherkin scenario
```

The defaults in `.env.example` already point at the demo shop; a `.env` is only needed when you
want to change something.

## Commands

| Command | What it runs |
| --- | --- |
| `npm test` | every Cucumber scenario (`npx cucumber-js`) |
| `npm run test:smoke` | scenarios tagged `@smoke` |
| `npm run test:regression` | scenarios tagged `@regression` |
| `npm run test:headed` | scenarios tagged `@headed` (reserved for slow, watched runs) |
| `npm run test:report` | a Cucumber run that writes the HTML + JSON reports |
| `npm run test:spec` | every Playwright Test spec in `spec/` |
| `npm run test:spec:smoke` | specs whose title carries `@smoke` |
| `npm run test:unit` | unit tests for the configuration (`node:test`, no browser) |
| `npm run lint` / `npm run typecheck` | `tsc --noEmit` |
| `npm run clean` | remove generated reports and artifacts |

A single feature or scenario without a script:

```bash
npx cucumber-js features/login.feature
npx cucumber-js --name "A standard user signs in successfully"
npx playwright test spec/saucedemo.spec.ts
```

## Project structure

```
playwright-testing/
├── .github/workflows/ci.yml     # typecheck, unit tests, dry run, smoke suite
├── features/                    # Gherkin scenarios (Cucumber runner)
│   ├── login.feature
│   ├── inventory.feature
│   ├── cart.feature
│   └── checkout.feature
├── spec/                        # code-first specs (Playwright Test runner)
│   ├── fixtures.ts              # console/network collectors, signed-in page, evidence helper
│   ├── saucedemo.spec.ts
│   └── api.spec.ts
├── src/
│   ├── pages/                   # Page Object Model — shared by both runners
│   │   ├── login.page.ts
│   │   ├── inventory.page.ts
│   │   ├── cart.page.ts
│   │   └── checkout.page.ts
│   ├── steps/                   # Cucumber step definitions, one file per feature area
│   │   ├── login.steps.ts
│   │   ├── inventory.steps.ts
│   │   ├── cart.steps.ts
│   │   └── checkout.steps.ts
│   └── support/
│       ├── config.ts            # every environment variable, read once
│       ├── world.ts             # per-scenario context: page, diagnostics, evidence buffer
│       └── hooks.ts             # lifecycle + step context + screenshots
├── test/unit/config.test.mjs    # node:test coverage for the configuration
├── cucumber.js
├── playwright.config.ts
├── tsconfig.json
└── .env.example
```

## Configuration

Every value is read once in `src/support/config.ts` (the Playwright Test config reads the same
variables at config time). Copy `.env.example` to `.env` to override any of them.

| Variable | Description | Default |
| --- | --- | --- |
| `BASE_URL` | Storefront under test (trailing slashes are stripped) | `https://www.saucedemo.com` |
| `BROWSER` | `chromium`, `firefox` or `webkit` | `chromium` |
| `HEADLESS` | Run browsers without a visible window | `true` |
| `SLOW_MO` | Milliseconds Playwright slows each action by | `0` |
| `DEFAULT_TIMEOUT` | Cucumber step / Playwright Test timeout (ms) | `60000` |
| `NAVIGATION_TIMEOUT` | Page-navigation timeout (ms) | `30000` |
| `RETRIES` | Retries per Playwright Test spec | `0` |
| `ARTIFACTS_DIR` | Root for reports, step context and screenshots | `test-results` |
| `STANDARD_USER` | Account that signs in successfully | `standard_user` |
| `LOCKED_OUT_USER` | Account the shop refuses | `locked_out_user` |
| `PROBLEM_USER` | Account with rendering quirks | `problem_user` |
| `PASSWORD` | Shared password for the demo accounts | `secret_sauce` |
| `TEST_ENV` | Environment label printed in the run summary | `demo` |

Cucumber retries a failed scenario once, but only when it is tagged `@flaky` (see `cucumber.js`) —
a genuinely broken scenario still fails fast.

## Writing new tests

**1. Page object** — `src/pages/cart.page.ts`:

```ts
import { expect, Locator, Page } from '@playwright/test';

export class CartPage {
  readonly title: Locator;
  readonly checkoutButton: Locator;

  constructor(private readonly page: Page) {
    this.title = page.locator('.title');
    this.checkoutButton = page.locator('[data-test="checkout"]');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title).toHaveText('Your Cart');
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
  }
}
```

**2. Step definition** — `src/steps/cart.steps.ts`:

```ts
import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CartPage } from '../pages/cart.page';
import { ShoppingWorld } from '../support/world';

When('I open the shopping cart', async function (this: ShoppingWorld) {
  const cart = new CartPage(this.page);
  await cart.open();
  await cart.expectLoaded();
});
```

**3. Scenario** — `features/cart.feature`:

```gherkin
@smoke
Scenario: A shopper proceeds to checkout
  Given I am signed in as the standard user
  And I add the first product to the cart
  When I open the shopping cart
  And I proceed to checkout
  Then the checkout overview should show the item total
```

`npx cucumber-js --dry-run` reports any Gherkin line without a matching step — run it before
pushing; CI does exactly that.

The same page object serves the code-first runner, `spec/`:

```ts
import { CartPage } from '../src/pages/cart.page';
import { expect, test } from './fixtures';

test('@smoke the cart holds the added product', async ({ signedInPage }) => {
  const cart = new CartPage(signedInPage);
  await cart.open();
  await expect(cart.checkoutButton).toBeVisible();
});
```

## Two runners, one suite

| | Cucumber runner | Playwright Test runner |
| --- | --- | --- |
| Entry point | `npx cucumber-js` (`npm test`) | `npx playwright test` (`npm run test:spec`) |
| Tests live in | `features/` + `src/steps/` | `spec/` |
| Selection | tags — `--tags '@smoke'` | title grep — `--grep @smoke` |
| Reports | `test-results/cucumber-report.{html,json}` | `playwright-report/` + `test-results/playwright/` |
| Shared | `src/pages/`, `src/support/config.ts`, the same `.env` and target | same |

`playwright.config.ts` points `testDir` at `spec/` only, so the two runners never collect each
other's tests: Gherkin files belong to Cucumber, TypeScript specs to Playwright Test.

## Reports and artifacts

- `test-results/cucumber-report.html` / `.json` — the Cucumber reports.
- `test-results/steps/` — one context JSON per executed step: scenario, step text, status,
  duration, final URL, console errors and failed requests observed during that step.
- `test-results/screenshots/` — full-page screenshots of failed steps, failed scenarios and any
  screenshot a step queued through `this.attachScreenshot(...)`.
- `playwright-report/` — the Playwright HTML report, including traces of failed specs
  (`test-results/playwright/` holds the raw trace/attachment files).

The step-context JSON and screenshots are also attached to the Cucumber HTML report, so a failure
can be diagnosed without leaving the report.

## Continuous integration

`.github/workflows/ci.yml` runs two jobs on every push and pull request to `main`:

1. **quality** — `npm ci`, typecheck, configuration unit tests, `npx cucumber-js --dry-run`
   (fails on any undefined step) and `npx playwright test --list` (fails on a broken spec file).
2. **smoke** — installs Chromium and runs the `@smoke` scenarios against the live demo shop, then
   uploads the reports as build artifacts.

## License

[MIT](LICENSE) © 2026 Linggar Bhakti Pratama
