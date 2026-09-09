# Task: analyze this CI run's Playwright failures and propose next steps

This is a post-merge run against the live demo site (https://qademo.com — a React storefront
backed by a JSON API at `/api/*`). Some test(s) failed, or were flaky (passed only after retry,
which we also treat as a build failure). Your job is **triage, and — only where the evidence is
clear-cut — the fix**: per failure, decide whether it's a real product bug or a problem with the
test script, avoid re-reporting failures already tracked, and land a concrete next step. A human
reviews every PR you open before it merges; you never push to `main`.

What goes in the PR depends on how sure you are:

- **Confident it's a product bug** → the PR adds a `// KNOWN-FAILURE(#N):` marker above the test
  and you file an issue (Step 3).
- **Confident it's the test script's fault** → the PR contains the actual fix. No issue (Step 3).
- **Can't tell** (product bug vs. broken test, or an infra/server flake) → you commit nothing.
  You open a **draft decision PR** (Step 3b) whose body spells out a mark-as-bug option and a
  fix-the-test option, and file an issue so it's tracked. A human picks.

Your tool access is deliberately narrow — `Read`/`Grep`/`Glob`/`Edit` and a short list of
specific `git` / `gh` subcommands. No general `Bash`, no `jq`, no `python3`, no piped/chained
shell. Read `test-report/results.json` and the `.png` screenshots directly with `Read` (it parses
JSON and renders images); use `Grep`/`Glob` for what you'd use `find`/`grep`/`cat` for. RUN ID /
RUN URL / COMMIT are in the prompt — don't look them up.

## Test identity

A failure is identified by **`spec + title`** — the spec file path plus the exact `test('...')`
title — everywhere: matching against tracked items, the marker's position, the issue body, the
PR body. There is no fallback key (no anchor, no stack frame, no line number). `spec` and `title`
are copied **verbatim** from `run-failures.json` into every issue and PR body you write.

## Evidence available

- `run-failures.json` (repo root) — one entry per failing/flaky test, computed by the workflow:
  `{ spec, title, status, error_excerpt }`. `status` is `unexpected` (failed) or `flaky`. This is
  your worklist — one pass per entry.
- `test-report/results.json` — the full Playwright JSON reporter output. Walk `suites` → `specs`
  → `tests` for the error message, stack trace, and expected/actual snippets on a given failure.
- `test-results/**/test-failed-*.png` — a screenshot of the page at the moment of failure, one
  per failed attempt. **Open and read this for every failing/flaky test before forming a theory.**
  Look for anything overlaid on the page — modal dialogs, toasts, banners, alert text — plus
  error banners, empty cart, wrong price, blank page, a redirect to `/login`. If a popup or
  banner has visible text, transcribe it verbatim; it is direct evidence and outranks any theory
  built from reading code paths.
- `test-results/**/video-frames/frame-*.png` — frames at 2fps from that attempt's video
  (pre-extracted; the raw `.webm` is not readable). **If the failure screenshot looks
  unremarkable, skim these in order** — this app shows some errors as toasts that appear a moment
  after an action and self-dismiss, so a transient error can be gone by the time the screenshot
  fires while still visible across several frames.
- The test source under `tests/functional/**` — `.spec.ts`, `.flow.ts`, `.actions.ts`,
  `.assertions.ts`, `.data.ts` siblings of the failing spec. Use it to understand what was being
  checked; do not let a plausible code-path story override what the screenshot actually shows.
- `tracking-inventory.json` (repo root) — the shared tracking inventory (see below), already
  built by the workflow. Step 1 matches against it locally; don't re-list issues/PRs or re-grep
  markers yourself.

Context for bug-vs-flake: cart/order state is server-side (keyed by an anonymous `session_id`)
and mutating actions wait on `/api/cart/items` / `/api/orders` responses. qademo is a small
shared demo box that can drop or slow a request under load — a lone `waitForResponse` timeout on
one mutation, with an otherwise-healthy screenshot, is more likely server flakiness than a
script or product bug.

### `tracking-inventory.json` shape

Five lists, all keyed on `spec + title`. The three PR lists are pre-split by type:

- `issues[]` — `{ number, summary, tests: [{ spec, title }] }` per **open** `qa-triage` issue.
  `tests` is parsed from the issue's `## Affected tests` block.
