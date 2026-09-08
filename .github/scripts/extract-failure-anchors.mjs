// Pick the one consistent code location for each failing/flaky test in this run.
//
// In a layered suite the top of a Playwright stack trace lands in a different
// file depending on how the test broke (assertion helper, action helper, flow,
// or the spec itself). That makes `file:line` an unstable key across runs. This
// script picks a single deterministic anchor per failure — the DEEPEST stack
// frame that lives in a `*.{spec,flow,actions,assertions}.ts` file under
// `tests/functional/` — so the results-analysis workflow, the marker it commits,
// and every later run all key off the same line.
//
// Usage:
//   node extract-failure-anchors.mjs [test-report/results.json] > failure-anchors.json

import { readFileSync } from 'node:fs';

// tests/functional/checkout/checkout.assertions.ts:15(:22) — anywhere in a stack string
const FRAME_RE =
  /(tests\/functional\/[^\s:)]+\.(?:spec|flow|actions|assertions)\.ts):(\d+)(?::\d+)?/g;

const reportPath = process.argv[2] ?? 'test-report/results.json';
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

const firstStack = (test) => {
  for (const result of test.results ?? []) {
    for (const err of result.errors ?? []) if (err.stack) return err.stack;
    if (result.error?.stack) return result.error.stack;
  }
  return '';
};

const framesFrom = (stack) => {
  const frames = [];
  for (const m of stack.matchAll(FRAME_RE)) {
    const frame = `${m[1]}:${m[2]}`;
    if (!frames.includes(frame)) frames.push(frame); // stack order: deepest first
  }
  return frames;
};

const out = [];

const walk = (suite) => {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      if (test.status !== 'unexpected' && test.status !== 'flaky') continue;
      const stack = firstStack(test);
      const frames = framesFrom(stack);
      out.push({
        test: spec.title,
        spec: spec.file,
        status: test.status,
        // deepest functional-test frame, or the `test()` line if the stack has none
        anchor: frames[0] ?? `${spec.file}:${spec.line ?? 1}`,
        frames,
        error_excerpt: (stack.split('\n')[0] ?? '').trim().slice(0, 200),
      });
    }
  }
  for (const child of suite.suites ?? []) walk(child);
};

for (const suite of report.suites ?? []) walk(suite);

process.stdout.write(JSON.stringify(out, null, 2) + '\n');
