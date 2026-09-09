# Task: retire `KNOWN-FAILURE` markers whose tests now pass

This runs after **every** "Playwright Tests" run — pass or fail. Its one job: find
`// KNOWN-FAILURE(#N):` marker comments whose guarded test **passed cleanly in this run**, and
open a single PR that removes them (closing or commenting on the linked issues). It never adds
markers, never edits test logic, never files issues, and never pushes to `main` — a human
reviews and merges the PR.

The counterpart `qa-results-analysis` job (the other job of `qa-triage.yml`, which runs before
this one) handles the other direction (failing/flaky → new markers, issues, fixes). Stay in your
lane: you only remove markers that have gone green.

Tool access is deliberately narrow — `Read`/`Grep`/`Glob`/`Edit` and a short list of `git` / `gh`
subcommands, no general `Bash`, no `jq`/`python3`, no shell pipes. Read `tracking-inventory.json`
and `test-report/results.json` directly with `Read`. RUN ID / RUN URL / COMMIT are in the prompt.

## Test identity

A marked test is identified by **`spec + title`**. Look it up in `results.json` by **both** — a
title alone collides across specs.

## Evidence available

- `tracking-inventory.json` (repo root) — the shared tracking inventory, built by this job (the
  same script the `qa-results-analysis` job uses). Five lists, all keyed on `spec + title`:
  - `markers[]` — `{ file, line, issue, reason, test: { spec, title } }` for every committed
    `// KNOWN-FAILURE(#N)` marker on `main`. `test` is **position-derived** by the builder — you
    do not resolve any call graph. A malformed marker has `test: null` and a `malformed` string:
    report it, leave it alone.
  - `issues[]` — `{ number, summary, tests }` per **open** `qa-triage` issue. An issue absent
    from this list is closed — nothing to do for it.
  - `triage_prs[]` / `decision_prs[]` / `cleanup_prs[]` — `{ number, issues, head_ref, tests }`
    per open PR of each type. You need `triage_prs` / `decision_prs` for the Step 3 close check
    and `cleanup_prs` for the Step 2 dedup check.
- `test-report/results.json` — the Playwright JSON reporter output. Walk `suites` → `specs` →
  `tests`; each test has a `status` (`expected` = passed first try, `flaky` = passed only on
  retry, `unexpected` = failed, `skipped`) and its spec entry has the `file` and `title`. A test
  absent from the JSON did not run in this invocation.

A `workflow_dispatch` run can be **partial** (a non-chromium browser, or a `@tag` filter) — many
tests will be absent. A marked test absent from `results.json` is "not exercised", never
"passing".

## Step 1 — fate of each marker

For each entry in `markers[]`, look up its `test` (by `spec` **and** `title`) in `results.json`:

| This run's result for the marked test | Marker |
|---|---|
| `expected` (passed, first try) | **Remove** — candidate for the PR |
| `flaky` (passed only on retry) | **Keep** — "still flaky in run #<RUN ID>" |
| `unexpected` (failed) | **Keep** — still failing, analysis's job |
| `skipped`, or absent from `results.json` | **Keep** — "not exercised in run #<RUN ID>" |

A test that passes clean clears **every** marker stacked on it — by evidence, none of its linked
causes is reproducing. Never reason about *which* stacked cause is still live; a failing test
just keeps all its markers.

If no marker clears this run, **stop** — create nothing, and report a one-line status for each
marker you checked.

## Step 2 — one removal PR

Labels `qa-triage` + `qa-triage:cleanup`, title `QA marker cleanup — run #<RUN ID>`.

- **Skip entirely** if no marker cleared, or if `markers[]` is empty.
- **Dedup:** if an open PR in `cleanup_prs` already removes a given marker (its `tests` lists
  that marker's `spec + title`), don't remove it again here.
- `git checkout <COMMIT>`, then `git checkout -b qa/marker-cleanup-run-<RUN ID>`.
- `git config user.name qa-triage-bot` / `user.email qa-triage-bot@users.noreply.github.com`.
- Delete **only** the `// KNOWN-FAILURE(#N):` comment line for each cleared marker
  (`markers[].file` and `.line`) — nothing else on the surrounding lines. Keep each removal as
  its own isolated one-line change so a reviewer can drop any single one.
- Commit, push, `gh pr create` (a normal PR, **not** a draft):
  `--label qa-triage --label qa-triage:cleanup`. Capture the PR URL — Step 3 needs it.

PR body:

1. **Caveat line first:** *one green run is not proof a bug is fixed; some of these tests are
   flaky by nature — confirm the fix shipped before merging, and drop any removal you doubt.*
2. `## Triage metadata` — `issues: #<N>, #<M>` listing every issue whose markers this PR removes.
3. `## Affected tests` — `- <spec> :: <title>` for every test whose marker is removed.
4. One entry per removed marker: `<file>:<line>`, the owning test's `spec :: title`, the marker's
   original reason + `#N`, and "passed clean in run #<RUN ID> — <RUN URL>".

## Step 3 — reconcile the linked issues

For each distinct `#N` referenced by a **removed** marker: its full marker set is every
`markers[]` entry with `issue == N`.

**Add `Closes #N` to the PR description** (one per line) — closing the issue on merge — **only if
all** of:

1. Every marker for `#N` was evaluated **this run** and cleared (all of them removed by this PR).
   A marker whose test was flaky, still failing, or not exercised does **not** count as cleared.
2. **No entry in `triage_prs` or `decision_prs` lists `#N`** in its `issues` — i.e. no unmerged
   PR is about to add another marker for `#N`. (`cleanup_prs` is not consulted here.)

If the issue is already absent from `issues[]` (already closed), just note "issue already
closed" and add no `Closes` line.

**Otherwise** (some markers for `#N` didn't clear, or an unmerged PR still references it) — do
**not** add `Closes #N`. Instead `gh issue comment <N>`:

```
Marker(s) for this issue passed cleanly in run #<RUN ID> (<RUN URL>), proposed for removal in <PR URL>:
- <file>:<line> — <spec> :: <title>
Not cleared (still failing / flaky / not exercised this run, or pending in PR #<M>):
- <file>:<line> — <spec> :: <title> — <reason>
Leaving this issue open until all of its markers clear in a single run.
```

End the PR body with: "Each removal is an independent line change — drop any you're not
confident in. If you drop a removal that was part of an all-clear `Closes #N`, delete that
`Closes #N` line too so the issue stays open."

## When there's nothing to do

If every marker is still failing / flaky / not exercised, open no PR and report the per-marker
status. If `markers[]` is empty, say so and stop.
