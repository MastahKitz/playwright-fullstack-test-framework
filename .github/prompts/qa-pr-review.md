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

1. **File split per feature** — each feature under `tests/functional/<domain>/[<feature>/]`
   separates concerns into `<name>.actions.ts` (raw Playwright interactions/locators),
   `<name>.assertions.ts` (checks), `<name>.data.ts` (typed input fixtures), `<name>.flow.ts`
   (multi-step flows composed from actions), and `<name>.spec.ts` (test cases). Domains like
   `auth` and `product` keep these files flat in the domain folder; add a `<feature>/`
   subfolder only for independently-testable sub-features (`order/cart`, `order/checkout`). A
   change that dumps locators or assertions directly into a `.spec.ts` or `.flow.ts` breaks
   this split. A domain's API-layer tests get their own file set with an `-api` suffix on the
   same base name, sitting alongside the UI files in the same domain folder and following the
   identical split — `auth-api.actions.ts` / `auth-api.assertions.ts` / `auth-api.data.ts` /
   `auth-api.flow.ts` / `auth-api.spec.ts` (+ `auth-api-error.spec.ts`) next to `auth.actions.ts`
   etc. Only the interaction layer differs — raw `request.fetch(...)` calls via `api.utils.ts`
   instead of `page.*` — the actions/assertions/data/flow/spec split and every other convention
   here apply exactly the same way.

2. **`.spec.ts` files contain no raw `page.*` calls and no raw `expect(...)`.** They call
   flow/assertion helpers. Calling a single named **action** directly from a spec is fine when
   there's no multi-step journey to name (the suite already does this with `openHomePage`,
   `clickViewCartButton`) — but a new interaction or check belongs in that feature's
   `.actions.ts` / `.assertions.ts`, never inline in the test.

3. **`.flow.ts` functions compose two or more actions/flows.** A flow that just forwards to a
   single action is pointless indirection — it should be deleted and the action called
   directly.

4. **`.data.ts` holds every typed data-shape declaration — interfaces/types for both input
   fixtures and expected/response structures — regardless of whether it's used as input or as an
   expected value.** `CartData`/`CartItemData` (`cart.data.ts`), `CheckoutFormData`
   (`checkout.data.ts`), and `LoginResponseBody`/`ExpectedLoginUser` (`auth-api.data.ts`) all live
   in `.data.ts` even though some are passed in and some describe what the app returns. Only the
   literal expected *values* that the app produces — error messages, headings, status text — are
   exempt: those live in `.assertions.ts`, baked into a named assertion function (one per
   message), the way `auth.assertions.ts` and `checkout.assertions.ts` do it. A type/interface
   declared inside a `.assertions.ts` file, or a hardcoded error string sitting in `.data.ts`, are
   both smells. A negative test that only overrides one or two fields of an existing fixture does
   **not** get a new named fixture — spread the base fixture and override inline at the call site
   (`{ ...standardCheckoutForm, shippingInfo: { ...standardCheckoutForm.shippingInfo, firstName: '' } }`
   in `checkout-error.spec.ts`; `{ ...standardUserLoginBody, password: '' }` in
   `auth-api-error.spec.ts`). Declaring a dedicated `blankFirstNameForm`/`blankUsernameLoginBody`
   fixture per field doesn't scale — a 30-field form testing every required field would clutter
   `.data.ts` with one fixture per field.

5. **Reusable utility functions live in `tests/functional/utils/<name>.utils.ts`, not
   duplicated per feature.** A helper needed by more than one feature — a pure function (parsing,
   formatting, date math) or a shared Playwright-touching primitive (sending a request, asserting
   a response) alike — belongs in a shared `.utils.ts` file under `tests/functional/utils/` and
   gets imported, not copy-pasted. `utils/data.utils.ts` holds `parsePrice`/`formatPrice`,
   imported by both `cart.assertions.ts` and `checkout.assertions.ts`. `utils/api.utils.ts` holds
   the API-layer primitives every domain's API tests build on — `sendApiRequest`,
   `assertResponseStatus`, `assertResponseBody` — so a domain's `.actions.ts` calls
   `sendApiRequest` rather than `request.fetch(...)` directly, and its `.assertions.ts` builds
   named assertions on top of `assertResponseStatus`/`assertResponseBody` rather than
   reimplementing status/body checks inline. The same function copy-pasted into two feature files
   instead of shared is a duplication bug, not a style nit.

