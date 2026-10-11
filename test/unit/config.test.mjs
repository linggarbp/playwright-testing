/**
 * Unit tests for the runtime configuration in `src/support/config.ts` — run with `npm run test:unit`.
 *
 * The config resolves once at module load from `process.env` (after the optional `.env`), so every
 * case re-resolves it in a child process with a controlled environment. DOTENV_CONFIG_PATH points at
 * a throwaway empty file, so a developer's own `.env` can never leak into the expectations.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Every key the config reads — cleared from the child environment before each case. */
const CONFIG_KEYS = [
  'BASE_URL',
  'BROWSER',
  'HEADLESS',
  'SLOW_MO',
  'DEFAULT_TIMEOUT',
  'NAVIGATION_TIMEOUT',
  'RETRIES',
  'ARTIFACTS_DIR',
  'STANDARD_USER',
  'LOCKED_OUT_USER',
  'PROBLEM_USER',
  'PASSWORD',
  'TEST_ENV',
];

// A file that exists but declares nothing, so dotenv loads it instead of any real `.env`.
const emptyEnvFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pw-config-')), '.env');
fs.writeFileSync(emptyEnvFile, '');

/**
 * Resolve the suite config in a child process: `injected` mimics what a shell or CI job exports.
 */
function resolveConfig(injected = {}) {
  const env = { ...process.env, DOTENV_CONFIG_PATH: emptyEnvFile };
  for (const key of CONFIG_KEYS) delete env[key];
  Object.assign(env, injected);

  const out = execFileSync(
    process.execPath,
    ['-r', 'ts-node/register', '-e',
      "const { config } = require('./src/support/config');" +
      'console.log(JSON.stringify(config));'],
    { cwd: projectRoot, env, encoding: 'utf8' },
  );

  return JSON.parse(out.trim().split('\n').pop());
}

test('defaults resolve to the demo target and its public accounts', () => {
  const resolved = resolveConfig();

  assert.equal(resolved.baseUrl, 'https://www.saucedemo.com');
  assert.equal(resolved.browser, 'chromium');
  assert.equal(resolved.headless, true);
  assert.equal(resolved.slowMo, 0);
  assert.equal(resolved.defaultTimeout, 60_000);
  assert.equal(resolved.navigationTimeout, 30_000);
  assert.equal(resolved.retries, 0);
  assert.match(resolved.artifactsDir, /test-results$/);
  assert.equal(resolved.standardUser, 'standard_user');
  assert.equal(resolved.lockedOutUser, 'locked_out_user');
  assert.equal(resolved.problemUser, 'problem_user');
  assert.equal(resolved.password, 'secret_sauce');
  assert.equal(resolved.testEnv, 'demo');
});

test('BASE_URL is normalised: whitespace and trailing slashes are stripped', () => {
  const resolved = resolveConfig({ BASE_URL: '  https://shop.example.test///  ' });

  assert.equal(resolved.baseUrl, 'https://shop.example.test');
});

test('environment variables override every resolved value', () => {
  const resolved = resolveConfig({
    BASE_URL: 'https://staging.example.test/',
    BROWSER: 'webkit',
    HEADLESS: 'false',
    SLOW_MO: '250',
    DEFAULT_TIMEOUT: '90000',
    NAVIGATION_TIMEOUT: '15000',
    RETRIES: '2',
    ARTIFACTS_DIR: 'custom-artifacts',
    STANDARD_USER: 'alice',
    LOCKED_OUT_USER: 'bob',
    PROBLEM_USER: 'carol',
    PASSWORD: 'not-a-secret',
    TEST_ENV: 'staging',
  });

  assert.equal(resolved.baseUrl, 'https://staging.example.test');
  assert.equal(resolved.browser, 'webkit');
  assert.equal(resolved.headless, false);
  assert.equal(resolved.slowMo, 250);
  assert.equal(resolved.defaultTimeout, 90_000);
  assert.equal(resolved.navigationTimeout, 15_000);
  assert.equal(resolved.retries, 2);
  assert.match(resolved.artifactsDir, /custom-artifacts$/);
  assert.equal(resolved.standardUser, 'alice');
  assert.equal(resolved.lockedOutUser, 'bob');
  assert.equal(resolved.problemUser, 'carol');
  assert.equal(resolved.password, 'not-a-secret');
  assert.equal(resolved.testEnv, 'staging');
});
