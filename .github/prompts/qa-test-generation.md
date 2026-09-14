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
3. **The application itself — its codebase or its live behavior at qademo.com — is never a source
   of truth for correctness.** Don't derive an expected value by reading how the app currently
   behaves; that makes any existing bug quietly become the "expected" result, which defeats the
   point of the test. If something about the ticket can only be confirmed by looking at the app
   (an exact copy string, a field's shape) and the existing suite doesn't already establish it,
   that's a gap — flag it (Step 2), don't fill it in by matching current behavior. Same if the
   ticket's described behavior appears to contradict what the existing suite currently asserts —
   that's a discrepancy for a human to resolve, not something to silently reconcile.

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
  — importantly — for real testids and locators already in use. **Don't invent a testid.** If a
  scenario needs one that isn't already used anywhere in the suite and the ticket/attachments
  don't spell it out unambiguously, that's a gap to flag, not guess at.
- [`docs/design-notes.md`](../../docs/design-notes.md) — background on the app and prior design
  decisions, useful context for judging what's in scope for the UI vs. API layer.

## Step 1 — read the ticket, list the scenarios

Translate the ticket into concrete scenarios: what should be true, from a user's (or, for an
API-layer story, a client's) perspective, for this story to be considered covered. Pull scenarios
from the description's acceptance criteria if it has them. If the ticket is only a title/summary
with no real acceptance criteria, work only from what's actually stated — don't invent
requirements the ticket doesn't ask for.

## Step 2 — check existing coverage, then classify each new scenario

For every scenario from Step 1:

- **Search `tests/functional/**` for a test that already covers it** (by behavior, not just a
  keyword match on the title). Already covered → note it in your summary, nothing else to do for
  that scenario.
- **Not covered** → classify:
  - **Confident** — the expected behavior is concrete and unambiguous, and everything needed to
    write it (testids/locators, API endpoint and payload shape, expected copy/status) is either
    already established in the existing suite or unambiguously stated in the ticket/attachments.
  - **Flag** — the ticket is ambiguous or underspecified for this scenario (no clear expected
    result to assert), or writing it would require a testid/endpoint/copy that isn't in the
    existing suite and isn't unambiguous from the ticket, or the ticket appears to contradict what
    the existing suite currently treats as correct.

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
   (rule 7), exact-match assertions (rule 8), `{ tag: [...] }` matching the domain plus `@api` /
   `@mutating` where it applies (rule 9), a deterministic wait after every click — never
   `waitForTimeout` (rule 11), and the `'validate user can/cannot <do something>'` title shape
   (rule 13). If the domain/feature folder doesn't exist yet, create it with the same file split
   as an existing domain, don't bolt the new scenario onto an unrelated file.
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
  say" or "what testid does the new shipping-estimate row use — nothing in checkout.actions.ts or
  the ticket's screenshots names one">
```

Ask a precise question per scenario, not a generic "please clarify."

## When there's nothing to do

- **Every scenario already covered** → say so in your final summary, create nothing.
- **The ticket has no testable behavior** (a spike, a chore, pure refactor with no user-visible
  change) → say so, create nothing.

## Output

End with a plain-English summary: the ticket key, every scenario from Step 1, and what happened to
each — already covered, generated in PR #N, or flagged in issue #N.
