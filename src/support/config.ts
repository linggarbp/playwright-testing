/**
 * Centralized runtime configuration for the suite.
 *
 * Every environment variable the suite uses is read and validated here, exactly once, at module
 * load. Nothing else touches `process.env` directly (the Playwright Test config reads its own copy
 * at config time) — step / page / support code imports `config` instead. That keeps env parsing
 * testable and stops defaults from drifting apart between files.
 *
 * This module deliberately imports neither Playwright nor Cucumber, so it can be unit-tested with
 * zero browser/runtime overhead (see test/unit/config.test.mjs).
 */

import * as fs from 'fs';
import * as path from 'path';

// Load a local .env when present. Best-effort: a missing .env is a valid state (CI, quick clone).
try {
  require('dotenv').config({ quiet: true });
} catch {
  /* dotenv is optional at runtime */
}

// -------------------------------------------------------------------------------------------------
// Low-level env readers (never throw; always fall back to a safe default)
// -------------------------------------------------------------------------------------------------

function readString(name: string, fallback = ''): string {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = readString(name).toLowerCase();
  if (raw === '') return fallback;
  return !['false', '0', 'no', 'off'].includes(raw);
}

function readInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(readString(name), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Trim surrounding whitespace and any trailing slashes so path joins never double up. */
export function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

// -------------------------------------------------------------------------------------------------
// Resolved values
// -------------------------------------------------------------------------------------------------

export const DEFAULTS = {
  BASE_URL: 'https://www.saucedemo.com',
  BROWSER: 'chromium',
  HEADLESS: true,
  SLOW_MO: 0,
  DEFAULT_TIMEOUT: 60_000,
  NAVIGATION_TIMEOUT: 30_000,
  RETRIES: 0,
  ARTIFACTS_DIR: 'test-results',
  STANDARD_USER: 'standard_user',
  LOCKED_OUT_USER: 'locked_out_user',
  PROBLEM_USER: 'problem_user',
  // Public demo-shop password, safe to ship as a default (see .env.example).
  PASSWORD: 'secret_sauce',
  TEST_ENV: 'demo',
} as const;

export interface Config {
  /** Storefront under test, without a trailing slash. */
  baseUrl: string;
  browser: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  /** Milliseconds Playwright slows every action by — for watching a run. */
  slowMo: number;
  /** Cucumber step timeout / Playwright Test timeout. */
  defaultTimeout: number;
  /** Page-navigation timeout. */
  navigationTimeout: number;
  /** Retries per Playwright Test spec (Cucumber has its own @flaky retry in cucumber.js). */
  retries: number;
  /** Absolute root for reports, step context and screenshots. */
  artifactsDir: string;
  /** Per-step context JSON files. */
  stepsDir: string;
  /** Failure and step screenshots. */
  screenshotsDir: string;

  // Demo accounts (never logged).
  standardUser: string;
  lockedOutUser: string;
  problemUser: string;
  password: string;

  /** Free-form environment label, printed in the run summary. */
  testEnv: string;
}

const browserRaw = readString('BROWSER', DEFAULTS.BROWSER).toLowerCase();
const browser: Config['browser'] =
  browserRaw === 'firefox' || browserRaw === 'webkit' ? (browserRaw as Config['browser']) : 'chromium';

const artifactsRaw = readString('ARTIFACTS_DIR', DEFAULTS.ARTIFACTS_DIR);
const artifactsDir = path.isAbsolute(artifactsRaw) ? artifactsRaw : path.resolve(process.cwd(), artifactsRaw);

export const config: Config = {
  baseUrl: normalizeBaseUrl(readString('BASE_URL', DEFAULTS.BASE_URL)),
  browser,
  headless: readBool('HEADLESS', DEFAULTS.HEADLESS),
  slowMo: readInt('SLOW_MO', DEFAULTS.SLOW_MO),
  defaultTimeout: readInt('DEFAULT_TIMEOUT', DEFAULTS.DEFAULT_TIMEOUT),
  navigationTimeout: readInt('NAVIGATION_TIMEOUT', DEFAULTS.NAVIGATION_TIMEOUT),
  retries: readInt('RETRIES', DEFAULTS.RETRIES),
  artifactsDir,
  stepsDir: path.join(artifactsDir, 'steps'),
  screenshotsDir: path.join(artifactsDir, 'screenshots'),

  standardUser: readString('STANDARD_USER', DEFAULTS.STANDARD_USER),
  lockedOutUser: readString('LOCKED_OUT_USER', DEFAULTS.LOCKED_OUT_USER),
  problemUser: readString('PROBLEM_USER', DEFAULTS.PROBLEM_USER),
  password: readString('PASSWORD', DEFAULTS.PASSWORD),
  testEnv: readString('TEST_ENV', DEFAULTS.TEST_ENV),
};

let validated = false;

/**
 * Validate the resolved configuration once and print a single summary.
 * A BASE_URL that is not an absolute http(s) URL would make every navigation fail with a cryptic
 * error, so it is rejected here, at startup, with the offending value named.
 */
export function validateConfig(): void {
  if (validated) return;
  validated = true;

  if (!/^https?:\/\//i.test(config.baseUrl)) {
    throw new Error(`BASE_URL must be an absolute http(s) URL — got "${config.baseUrl}" (check your .env).`);
  }

  console.log(
    `[config] target=${config.baseUrl} browser=${config.browser} headless=${config.headless} ` +
      `env=${config.testEnv} artifacts=${config.artifactsDir}`,
  );
}

/** Create the artifact directories. Safe to call repeatedly. */
export function ensureArtifactDirs(): void {
  for (const dir of [config.stepsDir, config.screenshotsDir]) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      /* read-only FS — artifacts simply stay in the report */
    }
  }
}
