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

// Trend-chart geometry — shared between the server-rendered SVG and the hover script.
const CHART = { W: 720, H: 240, mL: 34, mR: 52, mT: 14, mB: 30 };

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
  const ordered = [...runList].sort((a, b) => a.runNumber - b.runNumber);
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
    --pass: #15803d; --fail: #b91c1c; --fail-hatch: #7f1d1d; --flaky: #b45309; --accent: #2563eb;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0d1117; --fg: #e6edf3; --muted: #8b949e; --border: #30363d; --card: #161b22;
      --pass: #3fb950; --fail: #f85149; --fail-hatch: #ff9d97; --flaky: #d29922; --accent: #58a6ff;
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
  .trends { margin-top: 2.25rem; }
  .trends h2 { font-size: 1rem; margin: 0 0 .25rem; }
  .cap { color: var(--muted); font-size: .82rem; margin: 0 0 .9rem; max-width: 68ch; }
  .c-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.1rem 1.1rem; }
  .c-legend { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: .5rem; font-size: .8rem; color: var(--muted); }
  .c-legend span { display: inline-flex; align-items: center; gap: .4rem; }
  .c-sw { width: 12px; height: 12px; border-radius: 3px; flex: none; }
  .c-sw.pass { background: var(--pass); }
  .c-sw.fail { background: var(--fail);
    background-image: repeating-linear-gradient(45deg, var(--fail-hatch) 0 1.5px, transparent 1.5px 4px); }
  .c-sw.total { background: transparent; border: 2px solid var(--accent); }
  .c-frame { position: relative; }
  .c-chart { display: block; width: 100%; height: auto; overflow: visible; }
  .c-chart text { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .c-grid { stroke: var(--border); stroke-width: 1; opacity: .7; }
  .c-tick { fill: var(--muted); font-size: 10px; }
  .c-green { fill: var(--pass); }
  .c-line { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; }
  .c-dot-total { fill: var(--accent); }
  .c-total-label { fill: var(--accent); font-size: 11px; font-weight: 600; }
  .c-pass-label { fill: var(--pass); font-size: 10px; font-weight: 500; }
  .c-cross { stroke: var(--fg); stroke-width: 1; stroke-dasharray: 3 3; opacity: .45; }
  .c-cross-dot { fill: var(--accent); stroke: var(--card); stroke-width: 1.5; }
  .c-hide { display: none; }
  .c-tip { position: absolute; top: 4px; left: 0; pointer-events: none; opacity: 0; transition: opacity .1s ease;
    background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: .55rem .65rem;
    font-size: .78rem; min-width: 142px; box-shadow: 0 6px 22px rgba(0, 0, 0, .14); z-index: 3; }
  .c-tip.on { opacity: 1; }
  .c-tip h4 { margin: 0 0 .35rem; font-size: .8rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .c-tip dl { margin: 0; display: grid; grid-template-columns: 1fr auto; gap: .15rem .8rem; }
  .c-tip dt { color: var(--muted); display: flex; align-items: center; gap: .35rem; }
  .c-tip dd { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }
  .c-mini { width: 8px; height: 8px; border-radius: 2px; flex: none; display: inline-block; }
  .c-mini.pass { background: var(--pass); } .c-mini.fail { background: var(--fail); }
  .c-mini.flaky { background: var(--flaky); } .c-mini.skip { background: var(--muted); }
  .c-tip .rule { grid-column: 1 / -1; border-top: 1px solid var(--border); margin: .22rem 0; }
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

  <section class="trends">
    <h2>Trend · last ${ordered.length} run${ordered.length === 1 ? '' : 's'}</h2>
    <p class="cap">The line is the total test count. Green is passing; the hatched wedge up to the line is
      everything not passing. Hover a run for the full split, flaky included.</p>
    <div class="c-card">
      <div class="c-legend">
        <span><span class="c-sw total"></span>Total tests</span>
        <span><span class="c-sw pass"></span>Passed</span>
        <span><span class="c-sw fail"></span>Not passed</span>
      </div>
      <div class="c-frame">
        ${deficitChart(ordered)}
        <div class="c-tip" id="trendTip" aria-hidden="true"></div>
      </div>
    </div>
  </section>
</main>
${trendScript(ordered)}
</body>
</html>
`;
}

function chartMax(rl) {
  return niceMax(Math.max(1, ...rl.map((r) => r.total || 0)));
}

// Inline "deficit band" SVG — one green area for passed, a hatched wedge up to the
// total line for everything not passing. No dependencies; styled via the page's
// CSS classes so it stays theme-aware. `rl` runs oldest → newest.
function deficitChart(rl) {
  const { W, H, mL, mR, mT, mB } = CHART;
  const pw = W - mL - mR;
  const ph = H - mT - mB;
  const n = rl.length;
  if (n < 2) {
    return '<p class="cap">The trend chart appears once there are at least 2 runs.</p>';
  }
  const max = chartMax(rl);
  const x = (i) => mL + (i / (n - 1)) * pw;
  const y = (v) => mT + ph - (v / max) * ph;
  const px = (i) => x(i).toFixed(1);
  const passY = (i) => y(rl[i].passed || 0).toFixed(1);
  const totalY = (i) => y(rl[i].total || 0).toFixed(1);
  const baseY = y(0).toFixed(1);

  const grid = [0, max / 2, max]
    .map(
      (v) =>
        `<line class="c-grid" x1="${mL}" y1="${y(v).toFixed(1)}" x2="${mL + pw}" y2="${y(v).toFixed(1)}"/>` +
        `<text class="c-tick" x="${mL - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${Math.round(v)}</text>`,
    )
    .join('');

  const xticks = rl
    .map((r, i) => `<text class="c-tick" x="${px(i)}" y="${H - 9}" text-anchor="middle">#${r.runNumber}</text>`)
    .join('');

  const idx = rl.map((_, i) => i);
  const greenTop = idx.map((i) => `${px(i)},${passY(i)}`).join(' L ');
  const green = `M ${greenTop} L ${px(n - 1)},${baseY} L ${px(0)},${baseY} Z`;
  const redTop = idx.map((i) => `${px(i)},${totalY(i)}`).join(' L ');
  const redBottom = [...idx].reverse().map((i) => `${px(i)},${passY(i)}`).join(' L ');
  const red = `M ${redTop} L ${redBottom} Z`;
  const line = `M ${redTop}`;

  const last = n - 1;
  const totalLabel = `<text class="c-total-label" x="${mL + pw + 6}" y="${(y(rl[last].total || 0) - 7).toFixed(1)}">${rl[last].total || 0}</text>`;
  const passBandPx = y(0) - y(rl[last].passed || 0);
  const passLabel =
    passBandPx > 24
      ? `<text class="c-pass-label" x="${mL + pw + 6}" y="${(y((rl[last].passed || 0) / 2) + 3).toFixed(1)}">Passed ${rl[last].passed || 0}</text>`
      : '';

  return `<svg class="c-chart" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="cDesc" id="trendChart">
  <desc id="cDesc">Total tests rise to ${rl[last].total || 0}; ${rl[last].passed || 0} passing on the latest run.</desc>
  <defs>
    <pattern id="failHatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="5" fill="var(--fail)"/>
      <rect width="1.6" height="5" fill="var(--fail-hatch)"/>
    </pattern>
  </defs>
  ${grid}
  ${xticks}
  <path class="c-green" d="${green}"/>
  <path d="${red}" fill="url(#failHatch)"/>
  <path class="c-line" d="${line}"/>
  <circle class="c-dot-total" cx="${px(last)}" cy="${totalY(last)}" r="3.2"/>
  ${totalLabel}
  ${passLabel}
  <line class="c-cross c-hide" id="trendCross" y1="${mT}" y2="${mT + ph}"/>
  <circle class="c-cross-dot c-hide" id="trendCrossDot" r="4"/>
</svg>`;
}

