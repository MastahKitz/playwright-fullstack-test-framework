# Task: retire `KNOWN-FAILURE` markers whose tests now pass

This runs after **every** "Playwright Tests" run — pass or fail. Its one job: find
`// KNOWN-FAILURE(#N)` marker comments in the test suite whose guarded test **passed cleanly in
this run**, and open a single PR that removes them. It never adds markers, never edits test
logic, never files issues, and never pushes to `main` — a human reviews and merges the PR.

The counterpart workflow `qa-results-analysis.yml` handles the other direction (failing/flaky
tests → new markers, issues, fixes). Stay in your lane: you only remove markers that have gone
green.

Your tool access is deliberately narrow — `Read`/`Grep`/`Glob`/`Edit` and a short list of
`git`/`gh` subcommands, no general `Bash`, no `jq`/`python3`, no shell pipes. Read
`test-report/results.json` directly with `Read` (it parses JSON); use `Grep`/`Glob` instead of
`find`/`grep`/`cat`. RUN ID / RUN URL / COMMIT are in the prompt — don't look them up.

## Evidence available

- `test-report/results.json` — the Playwright JSON reporter output for this run. Walk `suites` →
  `specs` → `tests`. Each test has a `status` (`expected` = passed first try, `flaky` = passed
  only on retry, `unexpected` = failed, `skipped`) and a `title`, and its spec entry has the
  `file`. A test absent from the JSON did not run in this invocation.
- The test source under `tests/functional/**` — `.spec.ts`, `.flow.ts`, `.actions.ts`,
  `.assertions.ts`. Use it to map a marker to the test(s) that exercise it.

Note: a `workflow_dispatch` run can be a **partial** run — a non-chromium browser, or a `--grep`
tag filter — so many tests will be absent. That's fine; those markers are just "not exercised
this run" (see below), not "passing".

## Step 1 — find every marker and the test that owns it

`Grep` for `KNOWN-FAILURE\(#` across `tests/functional/**`. For each hit you have `<file>:<line>`
and the issue number `#N` from the `KNOWN-FAILURE(#N)` text.

Work out which test(s) the marker guards. The marker sits on the line directly above a failure's
*anchor* — the deepest frame of the failing stack that is in a
`*.{spec,flow,actions,assertions}.ts` file under `tests/functional/` — so it is usually in a
helper, not the spec:

- Marker in a `*.spec.ts` → the enclosing `test('<title>', …)` block.
- Marker in a `*.flow.ts` / `*.actions.ts` / `*.assertions.ts` helper → `Grep` for the enclosing
  exported function's name to find the `*.spec.ts` (or `*.flow.ts`) that call it, and from there
  the enclosing `test('<title>', …)` block(s). A helper in a feature folder is normally used only
  by that folder's specs; if a marker is genuinely reachable from several tests, all of them own
  it.

## Step 2 — decide each marker's fate from this run

| This run's result for the owning test(s) | Marker |
|---|---|
| **All** owning tests `expected` (passed, no retry) | **Remove** — candidate for the PR |
| Any owning test `flaky` (passed only on retry) | **Keep** — note "still flaky in run #<RUN ID>" |
| Any owning test `unexpected` (failed) | **Keep** — still failing, that's the other workflow's job |
| Any owning test `skipped` or absent from the JSON | **Keep** — "not exercised in run #<RUN ID>" |

Only a clean first-try pass for every test that routes through the marker clears it. Anything
else, the marker stays and you say why in the final summary (don't open a PR entry for it).

If no markers clear this run, **stop** — post nothing, create nothing, and report "no markers
cleared this run" with a one-line status for each marker you checked.

## Step 3 — one PR removing the cleared markers

1. `git checkout <COMMIT>` (COMMIT is in the prompt), then
   `git checkout -b qa/issue-marker-cleanup-run-<RUN ID>`.
2. `git config user.name` / `user.email` to the bot identity `qa-triage-bot` /
   `qa-triage-bot@users.noreply.github.com`.
3. Delete **only** the `// KNOWN-FAILURE(#N): …` comment line for each cleared marker — nothing
   else on the surrounding lines. Keep each removal as its own isolated one-line change so a
   reviewer can drop any single one they don't trust.
4. Commit, push, and `gh pr create` (a normal PR, **not** a draft) titled
   `QA marker cleanup — run #<RUN ID>`. Capture the PR URL from the command output — Step 4
   needs it.

The PR body has **one entry per removed marker**:

- `<file>:<line>` and the owning test title(s).
- The marker's original reason text and its issue `#N`.
- "Passed cleanly in run #<RUN ID> — <RUN URL>."

Then a **caveat line** at the top of the body: one green run is not proof a bug is fixed
(some of these tests are intermittently flaky by nature) — the reviewer should confirm the fix
actually shipped before merging, and drop any removal they're unsure about.

## Step 4 — reconcile the linked issues

For each distinct issue `#N` referenced by any **removed** marker, `Grep` the whole repo with the
regex `KNOWN-FAILURE\(#N\)` — substitute the actual number, keep the backslashes (`Grep` is
ripgrep, so the parens must be escaped), and keep the closing `\)` so that e.g. `#12` does not
also match `#123`. That gives the complete set of `file:line`s still pointing at `#N`. Then check
`gh issue view <N> --json state,title`.

Closing `#N` requires that **every** marker pointing at it was *evaluated and cleared in this
run* — all of them removed by this PR. A marker whose test **did not run this run** (a partial
`workflow_dispatch` — non-chromium browser or a tag filter) is **not** cleared, even though the
current run shows no failure for it: its status is unknown, not green. Treat it exactly like a
still-failing marker.

- **Every marker for `#N` is being removed in this PR**, and the issue is open → add `Closes #N`
  to the PR description (one per line) so merging the PR closes it. Note this in that issue's
  entry in the body.
- **Every marker for `#N` is being removed**, but the issue is **already closed** → nothing to
  do; just note "issue already closed" in the entry.
- **Some markers for `#N` are not being removed** — still failing/flaky, *or their test wasn't
  exercised this run* → do **not** add `Closes #N`. Instead `gh issue comment <N>` with:

  ```
  Marker(s) for this issue passed cleanly in run #<RUN ID> (<RUN URL>) and are proposed for
  removal in <PR URL>:
  - <file>:<line> — <owning test title>
  Not cleared (still failing/flaky, or not exercised in this run):
  - <file>:<line> — <owning test title> — <still failing | flaky | not run this run>
  Leaving this issue open until all of its markers clear in a single run.
  ```

End the PR body with: "Each removal is an independent line change — drop any you're not
confident in. If you drop a removal that was part of an all-clear `Closes #N`, delete that
`Closes #N` line too so the issue stays open."

## When there's nothing to do

If every marker is still failing / flaky / not exercised, open no PR and report the per-marker
status. If the suite has no `KNOWN-FAILURE` markers at all, say so and stop.
