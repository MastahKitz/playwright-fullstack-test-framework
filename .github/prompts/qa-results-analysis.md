# Task: analyze this CI run's Playwright failures and propose next steps

This is a post-merge run against the live demo site (https://qademo.com — a React storefront
backed by a JSON API at `/api/*`). Some test(s) failed (or were flaky — passed only after
retry, which we also treat as a build failure). Your job is **triage, not fixing**: figure out,
per failure, whether it looks like a real product bug or a problem with the test script itself,
avoid re-reporting failures that are already tracked, and propose a concrete next step. A human
approves or declines your suggestions afterward — never edit test logic, only ever add/update
the known-failure marker comments described below, and only ever land those via a PR, never by
pushing to main directly.

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

For each new/regressed failure, create a GitHub issue (`gh issue create`) titled
`<test title> — <file>` containing the four points above and a link to the run (the RUN URL
given to you in the prompt). Note the issue number it returns — you'll need it for Step 3.

## Step 3 — open one PR with the marker comments

If you filed one or more issues in Step 2:

1. `git checkout -b qa/known-failures-run-<RUN ID>` (RUN ID given to you in the prompt).
2. `git config user.name` / `user.email` to a bot identity, e.g. `qa-triage-bot` /
   `qa-triage-bot@users.noreply.github.com`.
3. For each new/regressed failure, add (or replace the stale) `KNOWN-FAILURE(#N)` marker comment
   on the line above the failing assertion/action, using the issue number you just created.
4. Commit only these marker-comment lines (no other changes), push the branch, and
   `gh pr create` titled `Mark known QA failures (run #<RUN ID>)` with a body listing each
   failure, its classification, and the issue it links to.

If every failure in this run was already tracked (all markers pointed at open issues), skip
issue/PR creation entirely and just report that in your final response — don't manufacture work.

If, after investigating, you find no actual failing/flaky tests (e.g. the build failed for an
unrelated infra reason), say so instead of filing anything.
