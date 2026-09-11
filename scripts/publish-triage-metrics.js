#!/usr/bin/env node
// Rolls one qa-triage run's AI decisions into gh-pages/triage-history.json and
// regenerates index.html in place. Called once at the end of the
// qa-results-analysis job (qa-triage.yml), including when it found nothing new
// — a zero entry is still a real data point, distinct from a run where triage
// never ran at all (a clean Playwright pass skips that job entirely).
//
// Counts are new-this-run only, by construction of the triage prompt: a
// failure whose cause is already tracked is a match in Step 1 and never
// reaches Step 2's classification, so it's never counted here either. That's
// what makes summing this file's entries across runs safe — a still-open
// issue from an earlier run is never recounted just because a later run saw
// it again.
//
// Derivation, from what the triage prompt already puts in a PR's
// `## Triage metadata` block (qa-results-analysis.md Step 3/3b):
//   - a `qa-triage:triage` PR's `issues:` line has one issue per product-bug
//     group -> its length is this run's validBugs contribution.
//   - that PR's `script-issue-groups: N` line is this run's scriptErrors
//     contribution (script-issue groups never get an issue, so there's
//     nothing else to count them from).
//   - a `qa-triage:decision` PR's `issues:` line has one issue per
//     infra-flake/inconclusive group -> its length is this run's unsure
//     contribution.
// issuesFiled and newFailures are derived sums, not independently trusted.
//
// Known gap: Step 2's "folded into #N" case (a new failure sharing an
// already-tracked cause) comments on the existing issue but opens no new
// PR/issue, so it isn't counted here. Rare in practice; revisit if it turns
// out to matter.
//
// Usage:
//   node scripts/publish-triage-metrics.js <prs.json> <siteDir>
//
//   <prs.json> — `gh pr list --state open --label qa-triage
//                 --json number,title,body,labels`
//   <siteDir>  — a gh-pages checkout, mutated in place: reads data.json (for
//                the run list index.html also needs) and triage-history.json
//                (prior entries), writes both triage-history.json and
//                index.html back into the same directory. Left to the caller
//                to git-add/commit/push.
//
// Two different numbers identify "this run", and neither is this script's own
// GITHUB_RUN_NUMBER (that would be qa-triage.yml's *own* run, not the
// Playwright run it's reacting to):
//   - UPSTREAM_RUN_ID     — github.event.workflow_run.id — what the triage
//                            prompt puts in PR titles ("run #<RUN ID>").
//                            Used here to find *this* run's own PRs.
//   - UPSTREAM_RUN_NUMBER — github.event.workflow_run.run_number — matches
//                            the key build-report-dashboard.js already uses
//                            for data.json's runs[].runNumber. Used here as
//                            triage-history.json's own dedup/prune key so a
//                            re-run overwrites its own entry instead of
//                            appending a duplicate.

const fs = require('fs');
const path = require('path');
const { renderHtml, readJsonSafe } = require('./lib/render-dashboard');

const MAX_TRIAGE_RUNS = 5;

const [prsPath, siteDir = 'gh-pages'] = process.argv.slice(2);
const {
  UPSTREAM_RUN_ID,
  UPSTREAM_RUN_NUMBER,
  GITHUB_REPOSITORY,
  GITHUB_SERVER_URL = 'https://github.com',
} = process.env;

const runId = UPSTREAM_RUN_ID || '';
const runNumber = Number(UPSTREAM_RUN_NUMBER) || 0;
const repoUrl = GITHUB_REPOSITORY ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}` : '';

// --- parsing the `## Triage metadata` block --------------------------------
// Mirrors build-tracking-inventory.js's blockLines/metadataIssues — kept as a
// separate small copy rather than a shared import so each script's one job
// (tracking-inventory vs. metrics) stays independently readable; they read
// the same heading by coincidence of the prompt's format, not by contract.

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

function metadataIssues(body) {
  for (const raw of blockLines(body, 'Triage metadata')) {
    const m = raw.match(/^\s*issues:\s*(.*)$/i);
    if (!m) continue;
    return [...m[1].matchAll(/#(\d+)/g)].map((x) => Number(x[1]));
  }
  return [];
}

function scriptIssueGroupCount(body) {
  for (const raw of blockLines(body, 'Triage metadata')) {
    const m = raw.match(/^\s*script-issue-groups:\s*(\d+)/i);
    if (m) return Number(m[1]);
  }
  return 0;
}

function prLabels(pr) {
  return (pr.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
}

// --- this run's own PRs only -------------------------------------------------
// PR titles are "QA triage — run #<RUN ID>" / "QA triage decision — run
// #<RUN ID>" (qa-triage.yml's "Analyze test failures" step) — RUN ID, not RUN
// NUMBER. Matching on that, not label alone, keeps an older still-open
// decision PR from a prior run out of this run's count.

const allPrs = readJsonSafe(prsPath, []);
const titleRe = new RegExp(`run #${runId}(\\D|$)`);
const thisRunPrs = runId ? allPrs.filter((pr) => titleRe.test(pr.title || '')) : [];

let validBugs = 0;
let unsure = 0;
let scriptErrors = 0;
for (const pr of thisRunPrs) {
  const labels = prLabels(pr);
  if (labels.includes('qa-triage:decision')) {
    unsure += metadataIssues(pr.body).length;
  } else if (labels.includes('qa-triage:triage')) {
    validBugs += metadataIssues(pr.body).length;
    scriptErrors += scriptIssueGroupCount(pr.body);
  }
}

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
// it's missing, this triage job somehow ran before any dashboard publish ever
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
