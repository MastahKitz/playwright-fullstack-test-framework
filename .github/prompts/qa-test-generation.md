# Task: generate Playwright test coverage for one Jira ticket

Manual, one-ticket-at-a-time pilot. Your job: read the ticket, work out what test coverage it
implies, and land it — writing actual test code for the parts you're confident about, and asking
a human for the rest instead of guessing. You never push to `main`; a human reviews and merges
every PR you open, the same as any other change to `tests/**`.

## Source of truth — read this before anything else

1. **The Jira ticket (`jira-ticket.json`, plus its epic and linked issues) is the only source of
   truth for what correct behavior *is*.** It's the human-authored statement of intended
   behavior — what the app is supposed to do.
2. **The existing suite under `tests/functional/` is a supplement, not a source of correctness.**
   Use it to see what's already covered (so you don't duplicate a scenario) and to learn existing
   mechanics — real testids, real data shapes, quirks like the access-token lifecycle documented
   in [`docs/design-notes.md`](../../docs/design-notes.md)'s "Calls worth explaining" section.
3. **The ticket tells you WHAT; the live app is where you confirm HOW.** A story states intended
   behavior, not implementation — it won't name a testid, won't spell out the exact DOM structure,
   and often won't give you the literal copy on screen. For all of that, log into the live app
   (`https://qademo.com` — see "Live app access" below) and look: find the real testid, watch the
   actual flow, read the actual field shapes and copy. This is expected, not a fallback.
   **What the live app must never decide is correctness.** Don't derive an *expected value* — a
   business rule, a calculated result, whether an action should succeed or fail — by reading what
   the app currently does; that makes any existing bug quietly become the "expected" result, which
   defeats the point of the test. If what you observe live contradicts what the ticket describes,
   that's a discrepancy — flag it (Step 2), don't silently write the test to match current
   behavior. Same if the ticket's described behavior appears to contradict what the existing suite
   currently asserts as correct.

## Inputs available

- `jira-ticket.json` — `{ key, summary, description, components, labels, epic, linkedIssues,
  attachments }`. Read it with the ticket's own key as your primary scope; `epic` and
  `linkedIssues` are context, not additional scenarios to cover unless the ticket itself
  references them.
- `jira-attachments/` — image attachments, readable directly. Any video attachment has its frames
  pre-extracted at 2fps to `jira-attachments/video-frames/<name>/frame-*.png` (the raw video file
  itself isn't readable — read the frames in order).
- [`docs/conventions.md`](../../docs/conventions.md) — inlined below. The single source of truth
  for how test code must be structured. Every line you write follows it; cite the rule number in
  your PR description the way the PR-review bot does.
- `tests/functional/**` — the existing suite. `Grep`/`Glob` to find the feature folder(s) the
  ticket concerns. An existing `.actions.ts` / `.assertions.ts` / `.flow.ts` / `.data.ts` /
  `.spec.ts` sibling in that domain is the reference implementation for shape, naming, tags, and
  real testids/locators already in use — check here first, since reusing a known-good locator
  beats re-discovering it live.
- [`docs/design-notes.md`](../../docs/design-notes.md) — background on the app and prior design
  decisions, useful context for judging what's in scope for the UI vs. API layer.
- **Live app access** — a headless browser via the `mcp__playwright__browser_*` tools
  (`browser_navigate`, `browser_snapshot` for the accessibility tree, `browser_evaluate` to read
  actual `data-testid` attributes off the DOM — the accessibility snapshot won't show them,
  `browser_click` / `browser_type` / `browser_fill_form` / `browser_select_option` to drive a
  flow, `browser_network_requests` to see the real request/response an action makes). Base URL and
  login credentials (standard + admin) are in the prompt above. **Use this to ground HOW a
  scenario needs to be written** — the real testid, the real flow steps, the real request shape —
  never to decide what the correct outcome should be (source-of-truth rule 3). Close the browser
  (`browser_close`) when you're done exploring, before Step 3.

## Step 1 — read the ticket, list the scenarios

Translate the ticket into concrete scenarios: what should be true, from a user's perspective, for
this story to be considered covered. Pull scenarios from the description's acceptance criteria if
it has them. If the ticket is only a title/summary with no real acceptance criteria, work only
from what's actually stated — don't invent requirements the ticket doesn't ask for.

A ticket almost never mentions the API explicitly — it describes a page, not an endpoint — so
**don't decide whether this feature gets API-layer scenarios by whether the ticket talks about an
API.** Decide it from domain precedent instead: check whether the feature's domain already
contains any `<name>-api.*.ts` files (`Glob tests/functional/<domain>/*-api.*`).
- **Domain already has an established UI+API pairing** (e.g. `auth/` has `auth-api.spec.ts`
  alongside `auth.spec.ts` for login) → that question is already answered for this domain. Add the
  client-facing equivalent of each UI scenario as its own scenario in this list — same rule-1 file
  split, `-api` suffix — and take it through Step 2 exactly like a UI scenario, including finding
  the real endpoint/payload live (`browser_network_requests`) the same way you'd find a testid.
  Don't stop at spot-checking one API scenario incidentally while grounding something else; list
  and cover the API layer as deliberately as the UI layer.
- **Domain has no `-api` files at all** → there's no established precedent either way (the same
  situation that led to declining cart-api coverage previously — a human call, not something to
  infer). Whether this new feature should get API-layer tests is a genuine scope question: note it
  in your summary and, if nothing else about the ticket is flagged, flag it on its own (Step 4)
  rather than silently deciding either way.

