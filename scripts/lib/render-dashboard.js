// Renders the GitHub Pages dashboard's index.html. Shared by two independent
// publishers that both mutate gh-pages:
//
//   - build-report-dashboard.js (playwright.yml) — publishes a new run row
//     after every Playwright run.
//   - publish-triage-metrics.js (qa-triage.yml)  — publishes the AI triage
//     decision counts for a run, asynchronously, sometime after its row exists.
//
// Neither owns the whole page, so both call renderHtml with whatever the
// *other* dataset currently is on gh-pages, unchanged, plus their own update.
// Keeping this in one module is what keeps the two renders from drifting.

const fs = require('fs');

// Trend-chart geometry — shared between the server-rendered SVG and the hover script.
const CHART = { W: 720, H: 240, mL: 34, mR: 52, mT: 14, mB: 30 };

function fmtTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

// `opts.runs` — the run-history rows (build-report-dashboard.js's `entry` shape).
// `opts.triageHistory` — AI triage decision counts, one entry per triaged run
//   (publish-triage-metrics.js's shape); omitted/empty renders no triage section.
// `opts.repoUrl` / `opts.repository` — for the header link; either may be ''.
function renderHtml({ runs: runList, triageHistory = [], repoUrl = '', repository = '' }) {
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
      const tagsCell =
        r.tags && r.tags.length
          ? r.tags.map((t) => `<span class="tag">${t}</span>`).join(' ')
          : '<span class="muted">—</span>';
      return `        <tr>
          <td><span class="pill ${r.status}">${icon[r.status] || '?'} ${r.status}</span></td>
          <td>${runCell}</td>
          <td class="muted nowrap">${fmtTime(r.startTime)}</td>
          <td>${commitCell}</td>
          <td class="nowrap">${r.browser || 'Chromium'}</td>
          <td class="nowrap">${r.triggeredBy || 'CI'}</td>
          <td>${tagsCell}</td>
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
    --yellow: #a16207; --orange: #c2410c;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0d1117; --fg: #e6edf3; --muted: #8b949e; --border: #30363d; --card: #161b22;
      --pass: #3fb950; --fail: #f85149; --fail-hatch: #ff9d97; --flaky: #d29922; --accent: #58a6ff;
      --yellow: #e3b341; --orange: #fb923c;
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
  .yellow { color: var(--yellow); } .orange { color: var(--orange); }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .85em; }
  .report-link { font-weight: 600; text-decoration: none; white-space: nowrap; }
  .report-link:hover { text-decoration: underline; }
  .pill { display: inline-block; padding: .12rem .5rem; border-radius: 999px; font-size: .75rem;
    font-weight: 600; text-transform: capitalize; border: 1px solid currentColor; white-space: nowrap; }
  .pill.passed { color: var(--pass); } .pill.failed { color: var(--fail); }
  .pill.flaky { color: var(--flaky); } .pill.unknown { color: var(--muted); }
  .tag { display: inline-block; padding: .08rem .45rem; border-radius: 6px; font-size: .78rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--card);
    border: 1px solid var(--border); color: var(--fg); white-space: nowrap; }
  .trends, .triage { margin-top: 2.25rem; }
  .trends h2, .triage h2 { font-size: 1rem; margin: 0 0 .25rem; }
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
  .triage-tree td:first-child { font-weight: 650; }
  .triage-tree .t-child td:first-child { padding-left: 1.4rem; }
  .triage-tree .t-grandchild td:first-child { padding-left: 2.8rem; color: var(--muted); }
  .triage-tree .branch { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin-right: .3rem; }
</style>
</head>
<body>
<main>
  <h1>Playwright Test Dashboard</h1>
  <p class="sub">
    <a href="${repoUrl || '#'}">${repository || 'playwright-fullstack-test-framework'}</a>
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
          <th>Status</th><th>Run</th><th>Started</th><th>Commit</th><th>Browser</th><th>Triggered by</th><th>Tags</th>
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
${triageSection(triageHistory, repoUrl)}
</main>
${trendScript(ordered)}
</body>
</html>
`;
}

// One row per breakdown level, indentation + tree connectors showing the two
// identities directly: New failures = Script errors + Issues filed, and
// Issues filed = Valid bugs + Unsure. Counts are *new-this-run* only, summed
// across triageHistory — a still-open issue from an earlier run was never
// recounted in a later one, so the sum can't double-count it.
function triageSection(triageHistory, repoUrl) {
  if (!triageHistory || !triageHistory.length) return '';
  const totals = triageHistory.reduce(
    (acc, r) => {
      acc.newFailures += r.newFailures || 0;
      acc.scriptErrors += r.scriptErrors || 0;
      acc.issuesFiled += r.issuesFiled || 0;
      acc.validBugs += r.validBugs || 0;
      acc.unsure += r.unsure || 0;
      return acc;
    },
    { newFailures: 0, scriptErrors: 0, issuesFiled: 0, validBugs: 0, unsure: 0 },
  );
  const n = triageHistory.length;
  return `  <section class="triage">
    <h2>AI Triage Decisions · last ${n} triaged run${n === 1 ? '' : 's'}</h2>
    <p class="cap">New findings only — a still-open issue from an earlier run isn't recounted just
      because it's still open. New failures = Script errors + Issues filed. Issues filed = Valid
      bugs + Unsure.</p>
    <div class="table-wrap">
      <table class="triage-tree">
        <thead><tr><th>Decision</th><th class="num">Count</th></tr></thead>
        <tbody>
          <tr class="t-root"><td>New failures</td><td class="num yellow">${totals.newFailures}</td></tr>
          <tr class="t-child"><td><span class="branch">├─</span> Script errors</td><td class="num pass">${totals.scriptErrors}</td></tr>
          <tr class="t-child"><td><span class="branch">└─</span> Issues filed</td><td class="num yellow">${totals.issuesFiled}</td></tr>
          <tr class="t-grandchild"><td><span class="branch">├─</span> Valid bugs</td><td class="num fail">${totals.validBugs}</td></tr>
          <tr class="t-grandchild"><td><span class="branch">└─</span> Unsure</td><td class="num orange">${totals.unsure}</td></tr>
        </tbody>
      </table>
    </div>
${
      repoUrl
        ? `    <p class="cap">
      <a class="report-link" href="${repoUrl}/issues?q=${encodeURIComponent('is:issue state:open label:qa-triage')}">Open qa-triage issues →</a>
      &nbsp;·&nbsp;
      <a class="report-link" href="${repoUrl}/pulls?q=${encodeURIComponent('is:pr state:open label:qa-triage')}">Open qa-triage PRs →</a>
    </p>
`
        : ''
    }  </section>
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

// Reads a JSON file, returning `fallback` (default undefined) if it's absent
// or unparsable. Shared by both publishers for the "carry forward whatever
// the other one last wrote" reads.
function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

module.exports = { renderHtml, readJsonSafe, fmtTime };