6. **Locators are testid-first.** Use `getByTestId(...)` (including regex testids like
   `getByTestId(/^cart-item-\d+$/)`) for element identity — clicks, scoping, reading a field's
   value. Fall back to `getByRole` / `getByLabel` only where there is no testid (e.g. the login
   form inputs). Keep `getByRole` / `getByText` where the visible semantics are the thing under
   test — a user-facing error message, an accessible name, a heading level. Raw CSS/XPath is
   acceptable only when there is genuinely no testid and no meaningful role (e.g.
   `.locator('xpath=../..')` to reach an unlabelled parent row) and should carry a short comment.

7. **Assertions use `expect.soft(...)`**, not bare `expect(...)`, inside `.assertions.ts` files,
   so a single test surfaces every failing check instead of stopping at the first.

8. **Assertions match exactly unless the value genuinely isn't fixed.** Prefer `toHaveText(...)`
   (exact) over `toContainText(...)`, and `getByText(..., { exact: true })` over a substring
   match. Assert an element's full text via its testid rather than fishing for a fragment. When
   a value really is dynamic — an order number, today's date, a stock count — match an anchored
   regex (`toHaveText(/^Order #\d+$/)`) or compute the expected value; don't loosen to a partial
   match to make it pass. The same principle applies to API response bodies:
   `assertResponseBody(actual, expected, options)` (`utils/api.utils.ts`) defaults to a partial
   match (`toMatchObject`) so unlisted fields aren't a problem, but pass `{ exact: true }` once
   the full response shape is known, so an unexpected extra field gets caught (see
   `assertLoginSuccess` in `auth-api.assertions.ts`). For a field that's genuinely dynamic every
   run — a JWT, a generated id — mix an asymmetric matcher like `expect.stringMatching(/regex/)`
   into the same `expected` object alongside the exact fields, the same way an anchored regex
   handles a dynamic value in the UI; don't drop to a full partial match just because one field
   is dynamic.

9. **Every `test.describe(...)` has a `{ tag: '@xxx' }`** consistent with its domain (existing
   tags: `@auth`, `@product`, `@cart`, `@checkout`). API-layer specs carry a second `@api` tag
   alongside their domain tag — e.g. `{ tag: ['@auth', '@api'] }` in `auth-api.spec.ts` — so the
   API suite can be run or filtered independently of the UI suite.

10. **`test.describe.configure({ mode: 'serial' })`** is required when a suite's tests depend on
    state left behind by earlier tests in the same file. When that state lives in one browser
    context (the cart, an auth session), the suite also shares a single `page` created in
    `test.beforeAll(async ({ browser }) => { page = await browser.newPage(); })` and closed in
    `test.afterAll` — see `cart.spec.ts` and `checkout-error.spec.ts`. A new suite with
    inter-test dependency but no serial mode is a bug waiting to happen under parallel execution.

11. **Every click is followed by a deterministic wait.** One of:
    `await page.waitForLoadState('networkidle')`; a specific locator/state
    (`await page.getByTestId('...').waitFor()`, `await expect(...).toBeVisible()`); or
    `await page.waitForResponse(...)` for a click that fires an API call, armed **before** the
    click (see `mutateCart` in `order/cart/cart.actions.ts`). **Never `page.waitForTimeout(...)`
    or any hardcoded sleep.**

12. **Cart and order mutations confirm the server round-trip.** `/api/cart/items` and
    `/api/orders` calls are confirmed with `page.waitForResponse(...)` armed before the click,
    because the app reloads cart/order state from the server and navigating before the request
    settles loses the change. A new mutating action that just clicks and moves on is a CI flake.
    (There is no click-and-retry helper here — that was a Spree-specific workaround and is not
    used in this repo.)

13. **Test titles read as `'validate user can/cannot <do something>'`**, matching every existing
    spec.

14. **Base URL comes from `tests/functional/config/environments.ts`; credentials come from the
    module's own `<name>.data.ts` via `requireEnv(...)`** (e.g. `auth/auth.data.ts`) — a test
    that hardcodes a URL, username, or password is a regression.

## Output

Post inline comments (via the GitHub inline-comment tool) on the specific lines that violate a
convention above — cite which numbered convention it breaks and show the fix as a short code
snippet using this repo's existing pattern, not a generic suggestion. Don't invent nitpicks
outside this list.

If everything in the diff already follows these conventions, post one short top-level comment
saying so — don't manufacture feedback to seem thorough.
