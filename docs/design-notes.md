# Design notes

The reasoning behind the framework that isn't visible in the code — what was
deliberately left out and why, a few non-obvious calls, and one thing that had
to be reverse-engineered from the app.

## Deliberately out of scope

Each of these was considered and dropped for a concrete reason, not overlooked.

### Contract / stub layers — WireMock, Playwright `page.route`
Routing a hosted app's same-origin `/api` traffic through a stub server needs a
browser proxy plus a trusted CA, and qademo isn't ours to reconfigure.
`page.route` was the fallback idea and was rejected as browser-only: it can't
intercept the `request` fixture the API tests use, so stubs would never be
shared between the UI and API layers. Tests run against the real API instead.

### Load & performance — JMeter, k6
Same ownership problem, and qademo is a small shared demo box that already drops
requests under a 4-worker functional run. Deliberately loading it would be
antisocial and any numbers would be noise.

### Cross-layer "seed via API, assert in UI"
Needs one entity with both a write API and a read-back screen. The storefront is
read-only for anonymous and standard users, orders disappear from view once
submitted, and bridging through the cart's `x-session-id` header (stitching a
value out of a browser context into an API context) is contrived. The admin API
(`updateProductStock`, `createProduct`) could technically enable this, but the
admin domain itself was scoped out — see below.

### Runtime response-schema validation — zod / ajv on every response
Normally the API owner's job, and there's no published contract to validate
against. The targeted `assertResponseBody(..., { exact: true })` checks — exact
on stable fields, asymmetric matchers on the dynamic ones — already catch a
missing field, a wrong type, or an unexpected extra field at the points that
matter.

### Full API E2E chain — login → cart → checkout → order via `/api/*`
It's the same technique the `auth-api` logout test already shows (parse a value
out of one response, put it into the next request), just with more fields. The
UI suite covers checkout end-to-end. No new pattern, so it would be volume, not
coverage.

### `cart-api` and `admin` domains
`cart-api` — the cart is anonymous (`x-session-id`), so it would add stateful
CRUD and more verbs but nothing the suite doesn't already demonstrate.
`admin` — `PATCH`/`PUT`/`DELETE` plus create-then-cleanup teardown don't show
anything `GET`/`POST` and the existing `beforeAll`/`afterAll` fixtures don't.
Both were built up as candidates and declined.

### Custom ESLint convention rules
The AI PR-review workflow enforces the [coding conventions](../README.md#coding-conventions)
in context — it can weigh "is this the right abstraction" where a lint rule
only sees syntax. A parallel ESLint ruleset would be upkeep for partial overlap.

### Accessibility — axe-core
A separate discipline. Adding a few `axe` scans would dilute the framework's
focus rather than complete it.

### Cross-browser — Firefox / WebKit
CI runs a single Chromium project because qademo drops requests under parallel
load and stability matters more than browser matrix here. Firefox/WebKit would
belong in an opt-in workflow, not the per-push run.

### Dashboard history beyond 5 runs
The trend chart keeps the last 5 runs. More would need real storage (the current
approach carries prior reports forward in the `gh-pages` checkout) for a longer
window nobody reviews.

## Calls worth explaining

### `global.setup.ts` does a real browser login, not an API token call
A `POST /api/auth/login` would shave ~3–5s off startup. The browser login stays
because it captures a real `storageState` snapshot (cookies + localStorage) that
self-heals if the app changes how it persists a session. An API call would bake
in assumptions about token storage that the app could later break silently.

### UI `*.data.ts` owns shared values; `-api` files import them
The UI fixtures hold the shared catalog facts — product name, description, price.
The `-api` data files import those and add API-shape fields (numeric `price`,
`id`, `slug`, image keys). Types stay per-layer: the UI's `price: '$89.99'`
string vs the API's `89.99` number can't be one type without lossy optionals.
It's slightly backwards — the API is really the source of truth for product data
— but the UI tests came first and a neutral third file for three products isn't
worth the indirection.

### Dynamic fields are matched, not pinned
Product `stock` moves as orders come in. `createdAt` / `updatedAt` move when the
demo data reseeds — observed mid-development, a bulk job that stamps every row a
few seconds apart. The product count drifts as products are added and removed.
These are asserted with `expect.any(Number)`, anchored timestamp regexes, and a
0-vs-positive stock check — never literal values, with one exception:

### Two tests fail on purpose
`product-list` (UI and API) asserts `TOTAL_PRODUCTS_COUNT = 22` against a live
catalog that holds ~21 and drifts; one auth test is left flaky. Both are
deliberate — a `main` run has to actually fail sometimes to exercise
`qa-results-analysis.yml` end to end (triage → issue → `KNOWN-FAILURE` marker PR),
not just the green path.

## Reverse-engineered: qademo's auth / session lifecycle

Pieced together from the minified SPA bundle and probing the API, because it
determines how a token-based API suite would have to be built.

| Token | TTL | Where it lives |
|---|---|---|
| Access token | **15 min** | in memory only in the SPA (localStorage `auth-storage` holds just `{ user, isAuthenticated }`) |
| Refresh token | **7 days** | httpOnly `refresh_token` cookie |

The SPA calls `POST /api/auth/refresh` from exactly one place: `checkAuth()`, which
runs once on bundle boot — a **full page load**. There is no timer and no
401-interceptor retry in the API client.

Consequences:
- Idle past 15 minutes → not logged out, but the next authenticated call fails
  with no recovery until a full page reload. In-app (client-side) navigation
  does not refresh the token.
- **UI tests are fine** — every test's `page.goto` reboots the bundle and mints a
  fresh access token. Only the 7-day refresh cookie is shared, and
  `global.setup.ts` regenerates it each run.
- **A pure-API suite has no page-load event.** A run longer than 15 minutes would
  need a worker-scoped fixture that re-mints via `/auth/refresh` near expiry.
  Not built — no API domain currently needs a token beyond the one-shot
  `auth-api` logout test.
