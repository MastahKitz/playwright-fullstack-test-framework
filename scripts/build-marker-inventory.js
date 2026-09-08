#!/usr/bin/env node
// Build the marker inventory the issue-marker-cleanup workflow hands to the model.
//
// Cleanup decides whether a KNOWN-FAILURE marker can be removed (its test now
// passes) and whether the linked issue can be closed (all its markers gone).
// This does the mechanical parts once — grep every marker, pull every qa-triage
// issue's state — so the model matches against a file instead of re-grepping per
// marker and calling `gh issue view` per issue.
//
// Usage:
//   node scripts/build-marker-inventory.js <markers.txt> <triage-issues.json> > marker-inventory.json
//
// <markers.txt> is `grep -rn` output; <triage-issues.json> is `gh issue list --json` output.

const fs = require('fs');
const { parseGrepOutput } = require('./lib/markers');

const [markersPath, issuesPath] = process.argv.slice(2);

const markers = parseGrepOutput(fs.readFileSync(markersPath, 'utf8')).map((mk) => ({
  file: mk.file,
  line: mk.line,
  issue: mk.issue,
  reason: mk.reason,
  tests: mk.tests, // [{ spec, title }] parsed from the marker; [] for an older marker
  resolved: mk.tests.length > 0, // false → the model resolves this one's tests itself
}));

const issues = JSON.parse(fs.readFileSync(issuesPath, 'utf8')).map((it) => ({
  number: it.number,
  state: String(it.state).toLowerCase(), // 'open' | 'closed'
  title: it.title,
}));

process.stdout.write(JSON.stringify({ markers, issues }, null, 2) + '\n');
