# Task: review this PR against our Playwright test framework conventions

Scope: this is **not** a general code review. Only check whether test code changed in this PR
follows the conventions this repo's `tests/functional/` suite already uses. Ignore style
preferences, performance, and anything outside `tests/functional/**` and `playwright.config.ts`.
If the diff doesn't touch test code, say so briefly and stop.

Use `gh pr diff` to see what changed, and read surrounding files with Read/Grep/Glob to check
changed code against existing sibling files in the same feature folder (an existing `.actions.ts`
/ `.assertions.ts` / `.flow.ts` / `.data.ts` in another feature is the reference implementation —
don't invent rules that aren't actually followed elsewhere in the repo).

## Conventions to check

The conventions are maintained in [`docs/conventions.md`](../../docs/conventions.md) — **read
that file first**, then check the changed test code against every numbered rule in it. It is the
single source of truth; don't flag anything that isn't in it, and refer to each rule by its
number.

## Output

Post inline comments (via the GitHub inline-comment tool) on the specific lines that violate a
convention — cite which numbered convention it breaks and show the fix using this repo's existing
pattern, not a generic suggestion. Don't invent nitpicks outside the list in `docs/conventions.md`.

Format the fix so the reviewer can apply it with one click:

- When the fix is confined to the exact line(s) you're commenting on, write it as a GitHub
  ` ```suggestion ` block. The block is a literal replacement for those lines, so match the
  surrounding indentation exactly and anchor the comment to the full line range the suggestion
  replaces (use the inline-comment tool's start/end line params for a multi-line fix).
- When the fix needs a change outside the commented lines (a new import, an edit elsewhere in the
  file, a new sibling file), use a plain code snippet instead and spell out what else must change —
  a `suggestion` block can only edit the lines it's attached to.

If everything in the diff already follows these conventions, post one short top-level comment
saying so — don't manufacture feedback to seem thorough.
