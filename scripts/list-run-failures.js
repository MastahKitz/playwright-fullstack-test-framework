#!/usr/bin/env node
// Flatten a Playwright run's JSON report into the list of failures the
// qa-results-analysis job hands to the model.
//
// Replaces extract-failure-anchors.js: no stack-frame parsing, no anchor. The
// marker now lives at the test-case level, so a failure is identified by
// `spec + title` alone. This script's only job is to save the model from
// traversing a large nested `suites → specs → tests` tree — it emits one flat
// entry per test whose status is `unexpected` (failed) or `flaky` (passed only
// on retry).
//
// Usage:
//   node scripts/list-run-failures.js [test-report/results.json] > run-failures.json
//
// Output: [ { spec, title, status, error_excerpt } ]
//   spec  — repo-relative spec path, e.g. tests/functional/order/cart/cart.spec.ts
//   title — the exact test('...') title
//   status — "unexpected" | "flaky"
//   error_excerpt — first line of the first error stack, trimmed to 200 chars

const fs = require('fs');
const path = require('path');

const reportPath = process.argv[2] || 'test-report/results.json';
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Playwright reports `spec.file` relative to the config's rootDir (the testDir).
// Re-root it against the repo so it matches the `tests/functional/...` paths the
// marker grep produces.
function specPrefix() {
  const root = report.config && report.config.rootDir;
  if (!root) return 'tests/functional';
  const rel = path.relative(process.cwd(), root).split(path.sep).join('/');
  return rel && !rel.startsWith('..') ? rel : 'tests/functional';
}
const PREFIX = specPrefix();

function firstErrorLine(test) {
  for (const result of test.results || []) {
    for (const err of result.errors || []) {
      if (err.stack) return err.stack.split('\n')[0];
      if (err.message) return err.message.split('\n')[0];
    }
    if (result.error && result.error.stack) return result.error.stack.split('\n')[0];
  }
  return '';
}

const out = [];

function walk(suite) {
  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      if (test.status !== 'unexpected' && test.status !== 'flaky') continue;
      out.push({
        spec: `${PREFIX}/${spec.file}`.replace(/\\/g, '/'),
        title: spec.title,
        status: test.status,
        error_excerpt: firstErrorLine(test).trim().slice(0, 200),
      });
    }
  }
  for (const child of suite.suites || []) walk(child);
}

for (const suite of report.suites || []) walk(suite);

process.stdout.write(JSON.stringify(out, null, 2) + '\n');
