#!/usr/bin/env node
// Rolls one qa-triage run's AI decisions into gh-pages/triage-history.json and
// regenerates index.html in place. Called once by the publish-triage-metrics
// job (qa-triage.yml), which only runs on a failing run, after
// qa-results-analysis — a zero entry (triage ran, found nothing new) is still
// a real data point, distinct from a passing run where triage never runs at
// all and this job doesn't either.
//
// Ground truth, not self-reported counts:
//   - validBugs / unsure come straight from GitHub's own state. Every issue
//     qa-results-analysis files carries `qa-triage` plus its type label
//     (`qa-triage:triage` for a product-bug issue, `qa-triage:decision` for
//     an infra-flake/inconclusive one) and a `Run: #<RUN ID>` line in the
//     body (qa-results-analysis.md Step 3.3 / Step 3b.3). So "how many valid
//     bugs this run" is just "how many qa-triage:triage issues carry this
//     run's tag" — no PR-body parsing, and no risk of a folded-into-#N
//     reference leaking in, since a folded-in issue carries an *older* run's
//     tag, not this one's.
//   - scriptErrors has no issue to check against (a script-issue group never
//     gets one), so it's the one number still read out of the combined PR's
//     own `script-issue-groups:` line — self-reported, but it's the only
//     thing here without a GitHub object to verify it against.
// issuesFiled and newFailures are derived sums, not independently trusted.
//
// Usage:
//   node scripts/publish-triage-metrics.js <issues.json> <prs.json> <siteDir>
//
//   <issues.json> — `gh issue list --state open --label qa-triage
//                    --json number,body,labels`
//   <prs.json>    — `gh pr list --state open --label qa-triage
//                    --json number,title,body,labels`
//   <siteDir>     — a gh-pages checkout, mutated in place: reads data.json
//                   (for the run list index.html also needs) and
//                   triage-history.json (prior entries), writes both
//                   triage-history.json and index.html back into the same
//                   directory. Left to the caller to git-add/commit/push.
//
// UPSTREAM_RUN_ID (github.event.workflow_run.id) is what both the `Run:
// #<RUN ID>` issue tag and the PR title ("run #<RUN ID>") carry — used here
// to scope everything to this run. UPSTREAM_RUN_NUMBER
// (github.event.workflow_run.run_number) is a different number — it matches
// the key build-report-dashboard.js uses for data.json's runs[].runNumber —
// used here only as triage-history.json's own dedup/prune key, never for
// matching. Neither is this script's own GITHUB_RUN_NUMBER, which would be
// qa-triage.yml's *own* run, not the Playwright run it's reacting to.

const fs = require('fs');
const path = require('path');
const { renderHtml, readJsonSafe } = require('./lib/render-dashboard');

const MAX_TRIAGE_RUNS = 5;

const [issuesPath, prsPath, siteDir = 'gh-pages'] = process.argv.slice(2);
const {
  UPSTREAM_RUN_ID,
  UPSTREAM_RUN_NUMBER,
  GITHUB_REPOSITORY,
  GITHUB_SERVER_URL = 'https://github.com',
} = process.env;

const runId = UPSTREAM_RUN_ID || '';
const runNumber = Number(UPSTREAM_RUN_NUMBER) || 0;
const repoUrl = GITHUB_REPOSITORY ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}` : '';

function labelsOf(item) {
  return (item.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
}

// --- valid bugs / unsure: straight from the issue list -----------------------
// `Run: #<RUN ID>` is a plain line in the body (qa-results-analysis.md Step
// 3.3 / 3b.3) — matched with a word boundary after the digits so run 4 can't
// match a body tagged run 42.

const runTagRe = new RegExp(`Run:\\s*#${runId}(\\D|$)`);
const allIssues = readJsonSafe(issuesPath, []);
const thisRunIssues = runId ? allIssues.filter((it) => runTagRe.test(it.body || '')) : [];

const validBugs = thisRunIssues.filter((it) => labelsOf(it).includes('qa-triage:triage')).length;
const unsure = thisRunIssues.filter((it) => labelsOf(it).includes('qa-triage:decision')).length;

// --- script errors: the one count with no issue to check against ------------
// PR titles are "QA triage — run #<RUN ID>" (qa-triage.yml's "Analyze test
// failures" step) — there's at most one qa-triage:triage PR per run (Step 3
// combines every confident group into a single PR).

function blockLines(body, heading) {
  const lines = String(body || '').split('\n');
  const start = lines.findIndex((l) => new RegExp(`^#+\\s*${heading}\\s*$`, 'i').test(l));
  if (start === -1) return [];
  const out = [];
  for (const raw of lines.slice(start + 1)) {
    if (/^#+\s/.test(raw)) break; // next heading ends the block
    out.push(raw);
  }
  return out;
}

function scriptIssueGroupCount(body) {
  for (const raw of blockLines(body, 'Triage metadata')) {
    const m = raw.match(/^\s*script-issue-groups:\s*(\d+)/i);
    if (m) return Number(m[1]);
  }
  return 0;
}

const allPrs = readJsonSafe(prsPath, []);
const titleRe = new RegExp(`run #${runId}(\\D|$)`);
const triagePr = runId
  ? allPrs.find((pr) => titleRe.test(pr.title || '') && labelsOf(pr).includes('qa-triage:triage'))
  : undefined;
const scriptErrors = triagePr ? scriptIssueGroupCount(triagePr.body) : 0;

const issuesFiled = validBugs + unsure;
const newFailures = issuesFiled + scriptErrors;

const entry = { runNumber, newFailures, scriptErrors, issuesFiled, validBugs, unsure };

// --- merge into triage-history.json, prune, re-render -----------------------

const previousTriage = readJsonSafe(path.join(siteDir, 'triage-history.json'), []);
const triageHistory = [entry, ...previousTriage.filter((r) => r.runNumber !== runNumber)]
  .sort((a, b) => b.runNumber - a.runNumber)
  .slice(0, MAX_TRIAGE_RUNS);

// data.json is someone else's data (build-report-dashboard.js's run rows) —
// read whatever's currently there so index.html can be regenerated whole; if
// it's missing, this job somehow ran before any dashboard publish ever
// happened, which shouldn't occur (qa-triage.yml only fires after
// playwright.yml's own dashboard step, which runs `if: always()`).
const runs = readJsonSafe(path.join(siteDir, 'data.json'), { runs: [] }).runs || [];

fs.writeFileSync(path.join(siteDir, 'triage-history.json'), `${JSON.stringify(triageHistory, null, 2)}\n`);

if (runs.length) {
  fs.writeFileSync(
    path.join(siteDir, 'index.html'),
    renderHtml({ runs, triageHistory, repoUrl, repository: GITHUB_REPOSITORY }),
  );
} else {
  console.warn('No data.json runs found in siteDir — skipping index.html regeneration.');
}

console.log(
  `Triage metrics recorded for run #${runNumber}: ${newFailures} new failure(s) ` +
    `(${scriptErrors} script error(s), ${issuesFiled} issue(s) filed — ` +
    `${validBugs} valid bug(s), ${unsure} unsure).`,
);