- `triage_prs[]` — `{ number, issues: [12, 15], head_ref, tests: [{ spec, title }] }` per open
  combined-confident PR (label `qa-triage:triage`, branch `qa/triage-run-*`).
- `decision_prs[]` — same shape, per open draft decision PR (`qa-triage:decision`,
  `qa/triage-decision-run-*`).
- `cleanup_prs[]` — same shape, per open marker-removal PR (`qa-triage:cleanup`).
- `markers[]` — `{ file, line, issue, reason, test: { spec, title } }` for every committed
  `// KNOWN-FAILURE(#N)` marker on `main`. `test` is position-derived — whatever `test(...)` sits
  below the marker. A malformed marker has `test: null` and a `malformed` string — surface it in
  your summary, don't act on it.

## Step 1 — is each failure already tracked?

Two parts, not a lookup.

**1. Candidate match.** Does the failure's `spec + title` appear in any `issues[].tests`,
`triage_prs[].tests`, `decision_prs[].tests`, or `markers[].test`?
- `cleanup_prs` is **not** a tracked signal — a match there just means that PR's green claim is
  now stale; proceed as if unmatched.
- No candidate match anywhere → the failure is **new**. Go to Step 2.

**2. Cause confirmation.** If there is a candidate match, investigate *this run's* actual root
cause from the screenshot / video frames / stack — the same investigation you'd do for a new
failure — and compare it to the matched item's cause:
- **Same cause** → already tracked. Record `tracked as #N` / `pending in PR #M` in your summary.
  No issue, no PR, no marker.
- **Different or additional cause** → the test is failing for something new *on top of* a known
  issue. Treat this failure as **new** — it flows to Step 2, and in Step 3 gets its own issue and
  a marker **stacked** above the same `test(...)`.

You may make one targeted `gh issue view <N> --json state,body` or `gh pr view <N>` call to
confirm a candidate — not to re-enumerate.

## Step 2 — classify and group the new failures

For each new/additional-cause failure, work out:

1. **What was being asserted**, in plain English.
2. **What actually happened**, grounded in the screenshot/frames (not just the error) — state
   what was on screen, including any popup/dialog/banner text.
3. **A classification** (table below).
4. **A concrete action** — e.g. "update `getByTestId('...')` in `checkout.actions.ts` — the
   testid changed from X to Y", or "file a bug: adding a second item does not update the order
   subtotal". Not "investigate further" unless genuinely inconclusive.

### Group by shared cause

Cluster the new failures by **underlying cause**, not by test: two or more belong to one group
when a single fix or a single product bug explains all of them (one broken shared helper, one
missing subtotal update, one dropped request). Tests that fail for genuinely different reasons
stay separate. Everything downstream — one issue, one marker set, one decision-PR section — is
**per group**. If a new failure shares its cause with an item Step 1 found already tracked, it
belongs to that item: `gh issue comment` the existing issue noting the cause now also hits
`<spec> :: <title>`, and say "folded into #N / PR #M" in your summary. Only open something new
when the cause itself is new.

### Classification → route

| Classification | Meaning | Route |
|---|---|---|
| **Product bug** | the app behaved incorrectly; the test caught something real | Step 3 — marker + issue |
| **Script issue** | the test is wrong/brittle (stale testid, bad assumption, test-side timing) | Step 3 — code fix, no issue |
| **Infra / server flake** | `waitForResponse` / nav timeout with a healthy screenshot — qademo dropping a request under load | Step 3b — decision PR + issue |
| **Inconclusive** | not enough evidence to call bug vs. script | Step 3b — decision PR + issue |

Only call a group **script issue** when the evidence is unambiguous (a testid you can see
changed, a hardcoded value the app no longer returns, an assertion every frame contradicts). If
a product bug is still a live explanation → **inconclusive**.

## Step 3 — one combined PR for the confident groups

If you have any **product bug** or **script issue** group:

1. If this run also has Step 3b groups, create that branch first (Step 3b step 1) so it stays a
   clean base. Then `git checkout <COMMIT>` and `git checkout -b qa/triage-run-<RUN ID>`.
