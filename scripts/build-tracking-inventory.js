#!/usr/bin/env node
// The single shared tracking inventory, called identically by the
// qa-results-analysis and qa-issue-marker-cleanup jobs of qa-triage.yml. It
// answers one question for both — "is this failing test already tracked?" — by
// producing five lists, all keyed on `spec + title`:
//
//   issues       — open `qa-triage` issues and the tests each tracks
//   triage_prs   — open combined-confident PRs (label `qa-triage:triage`)
//   decision_prs — open draft decision PRs   (label `qa-triage:decision`)
//   cleanup_prs  — open marker-removal PRs   (label `qa-triage:cleanup`)
//   markers      — every committed `// KNOWN-FAILURE(#N)` marker on `main`
//
// The three PR lists are pre-split by the `qa-triage:<type>` label so each
// consumer iterates the one it needs with no filtering.
//
// Usage:
//   node scripts/build-tracking-inventory.js <issues.json> <prs.json> <markers.txt> > tracking-inventory.json
//
//   <issues.json> — `gh issue list --state open --label qa-triage --json number,title,body`
//   <prs.json>    — `gh pr list --state open --label qa-triage --json number,title,headRefName,body,labels`
//   <markers.txt> — `grep -rn 'KNOWN-FAILURE(#' tests/functional/` output
//
// Marker files are read from the working tree, so run this on a checked-out `main`.

const fs = require('fs');
const { parseGrepOutput, deriveGuardedTitle } = require('./lib/known-failure-marker');

// --- body-block parsers ---------------------------------------------------

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

// `## Affected tests` — one `- <spec> :: <title>` entry per line.
function affectedTests(body) {
  const tests = [];
  for (const raw of blockLines(body, 'Affected tests')) {
    const line = raw.trim();
    if (!line.startsWith('- ')) continue;
    const sep = line.indexOf(' :: ');
    if (sep === -1) continue;
    tests.push({ spec: line.slice(2, sep).trim(), title: line.slice(sep + 4).trim() });
  }
  return tests;
}

// `## Triage metadata` — the `issues:` line, e.g. `issues: #12, #15`. Absent
// line (a pure script-fix PR) → []. Trailing `#` comments carry no digits.
function metadataIssues(body) {
  for (const raw of blockLines(body, 'Triage metadata')) {
    const m = raw.match(/^\s*issues:\s*(.*)$/i);
    if (!m) continue;
    return [...m[1].matchAll(/#(\d+)/g)].map((x) => Number(x[1]));
  }
  return [];
}

// --- PR type discriminator ---------------------------------------------------

const PR_TYPE_BY_LABEL = {
  'qa-triage:triage': 'triage_prs',
  'qa-triage:decision': 'decision_prs',
  'qa-triage:cleanup': 'cleanup_prs',
};
const PR_TYPE_BY_PREFIX = [
  ['qa/triage-decision-run-', 'decision_prs'],
  ['qa/triage-run-', 'triage_prs'],
  ['qa/marker-cleanup-run-', 'cleanup_prs'],
];

function prType(pr) {
  const labels = (pr.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  for (const label of labels) if (PR_TYPE_BY_LABEL[label]) return PR_TYPE_BY_LABEL[label];
  const ref = pr.headRefName || '';
  for (const [prefix, type] of PR_TYPE_BY_PREFIX) {
    if (ref.startsWith(prefix)) {
      process.stderr.write(
        `warning: PR #${pr.number} has no qa-triage:<type> label; fell back to branch prefix "${prefix}" → ${type}\n`,
      );
      return type;
    }
  }
  process.stderr.write(
    `warning: PR #${pr.number} has neither a qa-triage:<type> label nor a known branch prefix (${ref}); skipped\n`,
  );
  return null;
}

// --- markers ---------------------------------------------------------------

function buildMarkers(markersText) {
  const fileCache = new Map();
  const out = [];
  for (const mk of parseGrepOutput(markersText)) {
    let lines = fileCache.get(mk.file);
    if (lines === undefined) {
      try {
        lines = fs.readFileSync(mk.file, 'utf8').split('\n');
      } catch (err) {
        lines = null;
      }
      fileCache.set(mk.file, lines);
    }
    const entry = { file: mk.file, line: mk.line, issue: mk.issue, reason: mk.reason, test: null };
    if (lines === null) {
      entry.malformed = `cannot read ${mk.file}`;
      process.stderr.write(`warning: ${entry.malformed}\n`);
    } else {
      try {
        const { title } = deriveGuardedTitle(lines, mk.line);
        entry.test = { spec: mk.file, title };
      } catch (err) {
        entry.malformed = err.message;
        process.stderr.write(`warning: ${mk.file}: ${err.message}\n`);
      }
    }
    out.push(entry);
  }
  return out;
}

// --- main ----------------------------------------------------------------

const [issuesPath, prsPath, markersPath] = process.argv.slice(2);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const issues = readJson(issuesPath).map((it) => ({
  number: it.number,
  summary: it.title,
  tests: affectedTests(it.body),
}));

const inventory = {
  issues,
  triage_prs: [],
  decision_prs: [],
  cleanup_prs: [],
  markers: buildMarkers(fs.readFileSync(markersPath, 'utf8')),
};

for (const pr of readJson(prsPath)) {
  const type = prType(pr);
  if (!type) continue;
  inventory[type].push({
    number: pr.number,
    issues: metadataIssues(pr.body),
    head_ref: pr.headRefName,
    tests: affectedTests(pr.body),
  });
}

process.stdout.write(JSON.stringify(inventory, null, 2) + '\n');
