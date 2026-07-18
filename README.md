# Le Nam Khanh — Portfolio

[![Live site](https://img.shields.io/badge/Live%20site-Vercel-000000?logo=vercel&logoColor=white)](https://mhx2026-web-development-with-ai.vercel.app)
[![GitHub profile](https://img.shields.io/badge/GitHub-lenamkhanhh-181717?logo=github&logoColor=white)](https://github.com/lenamkhanhh)

Personal portfolio for **Le Nam Khanh**, a first-year Information Technology student at the University of Science, VNU-HCM (HCMUS). It presents verified academic and competitive-programming evidence alongside an evolving trajectory from algorithms toward AI foundations and research interests.

## Live website

**[mhx2026-web-development-with-ai.vercel.app](https://mhx2026-web-development-with-ai.vercel.app)**

The Vercel deployment serves both the React frontend and the Express API from the same public domain.

## Highlights

- GPA **7.95 / 10** after the first semester at HCMUS
- Codeforces **Expert**, maximum rating **1796**
- **Champion**, HCMUS Coding Challenge 2026
- Current direction: algorithms and competitive programming → AI foundations and research questions

The portfolio intentionally avoids unsupported claims about employment, publications, research impact, lab affiliation, testimonials, or project metrics.

## Features

- Evidence-led, responsive one-page portfolio
- Accessible navigation, project tabs, and reduced-motion behavior
- Fixed Canvas constellation field with a static technical-blueprint overlay
- Deterministic visual field, capped DPR/FPS, and lifecycle-aware animation cleanup
- English-only visitor-facing content with links to CV, GitHub, Codeforces, and selected work
- Persistent dark/light mode using React state, effects, and `localStorage`
- Searchable project evidence and a controlled contact form with validation
- Node.js/Express REST API with CRUD and query-parameter filtering
- API-backed React gallery with loading, empty, and failure states

## UIT Web Development with AI submission

This branch adapts the existing public portfolio for the Mùa hè xanh UIT 2026 course assignments:

- **Buổi 2 — Frontend & ReactJS:** component-based React/Vite portfolio, responsive layout, dark mode, searchable projects, and controlled contact form.
- **Buổi 3 — Backend & NodeJS:** RESTful projects API, input validation, CRUD, search/filter query parameters, CORS, and frontend integration.

The AI assistance record is in [`AI_PROMPTS.md`](./AI_PROMPTS.md). API demo commands are in [`docs/api-demo.md`](./docs/api-demo.md).

## Tech stack

- React 19 + TypeScript
- Vite
- Motion
- CSS-first responsive design
- Vitest + ESLint
- Vercel

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

Start the API in a second terminal:

```bash
npm run start:api
```

Vite proxies `/api` requests to `http://localhost:3001` during development.

The production API is available at `https://mhx2026-web-development-with-ai.vercel.app/api`. Project data is intentionally stored in memory for this coursework, so writes can reset when a serverless instance restarts. The write routes are unauthenticated for Postman/CRUD practice and should use authentication plus persistent storage before real-world use.

## REST API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/projects` | List projects; supports `q` and `technology` |
| `GET` | `/api/projects/:id` | Get one project |
| `POST` | `/api/projects` | Create a project |
| `PUT` | `/api/projects/:id` | Replace a project |
| `PATCH` | `/api/projects/:id` | Update selected fields |
| `DELETE` | `/api/projects/:id` | Delete a project |

## Quality checks

```bash
npm test
npm run test:coverage
npm run lint
npx tsc --noEmit
npm run build
```

## Deployment

The course submission is deployed to Vercel. `vercel.json` sends `/api/*` requests to the Express Vercel Function and falls back to the built React SPA for other routes.

To create a production deployment from this repository:

```bash
npx vercel deploy --prod
```

## Project structure

```text
src/
  components/   # portfolio sections and visual field
  content.ts    # verified visitor-facing content
  constellation.ts # deterministic canvas-field logic
api/            # Vercel serverless entrypoint
server/         # Express app, routes, validation, and in-memory store
public/         # CV and static assets
docs/           # design rationale and research notes
```

## Links

- [Live course deployment](https://mhx2026-web-development-with-ai.vercel.app)
- [GitHub profile](https://github.com/lenamkhanhh)
- [Codeforces profile](https://codeforces.com/profile/Average2k7)
- [CV](https://mhx2026-web-development-with-ai.vercel.app/le-nam-khanh-cv.pdf)
