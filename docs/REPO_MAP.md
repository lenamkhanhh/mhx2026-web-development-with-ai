# Repository map

This repository contains the personal portfolio and the UIT Web Development
with AI coursework. The folders below are intentionally separated by
responsibility.

## Runtime applications

| Path | Purpose | Public route |
| --- | --- | --- |
| `src/` | Main React portfolio visitor experience | `/` |
| `api/` | Vercel serverless API entrypoint for the portfolio | `/api/*` |
| `server/` | Local Express API, route handlers, and tests | local development only |
| `final-group/` | Final course group-project app (TripFlow MVP) | `/final-group/` |

## Course submissions

| Path | Purpose | Public route |
| --- | --- | --- |
| `bai-4/` | Buổi 4 standalone HTML/CSS submission | `/bai-4/` when served directly |
| `bai-5/` | Buổi 5 authentication/profile submission | `/bai-5/` |

`bai-4/` and `bai-5/` stay at the repository root because their relative asset
paths and previously shared submission URLs depend on those locations. They
are course artifacts, not part of the portfolio source.

## Supporting material

- `public/`: portfolio assets and the public CV.
- `docs/personal-portfolio/`: portfolio research, mockups, and design plans.
- `docs/api-demo.md`: Buổi 3 API demo notes.
- `AI_PROMPTS.md`: AI assistance record for the earlier coursework.
- `submission-evidence/`: evidence collected for previous submissions.
- `output/`, `coverage/`, and `tmp/`: generated local artifacts; do not treat
  them as application source.

## Final group project boundary

The final project must remain self-contained under `final-group/`. Its source,
tests, Firebase rules, project documentation, and future deployment notes
belong there. It may reuse the root package's installed dependencies and Vite
build, but it must not modify the portfolio's `src/` content or Buổi 5's
Firebase implementation without an explicit integration decision.
