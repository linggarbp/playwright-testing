/**
 * Cucumber lifecycle hooks.
 *
 *  - BeforeAll  : validate the configuration and create the artifact directories.
 *  - Before     : stamp scenario metadata and give the scenario its browser context + page.
 *  - BeforeStep : snapshot the step start (text, timestamps, console/network cursors).
 *  - AfterStep  : write a small step-context JSON (url, console errors, failed requests, duration)
 *                 to ARTIFACTS_DIR and attach it to the Cucumber report; a failed step also gets a
 *                 full-page screenshot, attached and saved under test-results/screenshots/.
 *  - After      : failure screenshot, then close the scenario's context and page.
 *  - AfterAll   : close the shared browser.
 *
 * Whatever a step queues through `this.attachJson` / `this.attachText` / `this.attachScreenshot`
 * is persisted and attached too, so the HTML report carries the same evidence the disk does.
 */

import {
  After,
  AfterAll,
  AfterStep,
  Before,
  BeforeAll,
  BeforeStep,
  Status,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import { config, ensureArtifactDirs, validateConfig } from './config';
import { closeSharedBrowser, ShoppingWorld } from './world';

setDefaultTimeout(config.defaultTimeout);

// -------------------------------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------------------------------

function safeName(text: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (cleaned || 'step').slice(0, 60);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function writeArtifact(dir: string, fileName: string, data: string | Buffer): void {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, fileName), data);
  } catch (error) {
    console.warn(`[hooks] Could not write artifact ${fileName}: ${(error as Error).message}`);
  }
}

// -------------------------------------------------------------------------------------------------
// Global lifecycle
// -------------------------------------------------------------------------------------------------

BeforeAll(function () {
  validateConfig();
  ensureArtifactDirs();
});

AfterAll(async function () {
  await closeSharedBrowser();
});

// -------------------------------------------------------------------------------------------------
// Scenario lifecycle
// -------------------------------------------------------------------------------------------------

Before(async function (this: ShoppingWorld, { pickle }) {
  this.scenarioName = pickle.name;
  this.scenarioTags = pickle.tags.map((tag) => tag.name.replace(/^@/, ''));
  this.scenarioStartTime = Date.now();
  this.stepIndex = 1;
  this.addedProduct = undefined;

  await this.init();
});

BeforeStep(function (this: ShoppingWorld, { pickleStep }) {
  this.currentStepText = pickleStep.text;
  this.currentStepStartTime = Date.now();
  this.stepConsoleCursor = this.consoleErrors.length;
  this.stepFailedRequestsCursor = this.failedRequests.length;
});

AfterStep(async function (this: ShoppingWorld, { pickleStep, result }) {
  const durationMs = Date.now() - this.currentStepStartTime;
  const status = Status[result.status] ?? String(result.status);
  const prefix = `${timestamp()}_${safeName(this.scenarioName)}_${String(this.stepIndex).padStart(2, '0')}`;

  // 1. The step-context JSON: what the step did, where the page ended up, and anything the page
  //    reported while it ran. Written to disk AND attached to the Cucumber report.
  const context = {
    scenario: this.scenarioName,
    step: pickleStep.text,
    status,
    durationMs,
    url: this.page && !this.page.isClosed() ? this.page.url() : undefined,
    consoleErrors: this.consoleErrors.slice(this.stepConsoleCursor),
    failedRequests: this.failedRequests.slice(this.stepFailedRequestsCursor),
  };
  const contextJson = JSON.stringify(context, null, 2);
  writeArtifact(config.stepsDir, `${prefix}_step-context.json`, contextJson);
  this.attach(contextJson, 'application/json');

  // 2. A failed step gets a full-page screenshot on the spot.
  if (result.status === Status.FAILED || result.status === Status.AMBIGUOUS) {
    const buffer = await this.captureScreenshot(true);
    if (buffer) {
      writeArtifact(config.screenshotsDir, `${prefix}_failure.png`, buffer);
      this.attach(buffer, 'image/png');
    }
  }

  // 3. Evidence the step itself queued.
  for (const item of this.consumeStepEvidence()) {
    if (item.kind === 'image' && item.buffer) {
      writeArtifact(config.screenshotsDir, `${prefix}_${safeName(item.label)}.png`, item.buffer);
      this.attach(item.buffer, 'image/png');
    } else if (item.content !== undefined) {
      writeArtifact(config.stepsDir, `${prefix}_${safeName(item.label)}.json`, item.content);
      this.attach(item.content, item.contentType ?? 'application/json');
    }
  }

  console.log(`   └─ [${status}] ${pickleStep.text} (${durationMs}ms)`);
  this.stepIndex += 1;
});

After(async function (this: ShoppingWorld, { pickle, result }) {
  if (result?.status === Status.FAILED) {
    const buffer = await this.captureScreenshot(true);
    if (buffer) {
      writeArtifact(config.screenshotsDir, `${timestamp()}_${safeName(pickle.name)}_scenario-failure.png`, buffer);
      this.attach(buffer, 'image/png');
    }
  }

  await this.close();
});
