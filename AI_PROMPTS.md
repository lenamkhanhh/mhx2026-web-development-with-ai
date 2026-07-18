# AI-assisted development log

This file records the main prompt objectives used while adapting the existing portfolio for the UIT Mùa hè xanh 2026 Web Development with AI assignments.

## Prompt 1 — rubric audit

> Compare the existing React/Vite portfolio with the assignment rubric. Preserve verified personal content and the existing design, then identify only the missing requirements.

Outcome: retained the evidence-led portfolio and identified dark mode persistence, project search, a controlled contact form, and backend integration as the missing course requirements.

## Prompt 2 — frontend behavior

> Add an accessible dark/light mode using `useState`, `useEffect`, and `localStorage`. Add a project search control and a controlled contact form with validation and a visible success state.

Outcome: added `ThemeToggle`, local project filtering, and `ContactForm` without replacing the original component structure.

## Prompt 3 — REST API

> Build a small Node.js/Express REST API for portfolio projects. Support CRUD, `q` and `technology` query parameters, CORS, validation, safe errors, and in-memory data suitable for the course rubric.

Outcome: added `/api/projects` list/detail/create/replace/update/delete routes with Zod validation and a separate in-memory store.

## Prompt 4 — frontend/backend integration

> Add a React project gallery that fetches from the Express API and sends its search term as a query parameter. Keep loading, empty, and error states accessible.

Outcome: added `ApiProjectGallery`, connected through the Vite `/api` proxy.

## Prompt 5 — verification

> Use test-driven development. Cover theme persistence, project filtering, contact validation, API-backed search, CRUD, invalid input, and final build quality checks.

Outcome: added Vitest, Testing Library, Supertest integration coverage, plus reproducible commands in the README.

## Human verification

AI output was reviewed against the original assignment documents. Personal claims and project evidence were kept from the existing portfolio rather than invented for the submission.
