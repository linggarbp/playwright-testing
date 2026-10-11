/**
 * Cucumber configuration for the Gherkin runner (`npm test` / `npx cucumber-js`).
 *
 * - `require` compiles the TypeScript step definitions and support modules through ts-node.
 * - Every run writes both report formats into test-results/ (gitignored).
 * - A scenario is retried once — but only when tagged `@flaky`, so a genuinely broken scenario
 *   still fails fast.
 */
module.exports = {
  default: {
    paths: ["features/**/*.feature"],
    require: [
      "src/steps/**/*.ts",
      "src/support/**/*.ts"
    ],
    requireModule: [
      "ts-node/register"
    ],
    format: [
      "progress",
      "html:test-results/cucumber-report.html",
      "json:test-results/cucumber-report.json"
    ],
    formatOptions: {
      snippetInterface: "async-await"
    },
    retry: 1,
    retryTagFilter: "@flaky",
    parallel: 1,
    order: "defined"
  }
};
