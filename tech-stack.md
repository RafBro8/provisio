# Tech stack

This document explains what Provisio is built with and, more importantly, *why* each piece was chosen. The overarching goal of this project is to demonstrate full-stack development alongside a genuine, layered automated-testing practice — so several choices below are made specifically because they're easy or realistic to test, not just because they're popular.

## Frontend

### React + Vite

React was chosen because it's the most in-demand frontend skill for the kind of QA/SDET roles this portfolio targets — most automation and test-engineering positions expect familiarity with whatever the product team is shipping, and that's overwhelmingly React. Vite is the build tool because it replaces the older Create React App tooling with instant dev-server startup (native ES modules, no bundling in dev) and a much faster production build via esbuild/Rollup under the hood.

### TypeScript everywhere

Both the client and server are TypeScript, not JavaScript. For a portfolio meant to demonstrate QA rigor, static typing is a first line of defense that catches an entire category of bugs (wrong shapes, typos in property names, mismatched API contracts between client and server) before a single test even runs. It also makes refactors safe — the compiler flags every call site a change breaks.

### Tailwind CSS v4

Utility-first CSS was chosen over a component library (e.g. MUI, Chakra) so that every visual detail is explicit in the markup rather than hidden behind a third-party abstraction — useful for a portfolio project where a reviewer might read the source, not just click through the UI. Tailwind v4's `@custom-variant` feature is used specifically to switch dark mode from following the OS `prefers-color-scheme` automatically to being driven by a `.dark` class on `<html>` — that's what lets the theme toggle (see below) override the system preference instead of just mirroring it.

### React Router

Standard client-side routing for a single-page app with multiple distinct views (home, provider browsing, booking, dashboards, auth). Chosen for being the de facto standard rather than for any project-specific requirement.

### Manual theme (light/dark) toggle

Initially the app only followed the OS-level dark/light preference. That's a reasonable default, but it removes user choice — someone whose OS is set to dark shouldn't be forced into dark mode if they'd rather read the app in light mode. The fix is a small `ThemeContext` (mirroring the existing `AuthContext` pattern already in the codebase) that:
- Defaults to the system preference on first visit.
- Persists an explicit choice to `localStorage` once the user toggles it, so that choice always wins over the system preference afterward.
- Applies the resolved theme via a synchronous inline `<script>` in `index.html`, before React or any stylesheet loads — this avoids a "flash of wrong theme" that would otherwise happen for a split second while React mounts and figures out what theme to apply.

## Backend

### Node.js + Express

Express was chosen over a heavier framework (NestJS, etc.) because the API surface here — auth, CRUD-ish resources, a booking/availability engine — doesn't need Nest's dependency-injection and module system to stay organized. A layered structure (`routes` → `controllers` → `services` → `models`) gets the same separation of concerns with far less ceremony, and keeps the codebase approachable for anyone reviewing it as a portfolio piece.

### MongoDB + Mongoose

MongoDB fits the domain reasonably well (providers, services, bookings, reviews are naturally document-shaped, and there's no need for complex cross-table joins or transactions beyond what Mongo's atomic single-document operations already cover). Mongoose adds schema validation and a query API on top of the native driver, which keeps the models layer type-safe and self-documenting. It's also genuinely free to run in production via MongoDB Atlas's M0 tier, which matters for a portfolio project with no real budget.

### JWT auth via httpOnly cookies

Authentication uses a JWT stored in an `httpOnly` cookie rather than `localStorage`. `localStorage` is readable by any JavaScript running on the page, which makes a stored token trivially stealable via XSS; an `httpOnly` cookie is invisible to JavaScript entirely, so that attack surface doesn't exist. In production, the cookie is also set with `Secure: true` and `SameSite: None`, because the frontend (Vercel) and backend (Render) are deployed on different domains — that makes the cookie cross-site, and browsers require `SameSite=None` (which in turn requires `Secure`) for a cross-site cookie to be sent at all. Locally, where both run on `localhost`, `SameSite: Lax` is used instead since there's no cross-site requirement to satisfy.

### bcrypt for password hashing

Industry-standard slow hash for storing passwords — deliberately expensive to compute, which is what makes brute-forcing stolen hashes impractical. There's no reason to reach for anything more exotic here; this is a solved problem and bcrypt is still the safe, boring default.

### helmet, cors, morgan

