# Test conventions

The rules the `tests/functional/` suite follows. This file is the single source of truth —
the [README](../README.md) links here, and the PR-review workflow
([`.github/prompts/qa-pr-review.md`](../.github/prompts/qa-pr-review.md)) checks every PR
against it and cites violations by number.

When in doubt, the existing sibling files in the same feature folder are the reference
implementation — an existing `.actions.ts` / `.assertions.ts` / `.flow.ts` / `.data.ts` in
another feature shows the intended shape. Don't invent rules that aren't actually followed
elsewhere in the repo.

---

1. **File split per feature.** Each feature under `tests/functional/<domain>/[<feature>/]`
   separates concerns into `<name>.actions.ts` (raw Playwright interactions / locators),
   `<name>.assertions.ts` (checks), `<name>.data.ts` (typed data shapes), `<name>.flow.ts`
   (multi-step flows composed from actions), and `<name>.spec.ts` (test cases). Domains like
   `auth` and `product` keep these files flat in the domain folder; add a `<feature>/` subfolder
   only for independently-testable sub-features (`order/cart`, `order/checkout`). Dumping locators
   or assertions straight into a `.spec.ts` or `.flow.ts` breaks the split. A domain's API-layer
   tests get their own file set with an `-api` suffix on the same base name, alongside the UI
   files in the same domain folder, following the identical split — `auth-api.actions.ts` /
   `auth-api.assertions.ts` / `auth-api.data.ts` / `auth-api.flow.ts` / `auth-api.spec.ts`
   (+ `auth-api-error.spec.ts`) next to `auth.actions.ts` etc. Only the interaction layer differs:
   `sendApiRequest(...)` (`utils/api.utils.ts`) instead of `page.*`.

2. **`.spec.ts` files contain no raw `page.*` calls and no raw `expect(...)`.** They call
   flow / assertion helpers. Calling a single named **action** directly from a spec is fine when
   there's no multi-step journey to name (the suite does this with `openHomePage`,
   `clickViewCartButton`) — but a new interaction or check belongs in that feature's
   `.actions.ts` / `.assertions.ts`, never inline in the test.

3. **`.flow.ts` functions compose two or more actions / flows.** A flow that just forwards to a
   single action is pointless indirection — delete it and call the action directly.

4. **`.data.ts` holds every typed data-shape declaration** — interfaces / types for input
   fixtures and expected / response structures alike, regardless of whether the value is passed
   in or describes what the app returns (`CartData` / `CartItemData`, `CheckoutFormData`,
   `LoginResponseBody` / `ExpectedLoginUser`). Only the literal expected *values* the app produces
   — error messages, headings, status text — are exempt: those live in `.assertions.ts`, baked
   into a named assertion function, one per message (see `auth.assertions.ts`,
   `checkout.assertions.ts`). A type / interface declared inside a `.assertions.ts` file, or a
   hardcoded error string in `.data.ts`, are both smells. A negative test that only overrides one
   or two fields of an existing fixture does **not** get a new named fixture — spread the base
   fixture and override inline at the call site (`{ ...standardUserLoginBody, password: '' }` in
   `auth-api-error.spec.ts`;
   `{ ...standardCheckoutForm, shippingInfo: { ...standardCheckoutForm.shippingInfo, firstName: '' } }`
   in `checkout-error.spec.ts`). A dedicated fixture per field doesn't scale — a 30-field form
   testing every required field would clutter `.data.ts` with one fixture per field.

5. **Reusable utility functions live in `tests/functional/utils/<name>.utils.ts`, not duplicated
   per feature.** A helper needed by more than one feature — a pure function (parsing, formatting,
   date math) or a shared Playwright-touching primitive (sending a request, asserting a response)
   alike — belongs in a shared `.utils.ts` file and gets imported, not copy-pasted.
   `utils/data.utils.ts` holds `parsePrice` / `formatPrice`, imported by `cart.assertions.ts` and
   `checkout.assertions.ts`. `utils/api.utils.ts` holds the API-layer primitives every domain's
   API tests build on — `sendApiRequest`, `assertResponseStatus`, `assertResponseBody` — so a
   domain's `.actions.ts` calls `sendApiRequest` rather than `request.fetch(...)` directly, and
   its `.assertions.ts` builds named assertions on top of `assertResponseStatus` /
   `assertResponseBody` rather than reimplementing status / body checks inline. The same function
   copy-pasted into two feature files is a duplication bug, not a style nit.