// Client-side crosshair + tooltip. Returns '' when there is nothing to plot.
function trendScript(rl) {
  if (rl.length < 2) return '';
  const data = rl.map((r) => ({
    r: r.runNumber,
    t: r.total || 0,
    p: r.passed || 0,
    f: r.failed || 0,
    k: r.flaky || 0,
    s: r.skipped || 0,
  }));
  const cfg = { ...CHART, max: chartMax(rl) };
  return `<script>
(function () {
  var R = ${JSON.stringify(data)};
  var C = ${JSON.stringify(cfg)};
  var n = R.length;
  var pw = C.W - C.mL - C.mR, ph = C.H - C.mT - C.mB;
  var svg = document.getElementById('trendChart');
  var tip = document.getElementById('trendTip');
  var cross = document.getElementById('trendCross');
  var cdot = document.getElementById('trendCrossDot');
  if (!svg || !tip) return;
  var frame = svg.parentNode;
  function xAt(i) { return C.mL + (i / (n - 1)) * pw; }
  function yAt(v) { return C.mT + ph - (v / C.max) * ph; }
  function move(evt) {
    var box = svg.getBoundingClientRect();
    var mx = (evt.clientX - box.left) / box.width * C.W;
    var i = Math.round((mx - C.mL) / (pw / (n - 1)));
    i = Math.max(0, Math.min(n - 1, i));
    var d = R[i];
    var rate = d.t ? (d.p / d.t * 100).toFixed(1) : '0.0';
    cross.setAttribute('x1', xAt(i)); cross.setAttribute('x2', xAt(i));
    cdot.setAttribute('cx', xAt(i)); cdot.setAttribute('cy', yAt(d.t));
    cross.classList.remove('c-hide'); cdot.classList.remove('c-hide');
    tip.innerHTML = '<h4>Run #' + d.r + '</h4><dl>'
      + '<dt>Total</dt><dd>' + d.t + '</dd>'
      + '<div class="rule"></div>'
      + '<dt><span class="c-mini pass"></span>Passed</dt><dd>' + d.p + '</dd>'
      + '<dt><span class="c-mini fail"></span>Failed</dt><dd>' + d.f + '</dd>'
      + '<dt><span class="c-mini flaky"></span>Flaky</dt><dd>' + d.k + '</dd>'
      + '<dt><span class="c-mini skip"></span>Skipped</dt><dd>' + d.s + '</dd>'
      + '<div class="rule"></div>'
      + '<dt>Pass rate</dt><dd>' + rate + '%</dd></dl>';
    tip.classList.add('on');
    var fr = frame.getBoundingClientRect();
    var lx = evt.clientX - fr.left;
    var tw = tip.offsetWidth;
    var left = i > (n - 1) / 2 ? lx - tw - 16 : lx + 16;
    tip.style.left = Math.max(4, Math.min(left, fr.width - tw - 4)) + 'px';
  }
  function leave() { tip.classList.remove('on'); cross.classList.add('c-hide'); cdot.classList.add('c-hide'); }
  svg.addEventListener('mousemove', move);
  svg.addEventListener('mouseleave', leave);
  svg.addEventListener('touchstart', function (e) { if (e.touches[0]) move(e.touches[0]); }, { passive: true });
  svg.addEventListener('touchmove', function (e) { if (e.touches[0]) move(e.touches[0]); }, { passive: true });
})();
</script>`;
}

function niceMax(v) {
  if (v <= 5) return Math.max(1, v);
  const pow = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / pow) * pow;
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
