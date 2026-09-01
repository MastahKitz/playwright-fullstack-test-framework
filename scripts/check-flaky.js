#!/usr/bin/env node
// Playwright's retries mask real flakiness: a test that fails then passes on
// retry still exits the run with code 0, so CI shows green. This walks the
// JSON reporter output and fails the build if any test's outcome was
// 'flaky' (passed only after at least one retry), so that gets investigated
// instead of silently disappearing.

const fs = require('fs');

const reportPath = process.argv[2] || 'test-report/results.json';
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

function collectFlakyTests(suite, flaky, titlePath = []) {
  for (const spec of suite.specs || []) {
    const specTitlePath = [...titlePath, spec.title];
    for (const test of spec.tests || []) {
      if (test.status === 'flaky') {
        flaky.push(`${spec.file} > ${specTitlePath.join(' > ')} [${test.projectName}]`);
      }
    }
  }
  for (const child of suite.suites || []) {
    collectFlakyTests(child, flaky, [...titlePath, child.title]);
  }
}

const flaky = [];
for (const suite of report.suites || []) {
  collectFlakyTests(suite, flaky);
}

if (flaky.length > 0) {
  for (const name of flaky) {
    console.log(`::error::Flaky test (passed only after retry): ${name}`);
  }
  console.error(`\n${flaky.length} flaky test(s) detected — failing the build so this gets investigated.`);
  process.exit(1);
}

console.log('No flaky tests detected.');
