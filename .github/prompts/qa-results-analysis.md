# Task: analyze this CI run's Playwright failures and propose next steps

This is a post-merge run against the live demo site (https://qademo.com — a React storefront
backed by a JSON API at `/api/*`). Some test(s) failed (or were flaky — passed only after
retry, which we also treat as a build failure). Your job is **triage, and — only where the
evidence is clear-cut — the fix**: figure out, per failure, whether it looks like a real product
bug or a problem with the test script itself, avoid re-reporting failures that are already
tracked, and land a concrete next step. A human reviews every PR you open before it merges, and
you never push to main directly. What you put in the PR depends on how sure you are:

- **Confident it's a product bug** → the PR adds a `KNOWN-FAILURE(#N)` marker comment (Step 3),
  and you file an issue.
- **Confident it's the test script's fault** → the PR contains the actual fix to the test
  (Step 3). No issue — it's not a bug.
- **Can't tell** (product bug vs. broken test, or an infra/server flake) → you commit nothing.
  You open a **draft "decision PR"** (Step 3b) whose body spells out both a mark-as-bug option
  and a fix-the-test option, and file an issue so the decision is tracked. A human picks which
  option to apply.

Your tool access here is deliberately narrow (only `Read`/`Grep`/`Glob`/`Edit` and a short list
of specific `git`/`gh` subcommands — no general `Bash`, no `jq`, no `python3`, no piped/chained
shell commands). Everything you need is reachable with the allowed tools; reach for those
directly rather than probing for `jq`, `python3 -c`, `gh run view`, or shell pipes — those
aren't granted here and attempting them just burns turns on denied calls instead of doing the
actual analysis. In particular: read `test-report/results.json` and the `.png` screenshots
directly with `Read` (it parses JSON and renders images natively — you don't need `jq`/`python3`
to walk the JSON structure described below), and use `Grep`/`Glob` for anything you'd otherwise
reach for `find`/`grep`/`cat` to do. You already have the RUN ID/URL/COMMIT from the prompt
below, so there's no need to look up run metadata via `gh run view` either.

## Evidence available

- `test-report/results.json` — the Playwright JSON reporter output for this run. Walk `suites` →
  `specs` → `tests` to find every test with `status` `unexpected` (failed) or `flaky`. Each
  entry has the error message, stack trace (including the failing file:line), and
  expected/actual snippets where relevant.
- `test-results/**/test-failed-*.png` — a screenshot of the page at the moment of failure, one
  per failed attempt. **You must open and read this screenshot for every failing/flaky test
  before forming a theory of the root cause.** Look specifically for anything overlaid on the
  page — modal dialogs, popups, toasts, banners, alert text — as well as error banners, empty
  cart, wrong price, blank page, a redirect to `/login`, etc. If a popup or banner has visible
  text, transcribe it verbatim into your analysis; this is direct evidence of what happened and
  takes priority over any theory built purely from reading/comparing code paths.
