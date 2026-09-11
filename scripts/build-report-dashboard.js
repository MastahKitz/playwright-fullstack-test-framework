#!/usr/bin/env node
// After each main-branch run this rebuilds the GitHub Pages dashboard: a table of
// the last MAX_RUNS runs (counts + a link to that run's full Playwright HTML
// report) plus the reports themselves. It assembles the *complete* desired site
// under ./public — this run's report, the MAX_RUNS-1 most recent prior reports
// copied out of the existing gh-pages checkout, a regenerated index.html — and
// the workflow force-pushes that wholesale to gh-pages, so older runs are purged
// with no extra bookkeeping.
//
// triage-history.json (the AI triage decision counts — see
// publish-triage-metrics.js) is someone else's data: this script doesn't touch
// its contents, just reads whatever is currently on gh-pages and copies it
// forward into the rebuilt site so it survives this force-push.

const fs = require('fs');
const path = require('path');
const { renderHtml, readJsonSafe } = require('./lib/render-dashboard');

const MAX_RUNS = 5;

const [
  resultsPath = 'test-report/results.json',
  reportDir = 'test-report',
  prevSiteDir = 'gh-pages',
  outDir = 'public',
] = process.argv.slice(2);

const {
  GITHUB_RUN_NUMBER,
  GITHUB_RUN_ID,
  GITHUB_REPOSITORY,
  GITHUB_SERVER_URL = 'https://github.com',
  GITHUB_SHA = '',
  GITHUB_EVENT_NAME = 'push',
  QA_BROWSER = 'chromium',
  QA_TAG = '',
} = process.env;

const runNumber = Number(GITHUB_RUN_NUMBER) || 0;
const repoUrl = GITHUB_REPOSITORY ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}` : '';

// Dashboard viewers care what browser ran, not which engine/binary implements it —
// "webkit" is Playwright's build name for the engine, but reads as "Safari" to everyone else.
const BROWSER_LABELS = { chromium: 'Chromium', firefox: 'Firefox', webkit: 'Safari', edge: 'Edge' };
const browserLabel = BROWSER_LABELS[QA_BROWSER] || QA_BROWSER;
const triggeredBy = GITHUB_EVENT_NAME === 'workflow_dispatch' ? 'Manual' : 'CI';

// The mutating / non-mutating split is a built-in phase every run applies, not a
// choice — so only surface the extra @tag filter typed into a manual run (blank
// on push events, where the whole suite runs in each phase). QA_TAG is a --grep
// regex, so a multi-tag run comes in as an alternation like "@smoke|@api" —
// split on "|" too so each tag gets its own chip.
const extraTags = QA_TAG.split(/[\s,|]+/)
  .map((t) => t.trim())
  .filter((t) => t && !/^@?(non-)?mutating$/i.test(t))
  .map((t) => (t.startsWith('@') ? t : `@${t}`));

function readStats() {
  try {
    const report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const s = report.stats || {};
    const passed = s.expected || 0;
    const failed = s.unexpected || 0;
    const flaky = s.flaky || 0;
    const skipped = s.skipped || 0;
    return {
      passed,
      failed,
      flaky,
      skipped,
      total: passed + failed + flaky + skipped,
      durationMs: Math.round(s.duration || 0),
      startTime: s.startTime || new Date().toISOString(),
      hasResults: true,
    };
  } catch (err) {
    console.warn(`Could not read ${resultsPath}: ${err.message} — recording the run with no results.`);
    return {
      passed: 0,
      failed: 0,
      flaky: 0,
      skipped: 0,
      total: 0,
      durationMs: 0,
      startTime: new Date().toISOString(),
      hasResults: false,
    };
  }
}

const stats = readStats();
const status = !stats.hasResults
  ? 'unknown'
  : stats.failed > 0
    ? 'failed'
    : stats.flaky > 0
      ? 'flaky'
      : 'passed';

const entry = {
  runNumber,
  runUrl: GITHUB_RUN_ID && repoUrl ? `${repoUrl}/actions/runs/${GITHUB_RUN_ID}` : '',
  shaShort: GITHUB_SHA.slice(0, 7),
  commitUrl: GITHUB_SHA && repoUrl ? `${repoUrl}/commit/${GITHUB_SHA}` : '',
  status,
  browser: browserLabel,
  triggeredBy,
  tags: extraTags,
  reportHref: `runs/${runNumber}/`,
  reportAvailable: fs.existsSync(reportDir),
  ...stats,
};

// Merge with the previously published run list.
const previous = readJsonSafe(path.join(prevSiteDir, 'data.json'), { runs: [] }).runs || [];

const runs = [entry, ...previous.filter((r) => r.runNumber !== runNumber)]
  .sort((a, b) => b.runNumber - a.runNumber)
  .slice(0, MAX_RUNS);

// Carried forward as-is — this script never computes triage counts, only
// whatever qa-triage.yml's publish-triage-metrics.js last published.
const triageHistory = readJsonSafe(path.join(prevSiteDir, 'triage-history.json'), []);

// Assemble the full site under outDir.
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'runs'), { recursive: true });
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

if (entry.reportAvailable) {
  fs.cpSync(reportDir, path.join(outDir, 'runs', String(runNumber)), { recursive: true });
}

for (const r of runs) {
  if (r.runNumber === runNumber) continue;
  const src = path.join(prevSiteDir, 'runs', String(r.runNumber));
  r.reportAvailable = fs.existsSync(src);
  if (r.reportAvailable) {
    fs.cpSync(src, path.join(outDir, 'runs', String(r.runNumber)), { recursive: true });
  }
}

fs.writeFileSync(
  path.join(outDir, 'data.json'),
  `${JSON.stringify({ updatedAt: new Date().toISOString(), runs }, null, 2)}\n`,
);
fs.writeFileSync(path.join(outDir, 'triage-history.json'), `${JSON.stringify(triageHistory, null, 2)}\n`);
fs.writeFileSync(
  path.join(outDir, 'index.html'),
  renderHtml({ runs, triageHistory, repoUrl, repository: GITHUB_REPOSITORY }),
);
writeJobSummary(entry);

console.log(`Dashboard built for run #${runNumber} (${status}); ${runs.length} run(s) retained.`);

function writeJobSummary(run) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const emoji = { passed: '✅', flaky: '⚠️', failed: '❌', unknown: '❓' }[run.status] || '❓';
  const [owner, repo] = (GITHUB_REPOSITORY || '/').split('/');
  const base = owner && repo ? `https://${owner.toLowerCase()}.github.io/${repo}/` : '';
  const dur = run.durationMs ? `${Math.round(run.durationMs / 1000)}s` : '—';
  const lines = [
    `## ${emoji} Playwright run #${run.runNumber} — ${run.status}`,
    '',
    '| Total | Passed | Failed | Flaky | Skipped | Duration |',
    '|------:|-------:|-------:|------:|--------:|---------:|',
    `| ${run.total} | ${run.passed} | ${run.failed || 0} | ${run.flaky || 0} | ${run.skipped || 0} | ${dur} |`,
    '',
  ];
  if (base) {
    lines.push(`- 📊 [Test dashboard (last ${MAX_RUNS} runs)](${base})`);
    lines.push(`- 📄 [Full report for this run](${base}runs/${run.runNumber}/)`);
  }
  lines.push('');
  fs.appendFileSync(file, lines.join('\n'));
}
