#!/usr/bin/env node
// Pulls one Jira ticket (plus, one level deep, its epic/parent and any
// explicitly linked issues) into a single clean JSON blob for the
// qa-test-generation workflow to hand to Claude.
//
// Deliberately mechanical, no judgment calls — same reasoning as
// cleanup-fully-fixed-issue-markers.js being a plain script rather than an
// agent: given a ticket key, there's nothing to decide, only fields to fetch.
// - Follows ONLY the keys the ticket itself names (its own `issuelinks` +
//   `parent`) — never a JQL search across the project. One level deep: a
//   linked ticket's own links are not followed, so this never grows into an
//   unbounded crawl.
// - Attachments: images and videos are downloaded to disk (Claude needs the
//   actual bytes — it can't authenticate to Jira itself); video frame
//   extraction (ffmpeg) is left to the workflow step, same split as
//   qa-triage.yml uses for Playwright-run videos. Other attachment types are
//   listed but not downloaded (out of scope for the pilot).
//
// Required env: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
//
// Usage:
//   node scripts/fetch-jira-ticket.js <TICKET-KEY> [attachmentsDir] > jira-ticket.json
//
// Output shape:
//   {
//     key, summary, description, components: [string], labels: [string],
//     epic: { key, summary, description } | null,
//     linkedIssues: [ { key, type, summary, description } ],
//     attachments: [ { filename, mimeType, localPath | null } ]
//   }

const fs = require('fs');
const path = require('path');
const { adfToText } = require('./lib/adf-to-text');

const TICKET_KEY = process.argv[2];
const ATTACHMENTS_DIR = process.argv[3] || 'jira-attachments';

if (!TICKET_KEY) {
  console.error('Usage: node scripts/fetch-jira-ticket.js <TICKET-KEY> [attachmentsDir]');
  process.exit(1);
}

const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('Missing JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN in the environment.');
  process.exit(1);
}

const AUTH_HEADER = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;
const FIELDS = 'summary,description,attachment,issuelinks,parent,components,labels';

async function jiraGet(urlPath) {
  const res = await fetch(`${JIRA_BASE_URL}${urlPath}`, {
    headers: { Authorization: AUTH_HEADER, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Jira GET ${urlPath} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchMinimal(key) {
  const issue = await jiraGet(`/rest/api/3/issue/${key}?fields=summary,description`);
  return {
    key: issue.key,
    summary: issue.fields.summary || '',
    description: adfToText(issue.fields.description).trim(),
  };
}

async function downloadAttachment(attachment) {
  const { filename, mimeType, content: url, id } = attachment;
  const isImage = mimeType && mimeType.startsWith('image/');
  const isVideo = mimeType && mimeType.startsWith('video/');
  if (!isImage && !isVideo) {
    return { filename, mimeType, localPath: null };
  }

  const res = await fetch(url, { headers: { Authorization: AUTH_HEADER } });
  if (!res.ok) {
    console.error(`Warning: failed to download attachment ${filename} (${res.status}) — skipping.`);
    return { filename, mimeType, localPath: null };
  }

  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
  const localPath = path.join(ATTACHMENTS_DIR, `${id}-${filename}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(localPath, buffer);
  return { filename, mimeType, localPath };
}

async function main() {
  const issue = await jiraGet(`/rest/api/3/issue/${TICKET_KEY}?fields=${FIELDS}`);
  const { fields } = issue;

  const linkKeys = (fields.issuelinks || []).map((link) => ({
    key: (link.outwardIssue || link.inwardIssue || {}).key,
    type: link.type && link.type.name,
  })).filter((l) => l.key);

  const linkedIssues = await Promise.all(
    linkKeys.map(async ({ key, type }) => ({ type, ...(await fetchMinimal(key)) })),
  );

  const epic = fields.parent
    ? await fetchMinimal(fields.parent.key)
    : null;

  const attachments = await Promise.all(
    (fields.attachment || []).map(downloadAttachment),
  );

  const output = {
    key: issue.key,
    summary: fields.summary || '',
    description: adfToText(fields.description).trim(),
    components: (fields.components || []).map((c) => c.name),
    labels: fields.labels || [],
    epic,
    linkedIssues,
    attachments,
  };

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
