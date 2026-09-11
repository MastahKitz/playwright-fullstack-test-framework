#!/usr/bin/env node
// Replaces the qa-issue-marker-cleanup job's Claude Code Action step. Its
// decision logic (§4 of docs/workflow-redesign.md, formerly
// .github/prompts/qa-issue-marker-cleanup.md) is pure table-lookup and
// set-membership — no case where a model's judgment changes the outcome —
// so it runs as a plain script instead. Same inputs, same three-step logic,
// same PR/issue-comment templates; this file is the single source of truth
// for that logic now, not the deleted prompt.
//
// One job: find `// KNOWN-FAILURE(#N):` markers whose guarded test passed
// cleanly in this run, open a single PR that removes them, and reconcile the
// issues they were linked to (close if every marker for that issue cleared
// and no unmerged PR is about to re-add one, otherwise comment). Never adds
// markers, never edits test logic, never files issues, never pushes to main.
//
// Usage:
//   RUN_ID=<workflow_run.id> RUN_URL=<workflow_run.html_url> GH_TOKEN=... \
//     node scripts/cleanup-fully-fixed-issue-markers.js <tracking-inventory.json> <results.json>
//
// tracking-inventory.json — from build-tracking-inventory.js (markers / issues /
//   triage_prs / decision_prs / cleanup_prs, all keyed on spec + title).
// results.json — the Playwright JSON reporter output for this run.
//
// Performs its own git (branch/commit/push) and gh (pr create/issue comment)
// calls — this script *is* the job, not a data-transform step for the
// workflow YAML to act on afterward. Run on a checkout already at the
// upstream commit (qa-triage.yml's `ref: head_sha`); only creates a branch
// off it, never touches main directly.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { MARKER_LINE_RE } = require('./lib/known-failure-marker');
const { buildStatusMap, statusKey } = require('./lib/results-report');

const [inventoryPath, resultsPath] = process.argv.slice(2);
const { RUN_ID = '', RUN_URL = '', GH_TOKEN = '', GITHUB_REPOSITORY = '' } = process.env;

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const inventory = readJson(inventoryPath);
const statusMap = buildStatusMap(readJson(resultsPath));

const markerKey = (m) => `${m.file}:${m.line}`;
const testKey = (t) => statusKey(t.spec, t.title);

// --- Step 1: fate of each marker --------------------------------------------
//
//   expected (passed, first try) → remove — candidate for the PR
//   flaky    (passed on retry)   → keep, "still flaky in run #<RUN ID>"
//   unexpected (failed)          → keep, "still failing"
//   skipped / absent             → keep, "not exercised in run #<RUN ID>"
//   malformed (test: null)       → left alone, reported only — never a candidate

function classify(marker) {
  if (marker.malformed) return { category: 'malformed', detail: marker.malformed };
  const status = statusMap.get(testKey(marker.test));
  if (status === 'expected') return { category: 'cleared' };
  if (status === 'flaky') return { category: 'keep', reason: `still flaky in run #${RUN_ID}` };
  if (status === 'unexpected') return { category: 'keep', reason: 'still failing' };
  return { category: 'keep', reason: `not exercised in run #${RUN_ID}` };
}

const classified = inventory.markers.map((marker) => ({ marker, ...classify(marker) }));

for (const c of classified) {
  const id = c.marker.test ? `${c.marker.test.spec} :: ${c.marker.test.title}` : `${c.marker.file}:${c.marker.line}`;
  console.log(`marker #${c.marker.issue} (${id}): ${c.category}${c.reason ? ` — ${c.reason}` : ''}`);
}

const clearedThisRun = classified.filter((c) => c.category === 'cleared');
if (clearedThisRun.length === 0) {
  console.log('No markers cleared this run — nothing to do.');
  process.exit(0);
}

// --- Step 2 (dedup half): drop markers an already-open cleanup PR handles --

const alreadyPendingIn = new Map(); // markerKey → cleanup PR number
for (const pr of inventory.cleanup_prs || []) {
  for (const t of pr.tests || []) {
    for (const c of clearedThisRun) {
      if (c.marker.test.spec === t.spec && c.marker.test.title === t.title) {
        alreadyPendingIn.set(markerKey(c.marker), pr.number);
      }
    }
  }
}