- `test-results/**/video-frames/frame-*.png` — frames sampled at 2fps from that attempt's video
  recording (pre-extracted by the workflow; the raw `.webm` next to them is not readable by you,
  so don't try to open it directly). **If the single failure screenshot looks unremarkable — a
  normal, static-looking page with nothing obviously wrong — check these frames before concluding
  there was no error.** The screenshot is one instant in time; this app shows some errors as
  toasts/popups that appear a moment after an action and self-dismiss a few seconds later, so a
  transient error can easily be gone by the time the failure screenshot fires while still being
  visible across several consecutive video frames. Skim frames in order for anything that
  appears and then vanishes — that's the signal, not what's on screen at the last frame.
- The test source itself: use Grep/Glob to find the failing spec under `tests/functional/**` and
  read its `.spec.ts`, `.flow.ts`, `.actions.ts`, and `.assertions.ts` siblings to understand
  what was actually being checked and how. Use this to understand the flow, but do not let it
  override what the screenshot actually shows — a plausible-looking code-path explanation (e.g.
  "a preceding step was skipped") is not a substitute for confirming, from the screenshot, what
  state the page was actually in when the failure occurred.

Context that helps distinguish a product bug from a flake: cart/order state is server-side
(keyed by an anonymous `session_id`) and the mutating actions wait on `/api/cart/items` /
`/api/orders` responses. qademo is a small shared demo server that can drop or slow requests
under load — a lone `waitForResponse` timeout on one mutation, with an otherwise-healthy
screenshot, is more likely server flakiness than a script or product bug.

## Step 1 — check for an existing marker before treating a failure as new

Known failures are tracked with a marker comment placed on the line immediately above the
assertion/action that failed, in this exact format:

```
// KNOWN-FAILURE(#123): <short reason> — retriage if this changes
```

For each failing/flaky test from `results.json`, open the file:line from its stack trace and
check the line directly above it:

- **No marker present** → this is a new failure. Go to Step 2.
- **Marker present, and `gh issue view <N> --json state` shows it's still open** → already
  tracked, do not file another issue and do not touch the marker. Just note it in your final
  summary as "already tracked as #N".
- **Marker present, but the linked issue is closed** → this is a regression (supposedly fixed,
  failing again). Treat it as new: go to Step 2, and in Step 3 replace the stale marker with one
  pointing at the new issue instead of leaving the old (wrong) one in place.

Two cases leave no marker to find. A failure that a previous run sent down the **decision-PR**
path (Step 3b) is tracked by an open issue and an open `qa/triage-decision-run-*` PR but has no
committed marker. A failure a previous run **fixed as a script issue** also has no marker (and no
issue) — if the same test is failing again in the same way, the earlier fix was wrong or
incomplete, so treat it as new. Before treating any marker-less failure as new, run
`gh issue list --state open --search "<test title>"` and also search by a distinctive keyword
from the failure (a consolidated issue is titled `<root cause> (<N> tests)`, not by test name,
so a title match alone can miss it — read the bodies of open `<root cause>` issues and any open
`qa/triage-decision-run-*` PR for the `file:line` that just failed). If an open issue already
covers this failure it's already tracked (likely awaiting a human decision) — don't re-file or
open a second decision PR; note it in your summary as "already tracked as #N, decision pending".

## Step 2 — classify each new/regressed failure

1. **What was being asserted** (in plain English).
2. **What actually happened**, grounded in the screenshot for that failure (not just the error
   message/stack) — state plainly what was on screen, including any popup/dialog/banner text.
3. **A classification**:
   - **Likely product bug** — the app behaved incorrectly; the test caught something real.
   - **Likely script issue** — the test itself is wrong or brittle (stale testid, wrong
     assumption, timing/flake in the test's own waiting, hardcoded data that changed), not a
     product problem.
   - **Likely infra/server flake** — a `waitForResponse` / navigation timeout with a healthy
     screenshot, consistent with qademo dropping a request under load rather than a real defect.
   - **Inconclusive** — not enough evidence to tell; say what additional info would resolve it.
4. **A suggested action item** — specific enough to act on, e.g. "update the
   `getByTestId('...')` in `checkout.actions.ts` — the testid changed from X to Y" or "file a
   bug: adding a second item does not update the order subtotal". Not "investigate further"
   unless truly inconclusive.

### Group failures by root cause

Before routing anything, cluster the failures by **underlying cause**, not by test. Two or more
failing/flaky tests belong to the same group when one fix (or one product bug) explains all of
them — the same stale testid, the same broken shared helper, the same missing subtotal update,
the same dropped request. Tests that fail for genuinely different reasons stay in separate
groups. Everything downstream — one issue, one marker set, one decision-PR section — is **per
group**, not per test. A group's classification is the classification of its shared cause; if
tests in a tentative group would classify differently, they aren't really one group — split them.

**Where each group goes next** depends on its classification and how confident you are:

| Classification | Route | Issue filed? |
|---|---|---|
| **Likely product bug** | Step 3 — commit a `KNOWN-FAILURE(#N)` marker on every line in the group | Yes — one per group |
| **Likely script issue** | Step 3 — commit the actual fix to the test | No |
| **Likely infra/server flake** | Step 3b — draft decision PR (mark vs. harden the wait) | Yes — one per group |
| **Inconclusive** | Step 3b — draft decision PR (mark vs. fix the script) | Yes — one per group |

Only call a failure **likely script issue** — and so fix it directly — when the evidence is
unambiguous: a testid you can see has changed, a hardcoded value the app clearly no longer
returns, an assertion that contradicts what every screenshot and video frame shows. If a product
bug is still a live explanation, it's **inconclusive**, not a script issue — send it to Step 3b
and let a human decide.

For every group **except a likely script issue**, create **one** GitHub issue (`gh issue create`):

- **Single-test group** → title `<test title> — <file>`.
- **Multi-test group** → title `<one-line root cause> (<N> tests)`, and in the body list every
  affected `file:line` and test title, then give the four Step 2 points once for the shared
  cause (note per-test differences inline only where they matter).

Every issue body includes a link to the run (the RUN URL given to you in the prompt). For an
inconclusive/flake group, also put both Step 3b options into the issue body verbatim — the exact
marker line **for each affected line** in the group, and the exact `diff` or hardening change —
so the issue stands on its own. Note each issue number — the marker comments and PR bodies
reference it.

## Step 3 — one combined PR for the confident failures

If you have one or more groups classified **likely product bug** or **likely script issue**,
put them all in a single PR:

1. If this run also has Step 3b failures, create that branch first (Step 3b step 1) so it stays a
   clean base. Then `git checkout <COMMIT>` (COMMIT is in the prompt) and
   `git checkout -b qa/triage-run-<RUN ID>`.
2. `git config user.name` / `user.email` to a bot identity, e.g. `qa-triage-bot` /
   `qa-triage-bot@users.noreply.github.com`.
3. For each **likely product bug** group: add (or replace the stale) `KNOWN-FAILURE(#N)` marker
   comment on the line above the failing assertion/action, using the group's issue number — one
   marker per failing line, every marker in the group pointing at the same `#N`.
4. For each **likely script issue** group: make the minimal fix that addresses the shared root
   cause — the stale testid, the wrong assumption, the bad wait. One group is usually one fix
   even when several tests failed on it. Touch only the failing tests' own files (`.spec.ts` /
   `.flow.ts` / `.actions.ts` / `.assertions.ts` and the shared helpers they call); don't
   refactor around it.
5. Commit, push, and `gh pr create` titled `QA triage — run #<RUN ID>`. The body has one entry
   per group: its classification, the tests it covers, and either the issue it links to (product
   bug) or a plain-English description of what was wrong and what you changed (script issue).

## Step 3b — one draft decision PR for the failures you can't call

For failures classified **likely infra/server flake** or **inconclusive**, you don't get to
decide between "the test is wrong" and "this is a real bug" — a human does. Make that choice a
single action either way, parked in a **draft PR with no code changes**.

1. `git checkout <COMMIT>` (COMMIT is in the prompt), then
   `git checkout -b qa/triage-decision-run-<RUN ID>` — cut this before the Step 3 branch so it
   never inherits Step 3's commits; it must stay empty of file changes.
2. Same bot identity as Step 3.
3. `git commit --allow-empty -m "QA triage decision — run #<RUN ID>"`. The PR deliberately has
   zero file changes; it is a container for the writeup and the place a human applies whichever
   option they pick.
4. `git push` the branch and `gh pr create --draft` titled `QA triage decision — run #<RUN ID>`.

The PR body has one section per group (i.e. per issue `#N`). Each section contains:

- **What failed and why it's ambiguous** — the four Step 2 points, condensed, plus the linked
  issue `#N`. If the group covers more than one test, list every affected `file:line`.
- **Option 1 — mark it as a known failure.** The exact line(s) to add and where — **one marker
  per affected line** in the group:
  ```
  <file>:<line above the failing assertion>
  // KNOWN-FAILURE(#N): <one-line reason> — needs human investigation, see <RUN URL>
  ```
  Plus one line naming the specific manual check that would confirm or kill the bug theory (for
  an inconclusive group) or confirm it's just server load (for a flake).
- **Option 2 — fix the test.** The exact change as a fenced ` ```diff ` block against the real
  file(s), matching surrounding indentation, ready to `git apply` — a script fix for an
  inconclusive group, or wait/retry hardening for a flake. One diff usually covers the whole
  group. If you genuinely can't name a plausible change, write "Option 2 — none identified" and
  say what evidence would settle it.
- **Recommendation** — which way you lean and why, stated as a lean, not a verdict.
- **Resolving #N.** State explicitly: the reviewer chooses per affected line, and they can mix
  options within the group. `#N` is closed **only if Option 2 is taken for every line in the
  group** — in that case they add `Closes #N` to this PR's description before marking it ready,
  and the issue auto-closes on merge. If Option 1 is taken for even one line, `#N` stays open and
  the `KNOWN-FAILURE(#N)` marker(s) track it — do **not** add `Closes #N`.

End the body with: "Per affected line, apply Option 1 (marker) or Option 2 (diff), then mark this
PR ready. For each issue #N, add `Closes #N` to this description only if you took Option 2 for
every line under it; otherwise leave it open. The empty commit can be dropped either way."

If there are no inconclusive/flake failures this run, skip Step 3b.

## When there's nothing to do

If every failure in this run was already tracked (markers pointed at open issues, or an open
issue / decision PR already covers it), skip all issue/PR creation and just report that — don't
manufacture work.

If, after investigating, you find no actual failing/flaky tests (e.g. the build failed for an
unrelated infra reason), say so instead of filing anything.
