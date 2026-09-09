# Automated QA workflow — revised design

Status: **adopted, implementation in progress** (branch `test/workflow-redesign`). This supersedes
the previous implementation — `qa-pr-review.yml` plus the separate `qa-results-analysis.yml` and
`qa-issue-marker-cleanup.yml` (now merged into `qa-triage.yml`) — and the scripts they call. The
code, prompts, workflows and docs are being brought in line with this document; the live GitHub
issue / PR migration (§9) is the one step still outstanding.

The driver for the rewrite: **markers move from the deepest failing code line to the test-case
level**, and once they do, a stack of accumulated machinery (the `[spec::title]` annotation, the
`resolved` flag, the anchor script's stack analysis, the call-graph resolution in cleanup)
collapses. This document is the single description of the workflow after that change.

---

## 1. Core concepts

### 1.1 Test identity

A failure is identified by **`spec + title`** — the spec file path plus the exact `test('...')`
title — everywhere: matching against tracked items, the marker, the issue body, the PR body.
Title alone is not enough (it collides across specs).

There is **no fallback key** (no anchor, no stack frames, no line number). See §7 for the one
gap this leaves.

### 1.2 The marker

Format — one line, directly above the `test(...)` call it guards, no blank line between:

```ts
// KNOWN-FAILURE(#123): subtotal does not update when a second item is added
test('validate order subtotal reflects added items', async ({ page }) => {
```

- `#123` is the tracking issue. Always present.
- The reason is free text, one line.
- **No `[spec::title]` bracket.** The guarded test is whatever `test(...)` sits immediately
  below the marker — derived from position, never from text inside the comment. This is what
  makes a test rename a non-event: the comment stays attached to the block, and the inventory
  re-derives the current title every time it runs.
- **Stacking:** a test that fails for two unrelated causes carries two marker lines, most recent
  on top, each its own `// KNOWN-FAILURE(#N):` line. Both point at their own issue.

Markers live only in `.spec.ts` files (that's where `test(...)` is). A marker is never placed
above `test.describe(...)`.

### 1.3 The structured body block

Every issue and every triage/decision/cleanup PR body **starts** with a machine-parseable block.
It is what the inventory builder reads back out; it must survive body truncation, so it goes
first.

Issue body:

```
## Affected tests
- tests/functional/order/checkout/checkout.spec.ts :: validate order subtotal reflects added items
- tests/functional/order/cart/cart.spec.ts :: validate cart badge updates on add
```

PR body:

```
## Triage metadata
issues: #12, #15    # every issue this PR relates to; omit the line entirely for a pure script-fix PR

## Affected tests
- <spec> :: <title>
- <spec> :: <title>
```

`spec` and `title` are copied verbatim from the run's failure list. The PR **type** is not in
the body — it comes from a label (§1.5).

### 1.4 The shared tracking inventory

**One script, called identically by both jobs of `qa-triage.yml`.** It produces five lists, all
keyed on `spec + title`. The three PR lists are **pre-split by type** so each consumer iterates
the one it needs with no filtering:

```jsonc
{
  "issues": [
    { "number": 12, "summary": "<issue title>", "tests": [ { "spec": "...", "title": "..." } ] }
  ],
  "triage_prs": [
    { "number": 41, "issues": [12, 15], "head_ref": "qa/triage-run-98",
      "tests": [ { "spec": "...", "title": "..." } ] }
  ],
  "decision_prs": [ /* same shape */ ],
  "cleanup_prs":  [ /* same shape; `issues` is the set whose markers it removes */ ],
  "markers": [
    { "file": "tests/functional/.../x.spec.ts", "line": 14, "issue": 12,
      "reason": "...", "test": { "spec": "...", "title": "..." } }
  ]
}
```

Sources:

| List | Source | Notes |
|---|---|---|
| `issues` | `gh issue list --state open --label qa-triage` | **Open only.** An absent issue means closed — nothing to do. `tests` parsed from the `## Affected tests` block. |
| `triage_prs` / `decision_prs` / `cleanup_prs` | one `gh pr list --state open --label qa-triage --json ...,labels` call, split in-memory by the `qa-triage:<type>` label (§1.5) | **Open only.** `issues` / `tests` parsed from the body blocks; `head_ref` from the API. A `qa-triage` PR with **no** `qa-triage:*` type label → fall back to the branch prefix, and log it (shouldn't happen). |
| `markers` | `grep -rn 'KNOWN-FAILURE(#' tests/functional/` on the **checked-out `main`** | `test` is **position-derived**: scan forward from the grep line to the next `test(` / `test.only(` / `test.skip(`, skipping other marker lines and blanks; extract the title literal. Anything else in between → malformed, surface it. |

The markers list never reads open PR branches. A marker that exists only on an unmerged PR is
represented by that PR's entry in `triage_prs` / `decision_prs`, not by `markers`.

### 1.5 Labels

| Label | On | Read by |
|---|---|---|
| `qa-triage` | every issue and PR this system opens | inventory `gh issue/pr list --label qa-triage` filters (PR review skips these PRs by bot author, not by label — see §2) |
| `qa-triage:triage` | the combined confident PR | inventory → `triage_prs` |
| `qa-triage:decision` | the draft decision PR | inventory → `decision_prs` |
| `qa-triage:cleanup` | the marker-removal PR | inventory → `cleanup_prs` |

The `type` discriminator is a **label**, not a body line — `gh pr list --label qa-triage:cleanup`
filters natively, it shows in the GitHub UI, and it can't be mangled by a body edit. The branch
prefix (`qa/triage-run-*`, `qa/triage-decision-run-*`, `qa/marker-cleanup-run-*`) still encodes
the same thing and is the fallback if a label is ever missing. Each workflow `gh label create
--force`s the labels it needs before opening its PR.

---

## 2. Workflow: PR review

**Trigger:** pull request touching `tests/**` only. (No `playwright.config.ts`, no `scripts/**`
— the conventions doc only covers test code.) Events: `opened`, `synchronize`,
`ready_for_review`.

**Skip:** any PR whose author is a bot (`github.event.pull_request.user.type == 'Bot'`). The
triage / decision / cleanup PRs this system opens are authored by `github-actions[bot]`, so this
covers them — and claude-code-action won't run for a bot actor regardless. (If those workflows
ever move to a PAT / GitHub App token so their PRs get CI, add a
`!contains(…labels.*.name, 'qa-triage')` clause too.)

**Inputs to Claude:** the PR diff (`gh pr diff`), `docs/conventions.md`, the changed files and
their sibling reference files, **and the review's own prior comments on this PR**.

**Behaviour:**

1. Read `docs/conventions.md`. Check every changed line in `tests/**` against every numbered
   rule.
2. Reconcile against prior comments: post a finding only if it is new or still unresolved. Do
   **not** repost a comment for something already fixed in a later commit, or already flagged and
   still open. (Re-review fires on every `synchronize`.)
3. Output per finding:
   - Fix confined to the commented line(s) → GitHub ` ```suggestion ` block, indentation matched,
     anchored to the exact line range.
   - Fix needs a change elsewhere (new import, sibling file) → plain snippet + prose describing
     the other change.
4. If nothing in the diff violates a convention → one short top-level comment saying so. Never
   manufacture nitpicks.

The review is advisory. It does not block merge.

---

## 3. Workflow: QA triage

One workflow — `qa-triage.yml` — triggered by `workflow_run` on "Playwright Tests" `completed`,
with a no-cancel concurrency group (`qa-triage-automation`) so stacked runs serialise. It has two
jobs:

| Job | Runs when | Does |
|---|---|---|
| `qa-results-analysis` | `conclusion == failure` | §3.1–§3.2 — triage, issues, triage PR, decision PR |
| `qa-issue-marker-cleanup` | `!cancelled() && conclusion in (success, failure)`; `needs: [qa-results-analysis]` | §4 — remove green markers, reconcile issues |

`qa-issue-marker-cleanup` `needs` `qa-results-analysis`, so on a failing run it runs **after**
analysis and its tracking inventory (§1.4) picks up the triage PR analysis just opened — which the
issue-close guard (§4.2 step 3) depends on. On a passing run the analysis job is skipped and
cleanup runs immediately (`!cancelled()` lets a skipped `needs` through). Each job does its own
checkout + report download + inventory build — the inventory in particular *must* be rebuilt for
cleanup, since its PR half changes the moment analysis opens a PR.

The rest of §3 describes the `qa-results-analysis` job (a flaky pass fails the build via
`check-flaky.js`, so "failure" covers flakes too). §4 describes `qa-issue-marker-cleanup`.

### 3.1 Prep steps (deterministic, before Claude)

1. Download the report artifact, failure screenshots.
2. `ffmpeg` → 2 fps video frames per failed attempt.
3. **`list-run-failures.js`** (replaces `extract-failure-anchors.js`) — walk `results.json`
   `suites → specs → tests`, emit a flat list of every test with `status` `unexpected` or
   `flaky`:
   ```jsonc
   [ { "spec": "...", "title": "...", "status": "unexpected", "error_excerpt": "<first stack line, 200 chars>" } ]
   ```
   No stack-frame parsing, no anchor. Its only job is so Claude works from a clean list instead
   of traversing a large nested JSON tree.
4. Ensure the `qa-triage`, `qa-triage:triage`, `qa-triage:decision` labels exist (`gh label
   create --force`).
5. **Build the shared tracking inventory** (§1.4).

### 3.2 Claude's job

**Step 1 — is each failure already tracked?** Two parts, not a lookup:

1. **Candidate match** — does the failure's `spec + title` appear in `issues[].tests`,
   `triage_prs[].tests`, `decision_prs[].tests`, or `markers[].test`? (`cleanup_prs` is *not* a
   tracked signal — a matching entry there means that PR's green claim is now stale; proceed.)
2. **Cause confirmation** — if yes, determine *this run's* actual root cause from the
   screenshot / video frames / stack (the same investigation done for a brand-new failure) and
   compare it to the matched item's cause:
   - **Same cause** → already tracked. Record "tracked as #N / pending in PR #M" in the summary.
     No issue, no PR, no marker.
   - **Different or additional cause** → the test is failing for something new *on top of* a
     known issue. Treat this failure as new — it flows to Step 2, and in Step 3 gets its own
     issue and a marker **stacked** above the same `test(...)`.

A failure with no candidate match is new → Step 2.

**Step 2 — classify and group the new failures.**

Group failures that **one fix or one product bug explains** into a single group (one broken
shared helper, one missing subtotal update, one dropped request). Tests that fail for genuinely
different reasons stay separate. Everything downstream is per group.

Classify each group:

| Classification | Meaning | Route |
|---|---|---|
| **Product bug** | app behaved incorrectly, test caught something real | Step 3 — markers, issue |
| **Script issue** | the test is wrong/brittle (stale testid, bad assumption, test-side timing) | Step 3 — code fix, no issue |
| **Infra / server flake** | `waitForResponse` / nav timeout with a healthy screenshot — qademo dropping a request under load | Step 3b — decision PR, issue |
| **Inconclusive** | not enough evidence to call bug vs. script | Step 3b — decision PR, issue |

Only call a group **script issue** when the evidence is unambiguous (a testid you can see
changed, a hardcoded value the app no longer returns). If a product bug is still a live
explanation → **inconclusive**.

**Step 3 — one combined PR for the confident groups** (labels `qa-triage` + `qa-triage:triage`,
title `QA triage — run #<RUN ID>`):

- Branch off `<COMMIT>` as `qa/triage-run-<RUN ID>`. Bot identity `qa-triage-bot`.
- **Product-bug group:** file one issue (`gh issue create --label qa-triage`, `## Affected
  tests` block first). Then add `// KNOWN-FAILURE(#N): <reason>` above each affected test's
  `test(...)` — one marker per test, stacking above any existing marker. Every marker in the
  group points at the same `#N`.
- **Script-issue group:** make the minimal fix to the shared cause. No issue. Touch only the
  failing tests' own files and the helpers they call.
- PR body: `## Triage metadata` (`issues:` listing every product-bug issue) + `## Affected
  tests` covering every test in the PR, then one section per group (classification, tests, issue
  link or description of the fix).

**Step 3b — one draft decision PR for the groups you can't call** (labels `qa-triage` +
`qa-triage:decision`, title `QA triage decision — run #<RUN ID>`):

- Branch off `<COMMIT>` as `qa/triage-decision-run-<RUN ID>`, cut **before** the Step 3 branch so
  it inherits none of its commits. One empty commit. **No file changes.**
- File one issue per group.
- Body: `## Triage metadata` (`issues:`) + `## Affected tests` + one section per group:
  - **What failed and why it's ambiguous** — condensed Step 2 points + issue `#N`.
  - **Option 1 — mark it.** The exact `// KNOWN-FAILURE(#N): <reason>` line and which
    `test(...)` it goes above, per affected test. Plus the one manual check that would confirm
    or kill the theory.
  - **Option 2 — fix the test.** A fenced ` ```diff ` against the real files, ready to
    `git apply`.
  - **Recommendation** — a lean, not a verdict.
  - **Resolving #N** — reviewer picks per test, can mix. `#N` closes only if Option 2 is taken
    for *every* test under it (then they add `Closes #N` before marking ready). Any Option 1 →
    `#N` stays open, tracked by the marker.

**When there's nothing to do:** every failure already tracked per Step 1 → report it, one line
each, create nothing. Zero failing tests in the list (build failed for an infra reason) → say
so, create nothing.

---

## 4. The `qa-issue-marker-cleanup` job

The second job of `qa-triage.yml` (§3). Runs on a completed run — `success` **or** `failure` —
via `needs: [qa-results-analysis]` + `if: !cancelled() && …`, so it always runs after the
analysis job (which is skipped on a green run).

### 4.1 Prep steps

1. Download the report artifact.
2. Ensure the `qa-triage`, `qa-triage:cleanup` labels exist.
3. **Build the shared tracking inventory** (§1.4) — the same script, all five lists. Because this
   job runs after `qa-results-analysis`, the PR lists here include any triage / decision PR that
   job just opened — which §4.2 step 3 relies on.

### 4.2 Claude's job

**Step 1 — fate of each marker.** For each entry in `markers[]`, look up its `test` (by `spec`
**and** `title`) in `results.json`:

| This run's result for the marked test | Marker |
|---|---|
| `expected` (passed, first try) | **Remove** — candidate for the PR |
| `flaky` (passed only on retry) | Keep — "still flaky in run #<RUN ID>" |
| `unexpected` (failed) | Keep — still failing, analysis's job |
| `skipped`, or absent from `results.json` | Keep — "not exercised in run #<RUN ID>" (a partial `workflow_dispatch` run) |

A test that passes clean clears **every** marker stacked on it — by evidence, none of its linked
causes is reproducing. Cleanup never reasons about *which* stacked cause is still live; a failing
test just keeps all its markers.

**Step 2 — one removal PR** (labels `qa-triage` + `qa-triage:cleanup`, title
`QA marker cleanup — run #<RUN ID>`):

- Skip entirely if no marker cleared, or if `markers[]` is empty.
- **Dedup check:** if an open PR in `cleanup_prs` already removes this marker, don't open a
  second one.
- Branch off `<COMMIT>` as `qa/marker-cleanup-run-<RUN ID>`. Bot identity `qa-triage-bot`.
- Delete **only** the `// KNOWN-FAILURE(#N)` comment line for each cleared marker — each removal
  its own isolated one-line change, so a reviewer can drop any single one.
- Body: caveat line first (*one green run is not proof a bug is fixed; some of these tests are
  flaky by nature — confirm the fix shipped before merging, drop any removal you doubt*), then
  `## Triage metadata` + `## Affected tests`, then one entry per removed marker (`file:line`,
  owning test, original reason + `#N`, "passed clean in run #<RUN ID>").

**Step 3 — reconcile issues.** For each distinct `#N` referenced by a removed marker, its full
marker set is every `markers[]` entry with `issue == N`.

Close `#N` (add `Closes #N` to the cleanup PR body) **only if all** of:

1. Every marker for `#N` was evaluated and cleared **this run** (all removed by this PR).
2. **No entry in `triage_prs` or `decision_prs` lists `#N` in its `issues`** — i.e. no unmerged
   PR is about to add another marker for `#N`. (`cleanup_prs` is not consulted here — a cleanup
   PR listing `#N` is the opposite signal.) *(This is why cleanup needs the PR lists.)*

Otherwise, don't close — `gh issue comment <N>` listing which markers cleared, which didn't
(still failing / flaky / not exercised / pending in PR #M), and that the issue stays open until
all of its markers clear in one run.

---

## 5. Scripts

| Script | Change |
|---|---|
| `extract-failure-anchors.js` | **Deleted.** Replaced by `list-run-failures.js` — flat failure enumeration, no stack parsing, no anchor. |
| `list-run-failures.js` | **New.** `results.json` → `[{ spec, title, status, error_excerpt }]` for `unexpected` / `flaky` tests. |
| `build-tracking-inventory.js` | **Rewritten** as the single shared inventory builder (§1.4). Parses the `## Affected tests` + `## Triage metadata` blocks; splits PRs into `triage_prs` / `decision_prs` / `cleanup_prs` by the `qa-triage:*` label; position-derives marker → test; emits `issues` / the three PR lists / `markers`. |
| `build-marker-inventory.js` | **Deleted.** Cleanup calls `build-tracking-inventory.js` instead. |
| `lib/markers.js` | **Simplified.** Parser drops the `[spec::title]` bracket and the `tests[]` it produced. `KNOWN-FAILURE(#N): reason` only. Adds the position-derivation helper (grep line → next `test(...)` title). |
| `check-flaky.js` | Unchanged. |
| dashboard scripts | Unchanged. |

---

## 6. Cross-cutting rules

- **One workflow, ordered jobs.** `qa-results-analysis` and `qa-issue-marker-cleanup` are two
  jobs of `qa-triage.yml`, with `qa-issue-marker-cleanup` `needs: [qa-results-analysis]` so
  cleanup always runs after analysis. A workflow-level no-cancel concurrency group
  (`qa-triage-automation`) serialises whole runs, so two stacked Playwright runs can't drive two
  triage passes at once (duplicate issues / PRs / raced issue-close). Trade-off: a triage pass
  waits behind an unrelated one, and cleanup waits behind analysis even on runs where analysis
  has little to do. Acceptable at this repo's push rate.
- **Bot PRs.** PR review skips any bot-authored PR (§2), which covers the triage / decision /
  cleanup PRs. Those still carry `qa-triage` plus a `qa-triage:<type>` label (§1.5) — used by the
  inventory, not the review. Each workflow `gh label create --force`s the labels it needs before
  opening a PR.
- **Bot identity.** The workflows commit as `qa-triage-bot` /
  `qa-triage-bot@users.noreply.github.com`, but `gh pr create` still opens the PR as
  `github-actions[bot]` (the `GITHUB_TOKEN` actor) — that's what the review's bot-author skip keys
  on.
- **Never push to `main`.** Every marker, fix, issue-close and marker-removal lands via a PR a
  human merges.
- **Partial runs.** A `workflow_dispatch` run with a `browser` or `@tag` filter produces a
  partial `results.json`. A marked test absent from it is "not exercised", never "passing".
- **`Closes #N` on merge, never on creation.** An issue is closed by merging a PR that carries
  `Closes #N`, not by an API call at PR-open time — a rejected PR must leave the issue intact.

---

## 7. Accepted gaps

Each of these was raised and consciously accepted rather than designed around.

1. **Rename during an open triage/decision PR.** If a test title is changed while a marker or
   decision PR for it is still open and unmerged, that PR's recorded `## Affected tests` line
   goes stale, the next run's failure won't match it, and analysis may file a duplicate issue.
   Narrow window; a human is reviewing that PR; worst case is one spottable duplicate. Once the
   PR merges, position-derived markers make renames a non-event.
2. **No regression detection.** When an issue is closed and its markers removed, nothing about
   that failure stays tracked. If the test fails again later it is handled as brand new (new
   issue, new markers) — the "this regressed" signal is not preserved.
3. **Stacked-marker clearing is all-or-nothing.** A test with markers for `#12` and `#15` that
   passes clean clears both, even if only `#12` was actually fixed. Justified: a clean pass is
   evidence neither cause is currently reproducing.
4. **Issue/PR `## Affected tests` blocks are as-recorded text.** They can drift from reality on
   a rename while the item is open. Only the `markers` list is always live (position-derived).

---

## 8. Decision log

| # | Question | Resolution |
|---|---|---|
| 1 | How do unmerged PRs become visible to workflows that read `main`? | The inventory's lists, all keyed on `spec + title`. A hit in `issues`, `triage_prs`, `decision_prs`, or `markers` = tracked. No PR-diff parsing. |
| 2 | One root cause failing N tests — one issue or many? | One issue (body lists all N tests), one PR with N markers (one per test). Issue closes only when all N clear in one run. |
| 3 | Multiple unrelated groups in one run — how many PRs? | One combined `triage` PR for all confident groups (markers + fixes), one `decision` PR for all unsure groups. Max two per run. |
| 4 | Regression (closed issue, test fails again)? | Not tracked once closed — handled as new. No detection. |
| 5 | Rename resilience? | Match `spec + title`; marker's test is position-derived. No `[spec::title]` bracket, no anchor fallback. Open-PR rename window accepted. |
| 6 | Intentionally-failing tests churning markers? | No special mechanism. Their issue stays open + marker PR stays unmerged → permanently "tracked" to analysis, invisible to cleanup (which reads `main` only). |
| 7 | Does cleanup need the PR lists? | Yes. Single shared inventory script for both jobs. Fixes duplicate cleanup PRs (via `cleanup_prs`) and premature issue closes (via `triage_prs` / `decision_prs`). |
| 7a | Analysis and cleanup — order / packaging? | One workflow `qa-triage.yml`, two jobs. `qa-issue-marker-cleanup` `needs: [qa-results-analysis]` so it runs after (on green, analysis is skipped and cleanup still runs via `!cancelled()`). Merged rather than two `workflow_run` workflows so cleanup always sees the Playwright run directly (artifacts, run number) instead of resolving it when triggered by analysis. |
| 8 | Marked-but-failing / stacked markers? | Cleanup: pass clears all, fail keeps all. Analysis: candidate match **+ root-cause confirmation**; a new cause on a marked test → new issue + stacked marker. |
| 9 | Decision PR shape? | Draft PR, empty commit, per-group Option 1 (marker lines) / Option 2 (`diff`) / recommendation / per-test close rule. |
| 10 | PR review re-run on new commits? | Yes, every `synchronize`. Reconcile against own prior comments — post only new/unresolved. |
| 11 | PR review trigger scope? | `tests/**` only. |
| 12 | Where does the PR `type` discriminator live? | A `qa-triage:<type>` GitHub label (§1.5), not a body line. Native `gh pr list --label` filtering, UI-visible, unmangleable. Branch prefix is the fallback. |
| 13 | How does PR review skip its own triage PRs? | By bot author (`user.type == 'Bot'`) — those PRs are opened as `github-actions[bot]`, and claude-code-action won't run for a bot actor anyway. The `qa-triage` label is for the inventory, not the review skip. A label clause is only needed if the workflows ever move off `GITHUB_TOKEN`. |

---

## 9. Implementation checklist

- [x] `list-run-failures.js` — new: `results.json` → flat `[{ spec, title, status, error_excerpt }]`.
- [x] `build-tracking-inventory.js` — rewritten to the §1.4 shape (block parsers, label-based PR
      split, marker position-derivation).
- [x] `lib/markers.js` — bracket stripped, `deriveGuardedTitle` position-derivation helper added.
- [x] Delete `extract-failure-anchors.js`, `build-marker-inventory.js`.
- [x] `qa-pr-review.md` — prior-comment reconciliation added; `tests/**`-only scope confirmed.
- [x] `qa-pr-review.yml` — trigger paths `tests/**`; skips bot-authored PRs;
      `synchronize` + `ready_for_review` events.
- [x] `qa-results-analysis.md` — Step 1 rewritten as candidate-match + cause-confirmation; markers
      at test level; `## Affected tests` / `## Triage metadata` blocks; combined-PR + decision-PR
      structure. (Still a standalone prompt file, loaded by the `qa-results-analysis` job.)
- [x] `qa-issue-marker-cleanup.md` — rewritten around the shared inventory; call-graph resolution
      dropped; PR-list dedup + the two-condition close check added.
- [x] `qa-triage.yml` — **new**, replaces `qa-results-analysis.yml` + `qa-issue-marker-cleanup.yml`.
      Two jobs (`qa-results-analysis`, `qa-issue-marker-cleanup`); cleanup `needs` analysis;
      `list-run-failures.js` + shared inventory steps; workflow-level `qa-triage-automation`
      concurrency group.
- [ ] Migrate the existing intentional-failure markers/issues/PRs to the new marker format and
      body blocks. **Outstanding** — needs live GitHub state; see the branch's open bot PRs.
- [x] `README.md` + `docs/design-notes.md` — workflow section and mermaid diagram updated.
- [x] Kept as the standalone workflow reference (not folded into `docs/design-notes.md`).