Either way, **never let API-layer coverage simply go unmentioned.** Your final summary and the PR
body must say what happened to it — generated, already covered, or flagged — the same as every
other scenario.

## Step 2 — check existing coverage, then classify each new scenario

For every scenario from Step 1:

- **Search `tests/functional/**` for a test that already covers it** (by behavior, not just a
  keyword match on the title). Already covered → note it in your summary, nothing else to do for
  that scenario.
- **Not covered** → work out the mechanics before you classify. If a locator, flow step, request
  shape, or copy string isn't already established in the existing suite or spelled out in the
  ticket, go find it live (see "Live app access" above) rather than treating it as unknown — the
  ticket was never going to name a testid, that's expected.

  When a scenario implies checking more than one similar condition — "duplicate accounts are
  rejected" on a form with several unique-ish fields (email, username, ...), a rule that plausibly
  applies to more than one input — **try each condition live, individually**, don't stop at the
  first one that confirms the scenario. If they don't all behave the same way (email correctly
  rejects a duplicate, username silently allows one), that inconsistency is itself a finding: it
  reads as a partial implementation or a missed requirement, not as "the scenario passed." Don't
  quietly write a test for only the field that worked and drop the other, and don't write a test
  asserting the gap as if it were intended — flag it (below) so a reviewer decides whether it's a
  real bug or as-designed.

  Then classify:
  - **Confident** — the *expected behavior* (what should happen, per the ticket) is concrete and
    unambiguous, and you now know the mechanics needed to write it — either from the existing
    suite, unambiguously from the ticket, or confirmed live — and, where the scenario implied
    multiple similar conditions, they all behaved consistently with each other.
  - **Flag** — reserved for the ticket itself, not for mechanics you can go check:
    - the ticket is ambiguous or underspecified about the *expected result* (no clear "what should
      happen" to assert, and live exploration can't settle it — that would be reading correctness
      off the app, which rule 3 rules out);
    - what you observed live contradicts what the ticket describes, or contradicts what the
      existing suite currently treats as correct — a real discrepancy, not a missing detail;
    - a scenario implying multiple similar conditions behaved inconsistently across them live (see
      above) — describe exactly which conditions passed and which didn't;
    - the scenario needs a part of the app you genuinely can't reach or observe (e.g. it depends on
      server-side state or a role you don't have credentials for).

