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

// e.g. tests/functional/checkout/checkout.spec.ts:42 — a file:line reference in prose
const REF_RE = /[A-Za-z0-9_./-]+\.ts:\d+/g;
const MARKER_RE = /KNOWN-FAILURE\(#(\d+)\):\s*(.*)/;
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

// Pull the `## Failure anchors` block (added to every issue/PR body by the
// results-analysis prompt) out in full — it's the primary match key in Step 1,
// so it must not be at the mercy of the excerpt truncation.
function anchorBlock(body) {
  const lines = (body || '').split('\n');
  const start = lines.findIndex((l) => /^#+\s*Failure anchors\s*$/i.test(l));
  if (start === -1) return [];
  const out = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#+\s/.test(line)) break; // next heading ends the block
    if (line.trim()) out.push(line.trim());
  }
  return out;
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function parseMarkers(path) {
  const markers = [];
  for (const raw of fs.readFileSync(path, 'utf8').split('\n')) {
    if (!raw.trim()) continue;
    // grep -rn output: <file>:<line>:<content>
    const first = raw.indexOf(':');
    const second = raw.indexOf(':', first + 1);
    if (first === -1 || second === -1) continue;
    const file = raw.slice(0, first);
    const line = Number(raw.slice(first + 1, second));
    const content = raw.slice(second + 1);
    const m = content.match(MARKER_RE);
    if (!m || !Number.isInteger(line)) continue;
    markers.push({ file, line, issue: Number(m[1]), reason: m[2].trim() });
  }
  return markers;
}

const [issuesPath, prsPath, markersPath] = process.argv.slice(2);

const issues = readJson(issuesPath).map((it) => ({
  number: it.number,
  title: it.title,
  anchors: anchorBlock(it.body),
  ref_lines: refLines(it.title, it.body),
  body_excerpt: excerpt(it.body),
}));

const prs = readJson(prsPath).map((pr) => ({
  number: pr.number,
  title: pr.title,
  head_ref: pr.headRefName,
  anchors: anchorBlock(pr.body),
  ref_lines: refLines(pr.title, pr.body),
  body_excerpt: excerpt(pr.body),
}));

process.stdout.write(
  JSON.stringify({ markers: parseMarkers(markersPath), issues, prs }, null, 2) + '\n',
);