Small, focused middleware rather than reinventing any of this: `helmet` sets a batch of security-related HTTP headers, `cors` explicitly allow-lists the one frontend origin allowed to make credentialed requests (rather than defaulting to permissive), and `morgan` gives request logging in dev (`dev` format) and production (`combined` format) without hand-rolling a logger.

## Database tooling

### Docker Compose for local MongoDB

`docker compose up -d` gives every contributor (in practice, just future-me) an identical local MongoDB instance without installing Mongo natively, plus `mongo-express` as a quick GUI for poking at data during development. This mirrors how a real team would standardize a local dev environment.

### mongodb-memory-server for backend tests

Backend integration tests spin up a real, ephemeral, in-memory MongoDB instance per test run rather than mocking the database layer. This was a deliberate choice: mocking Mongoose/MongoDB behavior tends to drift from how the real database actually behaves (query operators, index behavior, validation errors), which defeats the purpose of the test. An in-memory real Mongo instance is just as fast as a mock but tests the real thing.

## Testing

Testing is the primary point of this project, so it gets a layered strategy rather than one flavor of test:

### Vitest + Supertest (backend)

Vitest for the test runner (fast, native ESM/TS support, Jest-compatible API so it's familiar), Supertest for issuing real HTTP requests against the Express app in-process and asserting on the response — covering routes, controllers, and services together rather than unit-testing each in isolation with mocks. Combined with `mongodb-memory-server`, this means backend tests exercise the real request → controller → service → database round trip.

### Vitest + React Testing Library (frontend)

React Testing Library's philosophy — query the DOM the way a user would (by role, label, visible text) rather than by implementation detail (internal component state, CSS classes) — keeps component tests resilient to refactors that don't change actual behavior. This is used for context logic (auth, theme) and interactive components (like the theme toggle) where a full browser isn't necessary to prove correctness.

### Playwright (end-to-end)

The e2e suite is the centerpiece of the testing story, because it's the layer most relevant to the SDET/QA automation roles this portfolio targets. A few choices here are deliberate and non-default:

- **Runs against real production builds**, not the Vite/tsx dev servers — running under real concurrent load against dev-mode on-demand compilation caused genuine resource-contention timeouts in practice. Production builds are also what actually gets deployed, so the suite tests the real artifact.
- **Runs against a real backend and real MongoDB instance** (a dedicated `provisio_e2e` database, kept separate from the local dev database) — no network or database mocking. The specs that matter most here (double-booking race conditions, cancellation-policy timing) are only meaningful if the real database's behavior under concurrency is what's being exercised.
- **Capped worker count and one retry**, tuned from observed behavior rather than left at defaults — an unbounded worker count (Playwright's default is one per CPU core) caused real resource-contention failures, not flaky-test issues, on this machine. The single retry exists specifically to absorb a real, observed transient (a webServer that's *just* reported healthy can still drop the very first wave of concurrent requests before it's fully warmed up) without masking an actual regression, which would fail on retry too, not just once.
- **Specs are named after user-facing behavior, not pages** (`double-booking`, `cancellation-policy`, `admin-override`, etc.) — each one is built around a specific business rule (e.g. "cancelling within 24h is flagged as late," "only one of two simultaneous bookings for the same slot can succeed") rather than just "does the page render."

### oxlint

A fast Rust-based linter for the client, used in place of ESLint mainly for speed — CI and local feedback loops both benefit from a linter that runs in milliseconds rather than seconds.

## CI/CD

### GitHub Actions

Three independent jobs — backend tests, frontend tests, and the full Playwright e2e suite (with a real MongoDB service container) — run on every push and pull request. Running e2e in CI, not just locally, is what actually proves the suite is trustworthy: a suite that only ever gets run by hand on one developer's machine tends to quietly rot.

### Render (backend) + Vercel (frontend) + MongoDB Atlas (database)

The three pieces are deployed independently rather than as a single monolith, which better reflects how real production systems are typically composed:

- **Render** builds and runs the Express API from a `render.yaml` Blueprint (infrastructure-as-code — the whole service configuration is committed and reviewable, not clicked together in a dashboard).
- **Vercel** builds and serves the Vite static frontend, with an explicit SPA rewrite rule so client-side routes (e.g. `/register`) resolve correctly on a direct load or refresh, not just via in-app navigation.
- **MongoDB Atlas** hosts the production database on its free M0 tier.

All three have genuinely free tiers, which matters for a project with no operating budget, and using three different providers (rather than one all-in-one platform) is closer to what a real freelance/contract engineer is likely to encounter across different clients' infrastructure choices.
