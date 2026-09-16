#!/usr/bin/env node
// Step 2 of the RAG-retrieved-related-tickets pipeline for qa-test-generation
// (see memory: qa-test-generation-rag-related-tickets). Takes the main ticket
// plus the coarse candidate pool from scripts/fetch-related-jira-tickets.js,
// embeds whatever isn't already cached, scores every candidate against the
// main ticket by cosine similarity, and keeps only those at or above the
// threshold — this is the real filter; the JQL step was recall only.
//
// Caching: a ticket's embedding is reused as long as its `updated` timestamp
// still matches what's in the cache — that's the one signal that its text
// hasn't changed since it was last embedded. The cache is keyed by ticket
// key, not by which run treated it as "main" vs. "candidate", since the same
// ticket can be either depending on which ticket a future run targets.
// Reading/writing the cache file is this script's job; committing it back to
// wherever it's persisted (e.g. a gh-pages checkout) is left to the caller,
// same split as scripts/publish-triage-metrics.js uses for triage-history.json.
//
// Required env: VOYAGE_API_KEY
//
// Usage:
//   node scripts/score-related-jira-tickets.js <mainTicket.json> <candidates.json> <cacheFile> [threshold]
//
//   <mainTicket.json> - scripts/fetch-jira-ticket.js output (needs key,
//                        summary, description, updated)
//   <candidates.json> - scripts/fetch-related-jira-tickets.js output
//                        ({ candidates: [{ key, summary, description, updated }] })
//   <cacheFile>       - path to the embedding cache JSON. Read if present
//                        (missing file == empty cache, first run); rewritten
//                        in place whenever any ticket needed a fresh embedding.
//   [threshold]       - cosine similarity cutoff, default 0.6.
//
// Output (stdout):
//   { mainTicket: string, threshold: number, related: [{ key, summary, description, score }] }
//   `related` is sorted by score descending; empty when nothing cleared the
//   threshold, which is a valid outcome, not an error.

const fs = require('fs');

const VOYAGE_MODEL = 'voyage-3.5';

const [mainTicketPath, candidatesPath, cacheFile, thresholdArg] = process.argv.slice(2);
const THRESHOLD = thresholdArg !== undefined ? Number(thresholdArg) : 0.6;

if (!mainTicketPath || !candidatesPath || !cacheFile) {
  console.error(
    'Usage: node scripts/score-related-jira-tickets.js <mainTicket.json> <candidates.json> <cacheFile> [threshold]',
  );
  process.exit(1);
}

const { VOYAGE_API_KEY } = process.env;
if (!VOYAGE_API_KEY) {
  console.error('Missing VOYAGE_API_KEY in the environment.');
  process.exit(1);
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

function embeddableText(ticket) {
  return `${ticket.summary}\n\n${ticket.description}`.trim();
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function embedBatch(texts) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: texts, model: VOYAGE_MODEL }),
  });
  if (!res.ok) {
    throw new Error(`Voyage embeddings request failed: ${res.status} ${res.statusText}\n${await res.text()}`);
  }
  const { data } = await res.json();
  return data.map((d) => d.embedding);
}

async function main() {
  const mainTicket = readJson(mainTicketPath);
  const { candidates } = readJson(candidatesPath, { candidates: [] });
  const cache = readJson(cacheFile, {});

  const allTickets = [mainTicket, ...candidates];
  const stale = allTickets.filter((t) => !cache[t.key] || cache[t.key].updated !== t.updated);

  if (stale.length) {
    const vectors = await embedBatch(stale.map(embeddableText));
    stale.forEach((t, i) => {
      cache[t.key] = { updated: t.updated, embedding: vectors[i] };
    });
    fs.writeFileSync(cacheFile, `${JSON.stringify(cache, null, 2)}\n`);
  }

  const mainVector = cache[mainTicket.key].embedding;
  const related = candidates
    .map((c) => ({
      key: c.key,
      summary: c.summary,
      description: c.description,
      score: cosineSimilarity(mainVector, cache[c.key].embedding),
    }))
    .filter((c) => c.score >= THRESHOLD)
    .sort((a, b) => b.score - a.score);

  process.stdout.write(
    JSON.stringify({ mainTicket: mainTicket.key, threshold: THRESHOLD, related }, null, 2) + '\n',
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