const removals = clearedThisRun.filter((c) => !alreadyPendingIn.has(markerKey(c.marker)));
if (removals.length === 0) {
  console.log('Every cleared marker is already being removed by an open cleanup PR — nothing to do.');
  process.exit(0);
}

// --- Step 2 (removal half): delete each cleared marker's comment line ------
//
// Delete bottom-up per file so an earlier deletion never shifts a later
// line's index. Verify each line still looks like a marker before touching
// it — belt and suspenders against inventory/working-tree drift.

const byFile = new Map();
for (const c of removals) {
  if (!byFile.has(c.marker.file)) byFile.set(c.marker.file, []);
  byFile.get(c.marker.file).push(c.marker);
}

for (const [file, markers] of byFile) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const marker of markers.sort((a, b) => b.line - a.line)) {
    const idx = marker.line - 1;
    if (!MARKER_LINE_RE.test(lines[idx] || '')) {
      throw new Error(
        `${file}:${marker.line} no longer looks like a KNOWN-FAILURE marker ` +
          `(working tree drifted from tracking-inventory.json) — aborting`,
      );
    }
    lines.splice(idx, 1);
  }
  fs.writeFileSync(file, lines.join('\n'));
}

// --- Step 3: which issues does this PR get to close? ------------------------
//
// For each distinct #N referenced by a removed marker, its full marker set is
// every markers[] entry with issue == N (not just the ones this PR removes).
// Close #N only if every marker in that set was cleared *and* removed by this
// PR (a malformed marker, or one pending in a different open PR, blocks it),
// and no unmerged triage/decision PR is about to add another marker for #N.

const removalKeys = new Set(removals.map((c) => markerKey(c.marker)));
const issueNumbers = [...new Set(removals.map((c) => c.marker.issue))].sort((a, b) => a - b);
const openIssueNumbers = new Set((inventory.issues || []).map((it) => it.number));
const referencedByOpenPr = new Set(
  [...(inventory.triage_prs || []), ...(inventory.decision_prs || [])].flatMap((pr) => pr.issues || []),
);

const closesIssues = [];
const issueComments = []; // { number, body } — PR URL filled in after PR creation

for (const issueNumber of issueNumbers) {
  const fullSet = inventory.markers.filter((m) => m.issue === issueNumber);

  if (!openIssueNumbers.has(issueNumber)) {
    console.log(`issue #${issueNumber}: already closed — no Closes line, no comment.`);
    continue;
  }

  const allClear = fullSet.every((m) => removalKeys.has(markerKey(m)));
  if (allClear && !referencedByOpenPr.has(issueNumber)) {
    closesIssues.push(issueNumber);
    continue;
  }

  const clearedLines = [];
  const notClearedLines = [];
  for (const m of fullSet) {
    const line = `- ${m.file}:${m.line} — ${m.test ? `${m.test.spec} :: ${m.test.title}` : '(malformed marker)'}`;
    if (removalKeys.has(markerKey(m))) {
      clearedLines.push(line);
    } else {
      const reason = m.malformed
        ? `malformed marker — ${m.malformed}`
        : alreadyPendingIn.has(markerKey(m))
          ? `pending in PR #${alreadyPendingIn.get(markerKey(m))}`
          : classified.find((c) => markerKey(c.marker) === markerKey(m))?.reason || 'not cleared this run';
      notClearedLines.push(`${line} — ${reason}`);
    }
  }
  // allClear-but-blocked (every marker cleared, only an open triage/decision PR
  // reference is holding the close back) leaves notClearedLines empty — the
  // plain template gives no reason in that case, so add one.
  const blockedByOpenPrNote =
    allClear && referencedByOpenPr.has(issueNumber)
      ? "All of this issue's markers cleared, but an open triage/decision PR still references " +
        '#' +
        issueNumber +
        ' with a pending new marker — leaving it open until that PR merges or closes.'
      : '';

  issueComments.push({ number: issueNumber, clearedLines, notClearedLines, blockedByOpenPrNote });
}

// --- Build the PR body -------------------------------------------------------
//
// `## Triage metadata` (issues:) and `## Affected tests` are parsed back out
// of this PR's body by build-tracking-inventory.js on every future run (the
// Step 2 dedup check above, and this same check on the *next* run) — keep
// their exact heading text and line format.

