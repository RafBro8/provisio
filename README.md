# Provisio

A full-stack appointment booking platform for professional services (consultants, coaches, tutors, and similar providers). Built as a portfolio project demonstrating full-stack development alongside a strong automated testing practice — unit/component tests (Vitest, React Testing Library, Supertest) and end-to-end tests (Playwright), all wired into CI.

**Live demo:** [provisio-ten.vercel.app](https://provisio-ten.vercel.app)

[![CI](https://github.com/RafBro8/provisio/actions/workflows/ci.yml/badge.svg)](https://github.com/RafBro8/provisio/actions/workflows/ci.yml)

<p>
  <img src="docs/screenshot-light.png" alt="Provisio home page in light mode" width="49%" />
  <img src="docs/screenshot-dark.png" alt="Provisio home page in dark mode" width="49%" />
</p>

## Features

- **Customer booking flow** — browse providers and their services, pick an open time slot, and book an appointment
- **Provider dashboard** — manage services, set availability, and view/manage incoming bookings
- **Admin dashboard** — platform-wide oversight of providers and bookings, including the ability to override (cancel) any booking
- **Reviews** — customers can leave a review after a completed appointment
- **Notifications** — in-app notifications for booking-related events
- **Cancellation policy** — cancellations within 24 hours of an appointment are flagged as late
- **Double-booking protection** — concurrent booking attempts for the same slot are resolved so only one succeeds
- **Auth** — JWT-based auth with httpOnly cookies, role-based access (customer / provider / admin)
- **Light/dark theme** — manual toggle with system-preference default and persistence across visits

## Tech stack

| Layer      | Technology                                              |
| ---------- | -------------------------------------------------------- |
| Frontend   | React, Vite, TypeScript, Tailwind CSS, React Router       |
| Backend    | Node.js, Express, TypeScript, Mongoose                    |
| Database   | MongoDB                                                    |
| Auth       | JWT (httpOnly cookies), bcrypt                             |
| Testing    | Vitest, React Testing Library, Supertest, Playwright       |
| CI/CD      | GitHub Actions, Render (API), Vercel (frontend), MongoDB Atlas |

## Testing

Automated testing is the core focus of this project, not an afterthought:

- **Backend (56 tests, Vitest + Supertest)** — route and service-level tests against an in-memory MongoDB instance (`mongodb-memory-server`), covering auth, bookings, availability, cancellation policy, reviews, and notifications.
- **Frontend (29 tests, Vitest + React Testing Library)** — component and context tests, including auth flows and the theme toggle.
- **End-to-end (Playwright)** — full-stack specs run against a real production build, real backend, and real MongoDB instance (no mocks):
  - `auth.spec.ts` — registration, login, logout
  - `booking-flow.spec.ts` — browse → book → view in My Bookings
  - `provider-availability.spec.ts` — provider sets availability, slots reflect it
  - `double-booking.spec.ts` — two simultaneous booking attempts for one slot, only one succeeds
  - `cancellation-policy.spec.ts` — late vs. on-time cancellation handling
  - `admin-override.spec.ts` — admin cancels a booking on another user's behalf

All three suites run on every push and pull request via [GitHub Actions](.github/workflows/ci.yml).

```bash
# Backend unit/integration tests
cd server && npm test

# Frontend component tests
cd client && npm test

# End-to-end tests (requires the backend, frontend, and MongoDB running — see below)
cd e2e && npm test
```

## Project structure

```
provisio/
  client/    React frontend
  server/    Express API
  e2e/       Playwright end-to-end specs
```

## Local development

Prerequisites: Node.js 24+, Docker Desktop.

```bash
docker compose up -d      # starts local MongoDB (+ mongo-express UI at localhost:8081)
```

**Backend:**

```bash
cd server
cp .env.example .env      # defaults work as-is against the docker-compose Mongo
npm install
npm run dev                # starts the API on http://localhost:4000
```

**Frontend** (in a separate terminal):

```bash
cd client
cp .env.example .env
npm install
npm run dev                # starts the app on http://localhost:5173
```

**End-to-end tests** (with backend + frontend + Mongo already running, or let Playwright's `webServer` config start them):

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
npm test
```

### Environment variables

**`server/.env`**

| Variable       | Description                                              |
| -------------- | ---------------------------------------------------------- |
| `NODE_ENV`     | `development` locally, `production` when deployed           |
| `PORT`         | API port (default `4000`)                                    |
| `MONGODB_URI`  | MongoDB connection string                                     |
| `CLIENT_ORIGIN`| Frontend origin allowed to make credentialed CORS requests    |
| `JWT_SECRET`   | Secret used to sign JWTs — must be a real random value outside local dev |

**`client/.env`**

| Variable       | Description                  |
| -------------- | ------------------------------ |
| `VITE_API_URL` | Base URL of the backend API     |

## Architecture & deployment

Provisio is deployed as three independently-hosted pieces:

- **Frontend** — [Vercel](https://vercel.com), built from `client/` (Vite static build, with SPA fallback routing)
- **Backend** — [Render](https://render.com), built from `server/` via [`render.yaml`](render.yaml) (Infrastructure-as-Code Blueprint)
- **Database** — [MongoDB Atlas](https://www.mongodb.com/atlas) (M0 free-tier cluster)

The frontend talks to the backend over HTTPS with credentialed (cookie-based) requests, so `CLIENT_ORIGIN` on the backend must exactly match the deployed frontend origin for CORS and cookies to work correctly.

## Related project

[claritas-e2e](#) — a companion UI that lets non-technical users trigger and monitor this project's Playwright test suite without touching a terminal. (Link will be added once that repo exists.)
