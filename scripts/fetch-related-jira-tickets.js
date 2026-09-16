#!/usr/bin/env node
// Step 1 of the RAG-retrieved-related-tickets pipeline for qa-test-generation
// (see memory: qa-test-generation-rag-related-tickets). Builds a coarse
// candidate pool via JQL, matched on the main ticket's components, labels, or
// parent/epic using OR logic — recall only, not the real filter. Embedding +
// cosine-similarity scoring (steps 2-4 of that design) is a separate script
// layered on top of this one's output; this script does not call Voyage.
//
// Scoped to the main ticket's own project (derived from its key's prefix) —
// that wasn't explicitly settled in the design discussion, so revisit if
// cross-project tickets ever need to show up as candidates.
//
// Required env: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
//
// Usage:
//   node scripts/fetch-related-jira-tickets.js <TICKET-KEY> [maxResults] > related-candidates.json
//
// Output shape:
//   {
//     jql: string | null,
//     candidates: [ { key, summary, description, updated } ]
//   }
//   `jql` is null (and candidates empty) when the main ticket has no
//   components, labels, or parent to match on.

const { adfToText } = require('./lib/adf-to-text');

const TICKET_KEY = process.argv[2];
// 100 is the real ceiling here, not an arbitrary choice: Jira caps
// /rest/api/3/search/jql at 100 results per request whenever a `fields`
// parameter is set (confirmed by Atlassian as intended behavior, not a bug —
// https://community.atlassian.com/forums/Jira-questions/Why-is-rest-api-3-search-jql-only-returning-100-issues-when/qaq-p/2936002),
// and this script always requests fields. Asking for more just gets silently
// truncated back to 100, so going higher would need real pagination via
// nextPageToken, which this script doesn't implement (recall step only).
const MAX_RESULTS = Number(process.argv[3]) || 100;

if (!TICKET_KEY) {
  console.error('Usage: node scripts/fetch-related-jira-tickets.js <TICKET-KEY> [maxResults]');
  process.exit(1);
}

const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('Missing JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN in the environment.');
  process.exit(1);
}

const AUTH_HEADER = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;

async function jiraGet(urlPath) {
  const res = await fetch(`${JIRA_BASE_URL}${urlPath}`, {
    headers: { Authorization: AUTH_HEADER, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Jira GET ${urlPath} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// JQL string-literal quoting: wrap in double quotes, escape any embedded ones.
function quoteJqlValue(value) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

async function main() {
  const issue = await jiraGet(
    `/rest/api/3/issue/${TICKET_KEY}?fields=components,labels,parent,project`,
  );
  const { fields } = issue;
  const projectKey = fields.project.key;
  const components = (fields.components || []).map((c) => c.name);
  const labels = fields.labels || [];
  const parentKey = fields.parent ? fields.parent.key : null;

  const orClauses = [];
  if (components.length) {
    orClauses.push(`component in (${components.map(quoteJqlValue).join(', ')})`);
  }
  if (labels.length) {
    orClauses.push(`labels in (${labels.map(quoteJqlValue).join(', ')})`);
  }
  if (parentKey) {
    orClauses.push(`parent = ${parentKey}`);
  }

  if (!orClauses.length) {
    process.stdout.write(JSON.stringify({ jql: null, candidates: [] }, null, 2) + '\n');
    return;
  }

  // ORDER BY updated DESC matters once matches exceed MAX_RESULTS (very
  // plausible on an established project — a single OR across
  // component/label/parent can pull in hundreds of tickets): it biases the
  // page we keep toward recently-touched tickets, which are both more likely
  // relevant to current work and more likely to reflect current conventions
  // than whatever arbitrary order Jira would otherwise return.
  const jql = `project = ${projectKey} AND key != ${TICKET_KEY} AND (${orClauses.join(' OR ')}) ORDER BY updated DESC`;

  // /rest/api/3/search is deprecated on Jira Cloud; /search/jql is the
  // current replacement (same request shape, minus startAt/total paging).
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: {
      Authorization: AUTH_HEADER,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jql,
      maxResults: MAX_RESULTS,
      fields: ['summary', 'description', 'updated'],
    }),
  });
  if (!res.ok) {
    throw new Error(`Jira search failed: ${res.status} ${res.statusText}\n${await res.text()}`);
  }
  const { issues, isLast } = await res.json();

  // isLast === false means more matches exist beyond this one page — this
  // script doesn't paginate (recall step only, see header), so surface the
  // drop instead of silently discarding candidates with no trace.
  if (isLast === false) {
    console.error(
      `Warning: JQL matched more than ${MAX_RESULTS} candidate(s) for ${TICKET_KEY} — ` +
        `keeping only the ${MAX_RESULTS} most recently updated.`,
    );
  }

  const candidates = issues.map((c) => ({
    key: c.key,
    summary: c.fields.summary || '',
    description: adfToText(c.fields.description).trim(),
    updated: c.fields.updated,
  }));

  process.stdout.write(JSON.stringify({ jql, candidates }, null, 2) + '\n');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
