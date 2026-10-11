/**
 * Cucumber World — the shared per-scenario context.
 *
 * Cucumber builds a fresh World for every scenario, so everything declared here is naturally
 * scenario-scoped (and therefore safe under `--parallel`). The browser itself is a module-level
 * singleton shared by every scenario in a worker process, so the suite pays the cold start once.
 */

import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { chromium, firefox, webkit, Browser, BrowserContext, Page, APIRequestContext } from '@playwright/test';
import { config } from './config';

/** A request that failed outright or answered 4xx/5xx while a step ran. */
export interface FailedRequest {
  url: string;
  method: string;
  status?: number;
  error?: string;
}

/** A catalogue entry the steps remember between statements. */
export interface ProductSnapshot {
  name: string;
  price: string;
}

/** Evidence queued by a step for the hooks to persist and attach to the report. */
export interface EvidenceItem {
  kind: 'json' | 'text' | 'image';
  label: string;
  content?: string;
  buffer?: Buffer;
  contentType?: string;
  fileName?: string;
}

export interface ShoppingWorld extends World {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  request: APIRequestContext;

  // Scenario metadata
  scenarioName: string;
  scenarioTags: string[];
  scenarioStartTime: number;
  currentStepText: string;
  currentStepStartTime: number;
  /** 1-based position of the running step inside the scenario. */
  stepIndex: number;

  // Diagnostics collected while the scenario runs
  consoleErrors: string[];
  failedRequests: FailedRequest[];
  /** Cursors marking where the current step's console/network capture starts. */
  stepConsoleCursor: number;
  stepFailedRequestsCursor: number;

  /** The product the "add to the cart" step put in the basket, for later assertions. */
  addedProduct?: ProductSnapshot;

  /** Evidence buffered during the current step. */
  pendingEvidence: EvidenceItem[];

  init(): Promise<void>;
  close(): Promise<void>;

  /** Queue a JSON/text attachment for the current step. */
  attachJson(label: string, value: unknown): void;
  attachText(label: string, text: string): void;
  /** Screenshot the page, or return null when nothing has painted (blank / closed page). */
  captureScreenshot(fullPage?: boolean): Promise<Buffer | null>;
  /** Capture a screenshot and queue it as evidence for the current step. */
  attachScreenshot(label: string, fullPage?: boolean): Promise<void>;
  /** Return and clear the evidence queued during the current step. */
  consumeStepEvidence(): EvidenceItem[];
}

const MAX_CAPTURED = 200;

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.isConnected()) return sharedBrowser;
  const launcher = config.browser === 'firefox' ? firefox : config.browser === 'webkit' ? webkit : chromium;
  sharedBrowser = await launcher.launch({
    headless: config.headless,
    slowMo: config.slowMo,
  });
  return sharedBrowser;
}

/** Close the shared browser (called from AfterAll). */
export async function closeSharedBrowser(): Promise<void> {
  if (!sharedBrowser) return;
  const browser = sharedBrowser;
  sharedBrowser = null;
  await browser.close().catch(() => undefined);
}

class DefaultWorld extends World implements ShoppingWorld {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  request!: APIRequestContext;

  scenarioName = '';
  scenarioTags: string[] = [];
  scenarioStartTime = 0;
  currentStepText = '';
  currentStepStartTime = 0;
  stepIndex = 1;

  consoleErrors: string[] = [];
  failedRequests: FailedRequest[] = [];
  stepConsoleCursor = 0;
  stepFailedRequestsCursor = 0;

  addedProduct?: ProductSnapshot;

  pendingEvidence: EvidenceItem[] = [];

  constructor(options: IWorldOptions) {
    super(options);
  }

  async init(): Promise<void> {
    this.browser = await getBrowser();

    this.context = await this.browser.newContext({
      baseURL: config.baseUrl,
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
    });
    this.context.setDefaultTimeout(config.defaultTimeout);
    this.context.setDefaultNavigationTimeout(config.navigationTimeout);

    this.page = await this.context.newPage();
    this.request = this.context.request;

    this.attachDiagnostics();
  }

  private attachDiagnostics(): void {
    this.page.on('console', (message) => {
      if (message.type() === 'error') this.pushConsoleError(`console: ${message.text()}`);
    });
    this.page.on('pageerror', (error) => {
      this.pushConsoleError(`pageerror: ${error.message}`);
    });
    this.page.on('requestfailed', (request) => {
      this.pushFailedRequest({
        url: request.url(),
        method: request.method(),
        error: request.failure()?.errorText ?? 'requestfailed',
      });
    });
    this.page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        this.pushFailedRequest({ url: response.url(), method: response.request().method(), status });
      }
    });
  }

  private pushConsoleError(entry: string): void {
    if (this.consoleErrors.length < MAX_CAPTURED) this.consoleErrors.push(entry);
  }

  private pushFailedRequest(entry: FailedRequest): void {
    if (this.failedRequests.length < MAX_CAPTURED) this.failedRequests.push(entry);
  }

  async close(): Promise<void> {
    await this.page?.close().catch(() => undefined);
    await this.context?.close().catch(() => undefined);
  }

  attachJson(label: string, value: unknown): void {
    let content: string;
    try {
      content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    } catch {
      content = String(value);
    }
    this.pendingEvidence.push({ kind: 'json', label, content, contentType: 'application/json' });
  }

  attachText(label: string, text: string): void {
    this.pendingEvidence.push({ kind: 'text', label, content: text, contentType: 'text/plain' });
  }

  async captureScreenshot(fullPage = false): Promise<Buffer | null> {
    if (!this.page || this.page.isClosed()) return null;
    const url = this.page.url();
    // A page that never navigated is `about:blank` — a blank capture is evidence of nothing.
    if (url === '' || url === 'about:blank') return null;
    try {
      return await this.page.screenshot({ type: 'png', fullPage });
    } catch (error) {
      console.warn(`[world] Screenshot failed: ${(error as Error).message}`);
      return null;
    }
  }

  async attachScreenshot(label: string, fullPage = false): Promise<void> {
    const buffer = await this.captureScreenshot(fullPage);
    if (buffer) {
      this.pendingEvidence.push({
        kind: 'image',
        label,
        buffer,
        contentType: 'image/png',
        fileName: `${label}.png`,
      });
    }
  }

  consumeStepEvidence(): EvidenceItem[] {
    const items = this.pendingEvidence;
    this.pendingEvidence = [];
    return items;
  }
}

setWorldConstructor(DefaultWorld);