2. `git config user.name qa-triage-bot` / `user.email qa-triage-bot@users.noreply.github.com`.
3. **Product-bug group:** file one issue with `gh issue create --label qa-triage` (issues carry
   only `qa-triage`; the `qa-triage:*` type labels go on PRs). The body **starts** with:

   ```
   ## Affected tests
   - <spec> :: <title>
   - <spec> :: <title>
   ```

   one line per affected test, `spec` and `title` verbatim from `run-failures.json`. After it, a
   link to the RUN URL and the Step 2 analysis. Note the issue number `#N`.

   Then add, directly above each affected test's `test(...)` call (no blank line between):

   ```
   // KNOWN-FAILURE(#N): <one-line reason>
   ```

   One marker per test. If the test already carries a marker, stack the new line **on top**
   (most recent first). Every marker in the group points at the same `#N`.
4. **Script-issue group:** make the minimal fix to the shared cause. No issue. Touch only the
   failing tests' own files (`.spec.ts` / `.flow.ts` / `.actions.ts` / `.assertions.ts` /
   `.data.ts`) and the helpers they call; don't refactor around it.
5. Commit, push, and open the PR:
   `gh pr create --label qa-triage --label qa-triage:triage --title "QA triage — run #<RUN ID>"`.
   Body **starts** with:

   ```
   ## Triage metadata
   issues: #<N>, #<M>

   ## Affected tests
   - <spec> :: <title>
   ```

   `issues:` lists every product-bug issue this PR relates to (omit the line entirely if the PR
   is a pure script fix). `## Affected tests` covers **every** test in the PR. Then one section
   per group: its classification, the tests it covers, and either the issue link (product bug) or
   a plain-English description of what was wrong and what you changed (script issue).

## Step 3b — one draft decision PR for the groups you can't call

For **infra/server flake** and **inconclusive** groups:

1. `git checkout <COMMIT>`, then `git checkout -b qa/triage-decision-run-<RUN ID>` — cut this
   **before** the Step 3 branch so it inherits none of its commits. **No file changes.**
2. Same bot identity as Step 3.
3. File one issue per group (`gh issue create --label qa-triage`), body starting with the
   `## Affected tests` block, then the ambiguity writeup and both options verbatim (below), so
   the issue stands on its own. Note each `#N`.
4. `git commit --allow-empty -m "QA triage decision — run #<RUN ID>"`, push, and
   `gh pr create --draft --label qa-triage --label qa-triage:decision
   --title "QA triage decision — run #<RUN ID>"`.

PR body **starts** with `## Triage metadata` (`issues:` listing every decision issue) +
`## Affected tests` (every test across all groups). Then one section per group / per issue `#N`:

- **What failed and why it's ambiguous** — the condensed Step 2 points + issue `#N`. Restate the
  group's affected tests as `- <spec> :: <title>`.
- **Option 1 — mark it.** The exact line per affected test and which `test(...)` it goes above:

  ```
  above  <spec> :: <title>
  // KNOWN-FAILURE(#N): <one-line reason>
  ```

  Plus the one manual check that would confirm or kill the theory.
- **Option 2 — fix the test.** A fenced ` ```diff ` against the real files, matching indentation,
  ready to `git apply`. One diff usually covers the group. If you genuinely can't name a
  plausible change, write "Option 2 — none identified" and say what evidence would settle it.
- **Recommendation** — which way you lean, stated as a lean, not a verdict.
- **Resolving #N** — the reviewer picks per test and can mix. `#N` closes **only if Option 2 is
  taken for every test under it** — then they add `Closes #N` to this PR's description before
  marking it ready. Any Option 1 → `#N` stays open, tracked by that marker; do **not** add
  `Closes #N`.

End the body with: "Per test, apply Option 1 (marker) or Option 2 (diff), then mark this PR
ready. Add `Closes #N` to this description only if you took Option 2 for every test under `#N`.
The empty commit can be dropped either way."

If there are no infra/inconclusive groups this run, skip Step 3b.

## When there's nothing to do

- **Every failure already tracked** per Step 1 (same cause) → report it, one line each with the
  tracking reference, and create nothing.
- **No failing/flaky tests** in `run-failures.json` (the build failed for an infra reason) → say
  so and create nothing.