6. **Locators are testid-first.** `getByTestId(...)` (including regex testids like
   `getByTestId(/^cart-item-\d+$/)`) for element identity — clicks, scoping, reading a field's
   value. Fall back to `getByRole` / `getByLabel` only where there is no testid (e.g. the login
   form inputs). Keep `getByRole` / `getByText` where the *visible semantics* are the thing under
   test — a user-facing error message, an accessible name, a heading level. Raw CSS / XPath only
   when there is genuinely no testid and no meaningful role (e.g. `.locator('xpath=../..')` to
   reach an unlabelled parent row), with a short comment.

7. **Assertions use `expect.soft(...)`**, not bare `expect(...)`, inside `.assertions.ts` files,
   so one run surfaces every failing check instead of stopping at the first.

8. **Assertions match exactly unless the value genuinely isn't fixed.** Prefer `toHaveText(...)`
   over `toContainText(...)`, and `getByText(..., { exact: true })` over a substring match; assert
   an element's full text via its testid rather than fishing for a fragment. When a value really
   is dynamic — an order number, today's date, a stock count — match an anchored regex
   (`toHaveText(/^Order #\d+$/)`) or compute the expected value; don't loosen to a partial match
   to make it pass. Same principle for API response bodies: `assertResponseBody(actual, expected,
   options)` (`utils/api.utils.ts`) defaults to a partial match (`toMatchObject`), but pass
   `{ exact: true }` once the full response shape is known so an unexpected extra field gets
   caught (see `assertLoginSuccess` in `auth-api.assertions.ts`). For a field that's dynamic every
   run — a JWT, a generated id, a timestamp — mix an asymmetric matcher like
   `expect.stringMatching(/regex/)` into the same `expected` object alongside the exact fields;
   don't drop to a full partial match just because one field is dynamic.

9. **Every `test.describe(...)` has a `{ tag: '@xxx' }`** matching its domain (`@auth`,
   `@product`, `@cart`, `@checkout`). API-layer specs carry a second `@api` tag alongside the
   domain tag — `{ tag: ['@auth', '@api'] }` in `auth-api.spec.ts` — so the API suite can be run
   or filtered independently of the UI suite.

10. **`test.describe.configure({ mode: 'serial' })`** whenever tests depend on state left by
    earlier tests in the same file. When that state lives in one browser context (the cart, an
    auth session), the suite also shares a single `page` created in
    `test.beforeAll(async ({ browser }) => { page = await browser.newPage(); })` and closed in
    `test.afterAll` — see `cart.spec.ts` and `checkout-error.spec.ts`. Inter-test dependency
    without serial mode is a bug waiting to happen under parallel execution.

11. **Every click is followed by a deterministic wait** — `await page.waitForLoadState('networkidle')`,
    a specific locator / state (`await page.getByTestId('...').waitFor()`,
    `await expect(...).toBeVisible()`), or `await page.waitForResponse(...)` for a click that
    fires an API call, armed **before** the click. **Never `page.waitForTimeout(...)` or any
    hardcoded sleep.**

12. **Cart and order mutations confirm the server round-trip.** `/api/cart/items` and
    `/api/orders` calls are confirmed with `page.waitForResponse(...)` armed before the click —
    the app reloads cart / order state from the server, so navigating before the request settles
    loses the change. See `mutateCart` in `order/cart/cart.actions.ts`. There is no
    click-and-retry helper here.

13. **Test titles read as `'validate user can/cannot <do something>'`**, matching the rest of the
    suite.

14. **Base URL comes from `tests/functional/config/environments.ts`; credentials come from the
    module's own `<name>.data.ts` via `requireEnv(...)`** (e.g. `auth/auth.data.ts`) — never a
    hardcoded URL, username, or password in a test.

15. **Arrange / cleanup asserts status only; the owning spec asserts the body.** When a test sets
    up or tears down state by calling a write endpoint it isn't there to test — logging in to get
    a token, creating a product to exercise delete, deleting the created product in `afterEach` —
    that call is confirmed with `assertResponseStatus(...)` alone, wrapped in a thin `.flow.ts`
    helper (`generateAccessToken`, and `createProduct` / `deleteProduct` = `send…Request` +
    assert status). The full `{ exact: true }` response-body assertion (`assertLoginSuccess`,
    `assertProductCreateSuccess`, `assertProductDeleteSuccess`) belongs only in the `.spec.ts`
    that owns that operation. Re-asserting the body at the arrange / cleanup site is the
    redundancy rule 3 guards against, one layer up.
