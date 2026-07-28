# Chat task prompts

Every feature chat must first read `final-group/SKILL.md` and confirm its
branch. The coordinator chat merges work only after the handoff template is
filled and targeted tests pass.

## Chat 1 — Firebase architecture

Own: `final-group/src/firebase/`, `final-group/firestore.rules`,
`final-group/references/` only when a schema decision is approved.

Read: `SKILL.md`, `references/architecture.md`,
`references/data-model.md`, `references/permissions.md`.

Deliver: typed `TripBackend`, Firebase Auth/Firestore adapter, rules, emulator
or rules-test notes, and a handoff. Do not build feature UI.

## Chat 2 — Auth and onboarding

Own: `final-group/src/features/auth/`,
`final-group/src/features/onboarding/`, and App auth composition only.

Read: `SKILL.md`, `references/architecture.md`,
`references/data-model.md`, `references/permissions.md`, `auth.ts`.

Deliver: login/register/logout, profile hydration, create-trip and join-trip
flows with fake-backend tests. Do not change Firestore schema.

## Chat 3 — Events

Own: `final-group/src/features/events/` and event-focused tests.

Read: `SKILL.md`, `references/architecture.md`,
`references/data-model.md`, `references/permissions.md`, `domain.ts`.

Deliver: event CRUD, approval, conflict validation, reorder, realtime
subscription, and status synchronization. Keep domain rules pure.

## Chat 4 — Members

Own: `final-group/src/features/members/` and member-focused tests.

Read: `SKILL.md`, `references/data-model.md`,
`references/permissions.md`.

Deliver: member list, responsibility editing, join-code display, Lead-only
removal, and authorization tests.

## Chat 5 — Expenses and statistics

Own: `final-group/src/features/expenses/` and
`final-group/src/features/statistics/`.

Read: `SKILL.md`, `references/architecture.md`,
`references/data-model.md`, `references/permissions.md`, `domain.ts`.

Deliver: VND integer money handling, paid/owed/balance views, summary
statistics, and pure calculation tests.

## Chat 6 — Integration and release

Own: `final-group/src/App.tsx`, `main.tsx`, styles, root Vite/Vercel wiring,
README, and release scripts.

Read: all files under `final-group/` references and handoffs.

Deliver: integrated app, responsive/accessibility pass, full tests, build,
secret scan, local preview, then a release recommendation. Push/deploy only
after explicit coordinator approval.
