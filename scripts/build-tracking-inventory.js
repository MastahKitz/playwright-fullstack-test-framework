#!/usr/bin/env node
// Compact the raw triage lists into the inventory the model reads in Step 1 of
// the results-analysis workflow. That workflow fetches three things before
// invoking the model: open `qa-triage` issues, open `qa-triage` PRs, and every
// committed `KNOWN-FAILURE(#N)` marker in the suite. This reshapes them into one
// small file so the model can match a failure against them locally, and only
// re-fetch a full issue or PR body (`gh issue view` / `gh pr diff`) for a
// candidate that actually matches.
//
// Usage:
//   node scripts/build-tracking-inventory.js <issues.json> <prs.json> <markers.txt> > tracking-inventory.json
//
// <issues.json> / <prs.json> are `gh ... list --json` output; <markers.txt> is
// `grep -rn` output.

const fs = require('fs');
const { parseGrepOutput } = require('./lib/markers');

// e.g. tests/functional/checkout/checkout.spec.ts:42 — a file:line reference in prose
const REF_RE = /[A-Za-z0-9_./-]+\.ts:\d+/g;
const EXCERPT_LEN = 400;

function excerpt(body) {
  return (body || '').trim().slice(0, EXCERPT_LEN);
}

function refLines(...texts) {
  const found = [];
  for (const text of texts) {
    for (const ref of (text || '').match(REF_RE) || []) {
      if (!found.includes(ref)) found.push(ref);
    }
  }
  return found;
}

// Parse the `## Failure anchors` block (added to every issue/PR body by the
// results-analysis prompt) into [{ spec, title, anchor }]. This is the Step 1
// match key, so it must not be at the mercy of the excerpt truncation. Each
// entry line is `- <spec> :: <test title> — <anchor>`.
function failureAnchors(body) {
  const lines = (body || '').split('\n');
  const start = lines.findIndex((l) => /^#+\s*Failure anchors\s*$/i.test(l));
  if (start === -1) return [];
  const tests = [];
  for (const raw of lines.slice(start + 1)) {
    if (/^#+\s/.test(raw)) break; // next heading ends the block
    const line = raw.trim();
    if (!line.startsWith('- ')) continue; // skip `frames:` continuation lines
    const sep = line.indexOf(' :: ');
    if (sep === -1) continue;
    const spec = line.slice(2, sep).trim();
    const rest = line.slice(sep + 4);
    const dash = rest.lastIndexOf(' — '); // anchor is always the last ` — ` segment
    tests.push(
      dash === -1
        ? { spec, title: rest.trim(), anchor: null }
        : { spec, title: rest.slice(0, dash).trim(), anchor: rest.slice(dash + 3).trim() },
    );
  }
  return tests;
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

const [issuesPath, prsPath, markersPath] = process.argv.slice(2);

const issues = readJson(issuesPath).map((it) => ({
  number: it.number,
  title: it.title,
  tests: failureAnchors(it.body),
  ref_lines: refLines(it.title, it.body),
  body_excerpt: excerpt(it.body),
}));

const prs = readJson(prsPath).map((pr) => ({
  number: pr.number,
  title: pr.title,
  head_ref: pr.headRefName,
  tests: failureAnchors(pr.body),
  ref_lines: refLines(pr.title, pr.body),
  body_excerpt: excerpt(pr.body),
}));

const markers = parseGrepOutput(fs.readFileSync(markersPath, 'utf8')).map((mk) => ({
  file: mk.file,
  line: mk.line,
  issue: mk.issue,
  reason: mk.reason,
  tests: mk.tests, // [{ spec, title }] parsed from the marker; [] for an older marker
}));

process.stdout.write(JSON.stringify({ markers, issues, prs }, null, 2) + '\n');