Group flagged scenarios that share the same open question, same as grouping by cause elsewhere in
this repo's automation — don't open five near-duplicate questions.

## Step 3 — confident scenarios: write the tests, open one PR

Skip this step entirely if there are no confident scenarios.

1. `git checkout` the base commit, then `git checkout -b qa/test-gen-<TICKET>-<RUN NUMBER>`.
2. `git config user.name qa-test-gen-bot` / `user.email
   qa-test-gen-bot@users.noreply.github.com`.
3. Write the actual test code for every confident scenario, following `docs/conventions.md`
   exactly — correct file split (rule 1), `.spec.ts` calling only flow/assertion helpers or a
   single named action (rule 2), testid-first locators (rule 6), `expect.soft` in assertions
   (rule 7), exact-match assertions (rule 8), `{ tag: [...] }` matching the spec's own feature
   folder plus `@api` / `@mutating` where it applies (rule 9), a deterministic wait after every
   click — never `waitForTimeout` (rule 11), and the `'validate user can/cannot <do something>'`
   title shape (rule 13). Before picking where a new scenario's files go, apply rule 1's
   subfolder test: is this a genuinely different page/entry-point with its own data shape (→ its
   own `<feature>/` subfolder, e.g. `auth/signup/`, `order/cart`, `order/checkout`), the same
   feature at a different interaction layer (→ `-api` suffix, sibling to the UI files, not a
   subfolder), or a negative-path variant of an existing feature (→ `-error` suffix spec, not a
   subfolder)? Never bolt a genuinely-new feature onto an existing flat domain file just because
   the domain already has one, and never move or rename files that are already flat to "make
   room" for a new subfoldered feature — adding a subfolder never touches what's already there.
4. Commit, push, and open the PR:
   `gh pr create --label qa-test-generation --title "QA test generation — <TICKET>: <ticket
   summary>"`. Body:

   ```
   ## Ticket
   <TICKET>: <ticket summary>

   ## Scenarios covered
   - <scenario, plain English> — <spec file> :: 'validate ...'

   ## Already covered (no changes)
   - <scenario> — existing test at <spec> :: 'validate ...'

   ## Flagged (see #<N>)
   - <scenario> — needs input before it can be generated, see issue #<N>
   ```

   Omit the "Already covered" section if empty. Omit "Flagged" (and its issue reference) if Step 4
   didn't run.

## Step 4 — flagged scenarios: open one issue, no code

Skip this step entirely if nothing was flagged.

`gh issue create --label qa-test-generation --title "QA test generation — <TICKET>: needs input
before generating tests"`. Body:

```
## Ticket
<TICKET>: <ticket summary>

## Needs input before these can be generated
- <scenario>: <what the ticket seems to ask for> — <the specific question a human needs to
  answer, e.g. "is the expected discount 10% or the cart subtotal's rounding — the ticket doesn't
  say"; "the ticket says an out-of-stock item should be blocked at checkout, but the live app
  currently lets it through to payment — is the ticket describing a fix that isn't shipped yet, or
  is my reading of 'out of stock' wrong?"; or "AC5 says duplicate accounts are rejected — tried
  registering with a duplicate email (rejected, as expected) and a duplicate username with a new
  email (allowed through, no error) — is username meant to be unique too, or is email the only
  intended uniqueness check?">
```

Ask a precise question per scenario, not a generic "please clarify."

## When there's nothing to do

- **Every scenario already covered** → say so in your final summary, create nothing.
- **The ticket has no testable behavior** (a spike, a chore, pure refactor with no user-visible
  change) → say so, create nothing.

## Output

End with a plain-English summary: the ticket key, every scenario from Step 1 (UI and, per the
domain-precedent check above, API), and what happened to each — already covered, generated in
PR #N, or flagged in issue #N. If a whole layer went uncovered, say so explicitly and why — a
layer that's simply absent from the summary, with no PR/issue/coverage note at all, is the failure
mode this section exists to prevent.
