#!/usr/bin/env node
// After each main-branch run this rebuilds the GitHub Pages dashboard: a table of
// the last MAX_RUNS runs (counts + a link to that run's full Playwright HTML
// report) plus the reports themselves. It assembles the *complete* desired site
// under ./public — this run's report, the MAX_RUNS-1 most recent prior reports
// copied out of the existing gh-pages checkout, a regenerated index.html — and
// the workflow force-pushes that wholesale to gh-pages, so older runs are purged
// with no extra bookkeeping.

const fs = require('fs');
const path = require('path');

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
} = process.env;

const runNumber = Number(GITHUB_RUN_NUMBER) || 0;
const repoUrl = GITHUB_REPOSITORY ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}` : '';

function fmtTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

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
  reportHref: `runs/${runNumber}/`,
  reportAvailable: fs.existsSync(reportDir),
  ...stats,
};

// Merge with the previously published run list.
let previous = [];
try {
  previous = JSON.parse(fs.readFileSync(path.join(prevSiteDir, 'data.json'), 'utf8')).runs || [];
} catch {
  /* first run — no prior dashboard */
}

const runs = [entry, ...previous.filter((r) => r.runNumber !== runNumber)]
  .sort((a, b) => b.runNumber - a.runNumber)
  .slice(0, MAX_RUNS);

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
fs.writeFileSync(path.join(outDir, 'index.html'), renderHtml(runs));
writeJobSummary(entry);

console.log(`Dashboard built for run #${runNumber} (${status}); ${runs.length} run(s) retained.`);

// --- rendering -------------------------------------------------------------

function renderHtml(runList) {
  const latest = runList[0];
  const icon = { passed: '✔', flaky: '≈', failed: '✘', unknown: '?' };

  const rows = runList
    .map((r) => {
      const dur = r.durationMs ? `${Math.round(r.durationMs / 1000)}s` : '—';
      const runCell = r.runUrl ? `<a href="${r.runUrl}">#${r.runNumber}</a>` : `#${r.runNumber}`;
      const commitCell = r.commitUrl
        ? `<a href="${r.commitUrl}"><code>${r.shaShort}</code></a>`
        : `<code>${r.shaShort || '—'}</code>`;
      const reportCell = r.reportAvailable
        ? `<a class="report-link" href="${r.reportHref}">View report →</a>`
        : '<span class="muted">unavailable</span>';
      return `        <tr>
          <td><span class="pill ${r.status}">${icon[r.status] || '?'} ${r.status}</span></td>
          <td>${runCell}</td>
          <td class="muted nowrap">${fmtTime(r.startTime)}</td>
          <td>${commitCell}</td>
          <td class="num">${r.total}</td>
          <td class="num pass">${r.passed}</td>
          <td class="num ${r.failed ? 'fail' : 'muted'}">${r.failed || 0}</td>
          <td class="num ${r.flaky ? 'flaky' : 'muted'}">${r.flaky || 0}</td>
          <td class="num muted">${r.skipped || 0}</td>
          <td class="muted nowrap">${dur}</td>
          <td>${reportCell}</td>
        </tr>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Playwright Test Dashboard — qademo</title>
<style>
  :root {
    --bg: #fff; --fg: #1c2024; --muted: #6b7280; --border: #e5e7eb; --card: #f9fafb;
    --pass: #15803d; --fail: #b91c1c; --flaky: #b45309; --accent: #2563eb;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0d1117; --fg: #e6edf3; --muted: #8b949e; --border: #30363d; --card: #161b22;
      --pass: #3fb950; --fail: #f85149; --flaky: #d29922; --accent: #58a6ff;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 2rem 1.25rem 4rem; background: var(--bg); color: var(--fg);
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  main { max-width: 1000px; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
  .sub { color: var(--muted); margin: 0 0 1.75rem; font-size: .9rem; }
  a { color: var(--accent); }
  .summary { display: flex; flex-wrap: wrap; gap: .75rem; margin-bottom: 1.75rem; }
  .stat { flex: 1 1 120px; background: var(--card); border: 1px solid var(--border);
    border-radius: 10px; padding: .85rem 1rem; }
  .stat .label { font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
  .stat .value { font-size: 1.5rem; font-weight: 650; margin-top: .15rem; }
  .value.pass { color: var(--pass); } .value.fail { color: var(--fail); } .value.flaky { color: var(--flaky); }
  .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; }
  table { border-collapse: collapse; width: 100%; font-size: .9rem; }
  th, td { padding: .6rem .75rem; text-align: left; border-bottom: 1px solid var(--border); }
  th { font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); background: var(--card); }
  tr:last-child td { border-bottom: 0; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .nowrap { white-space: nowrap; }
  .muted { color: var(--muted); }
  .pass { color: var(--pass); } .fail { color: var(--fail); } .flaky { color: var(--flaky); }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .85em; }
  .report-link { font-weight: 600; text-decoration: none; white-space: nowrap; }
  .report-link:hover { text-decoration: underline; }
  .pill { display: inline-block; padding: .12rem .5rem; border-radius: 999px; font-size: .75rem;
    font-weight: 600; text-transform: capitalize; border: 1px solid currentColor; white-space: nowrap; }
  .pill.passed { color: var(--pass); } .pill.failed { color: var(--fail); }
  .pill.flaky { color: var(--flaky); } .pill.unknown { color: var(--muted); }
</style>
</head>
<body>
<main>
  <h1>Playwright Test Dashboard</h1>
  <p class="sub">
    <a href="${repoUrl || '#'}">${GITHUB_REPOSITORY || 'playwright-fullstack-test-framework'}</a>
    &nbsp;·&nbsp; last ${runList.length} run${runList.length === 1 ? '' : 's'} on <code>main</code>
    &nbsp;·&nbsp; updated ${fmtTime(new Date().toISOString())}
  </p>

  <section class="summary">
    <div class="stat"><div class="label">Latest run</div><div class="value">#${latest.runNumber}</div></div>
    <div class="stat"><div class="label">Total</div><div class="value">${latest.total}</div></div>
    <div class="stat"><div class="label">Passed</div><div class="value pass">${latest.passed}</div></div>
    <div class="stat"><div class="label">Failed</div><div class="value fail">${latest.failed || 0}</div></div>
    <div class="stat"><div class="label">Flaky</div><div class="value flaky">${latest.flaky || 0}</div></div>
    <div class="stat"><div class="label">Skipped</div><div class="value">${latest.skipped || 0}</div></div>
  </section>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Status</th><th>Run</th><th>Started</th><th>Commit</th>
          <th class="num">Total</th><th class="num">Pass</th><th class="num">Fail</th>
          <th class="num">Flaky</th><th class="num">Skip</th><th>Duration</th><th>Report</th>
        </tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>
</main>
</body>
</html>
`;
}

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
