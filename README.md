# Provisio

A full-stack appointment booking platform for professional services (consultants, coaches, tutors, and similar providers). Built as a portfolio project demonstrating full-stack development alongside a strong automated testing practice — unit/component tests (Vitest, React Testing Library) and end-to-end tests (Playwright).

> Status: under active development. This README will be filled in with architecture, screenshots, and a live demo link as the project progresses.

## Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB (Mongoose)
- **Testing**: Vitest, React Testing Library, Supertest, Playwright

## Project structure

```
provisio/
  client/    React frontend
  server/    Express API
  e2e/       Playwright end-to-end specs
```

## Local development

Prerequisites: Node.js, Docker Desktop.

```bash
docker compose up -d      # starts local MongoDB (+ mongo-express UI at localhost:8081)
```

Backend and frontend setup instructions will be added as those pieces are built.

## Related project

[claritas-e2e](#) — a companion UI that lets non-technical users trigger and monitor this project's Playwright test suite without touching a terminal. (Link will be added once that repo exists.)
