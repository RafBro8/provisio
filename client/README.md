# provisio-client

React + Vite + TypeScript + Tailwind CSS frontend for [Provisio](../README.md).

## Local development

```bash
cp .env.example .env   # first time only
npm install
npm run dev
```

Requires the API server running (see [../server](../server)) — default expected at `http://localhost:4000/api`, configurable via `VITE_API_URL`.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck + production build
- `npm run lint` — oxlint
- `npm run test` — Vitest + React Testing Library (added in a later phase)