const affectedTests = [...new Map(removals.map((c) => [testKey(c.marker.test), c.marker.test])).values()].sort(
  (a, b) => (a.spec + a.title).localeCompare(b.spec + b.title),
);

const markerDetails = removals
  .slice()
  .sort((a, b) => a.marker.file.localeCompare(b.marker.file) || a.marker.line - b.marker.line)
  .map(
    (c) =>
      `- \`${c.marker.file}:${c.marker.line}\` — ${c.marker.test.spec} :: ${c.marker.test.title} — ` +
      `${c.marker.reason} (#${c.marker.issue}) — passed clean in run #${RUN_ID} — ${RUN_URL}`,
  );

const prBodySections = [
  '*One green run is not proof a bug is fixed; some of these tests are flaky by nature — ' +
    'confirm the fix shipped before merging, and drop any removal you doubt.*',
  ['## Triage metadata', `issues: ${issueNumbers.map((n) => `#${n}`).join(', ')}`].join('\n'),
  ['## Affected tests', ...affectedTests.map((t) => `- ${t.spec} :: ${t.title}`)].join('\n'),
  ['## Removed markers', ...markerDetails].join('\n'),
];
if (closesIssues.length) {
  prBodySections.push(['## Closes', ...closesIssues.map((n) => `Closes #${n}`)].join('\n'));
}
prBodySections.push(
  "Each removal is an independent line change — drop any you're not confident in. If you drop a " +
    'removal that was part of an all-clear `Closes #N` line, delete that `Closes #N` line too so ' +
    'the issue stays open.',
);
const prBody = prBodySections.join('\n\n') + '\n';

// --- git: branch, commit, push -----------------------------------------------

const branch = `qa/marker-cleanup-run-${RUN_ID}`;
const git = (...args) => execFileSync('git', args, { stdio: 'inherit' });

git('checkout', '-b', branch);
git('config', 'user.name', 'qa-triage-bot');
git('config', 'user.email', 'qa-triage-bot@users.noreply.github.com');
git('add', ...byFile.keys());
git('commit', '-m', `QA marker cleanup — run #${RUN_ID}`);
// Explicit token URL, not a plain `git push` relying on the checkout step's
// persisted credentials — same defensive pattern this workflow file already
// uses for its other automated push (publish-triage-metrics.js's gh-pages push).
git('push', `https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git`, `HEAD:refs/heads/${branch}`);

// --- gh: open the PR, then reconcile issues (comments need the PR URL) -----

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-cleanup-'));
const prBodyFile = path.join(tmpDir, 'pr-body.md');
fs.writeFileSync(prBodyFile, prBody);

const prUrl = execFileSync(
  'gh',
  [
    'pr',
    'create',
    '--head',
    branch,
    '--title',
    `QA marker cleanup — run #${RUN_ID}`,
    '--body-file',
    prBodyFile,
    '--label',
    'qa-triage',
    '--label',
    'qa-triage:cleanup',
  ],
  { encoding: 'utf8' },
).trim();
console.log(`Opened ${prUrl}`);

for (const { number, clearedLines, notClearedLines, blockedByOpenPrNote } of issueComments) {
  const body =
    `Marker(s) for this issue passed cleanly in run #${RUN_ID} (${RUN_URL}), proposed for removal in ${prUrl}:\n` +
    `${clearedLines.join('\n')}\n` +
    'Not cleared (still failing / flaky / not exercised this run, or pending in PR #<M>):\n' +
    `${notClearedLines.join('\n')}\n` +
    (blockedByOpenPrNote ? `${blockedByOpenPrNote}\n` : '') +
    'Leaving this issue open until all of its markers clear in a single run.\n';
  const commentFile = path.join(tmpDir, `issue-${number}-comment.md`);
  fs.writeFileSync(commentFile, body);
  execFileSync('gh', ['issue', 'comment', String(number), '--body-file', commentFile], { stdio: 'inherit' });
}

console.log(
  `Removed ${removals.length} marker(s) across ${byFile.size} file(s); ` +
    `closed ${closesIssues.length} issue(s); commented on ${issueComments.length} issue(s).`,
);
