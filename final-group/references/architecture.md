# TripFlow architecture

## Boundary

`final-group/` is a separate React/Vite application delivered from the
`/final-group/` route. It shares the root package's dependencies and build
tooling but must not import portfolio components or Buổi 5 Firebase code.

## Target module layout

```text
final-group/
├── src/
│   ├── App.tsx                 # session and screen orchestration
│   ├── main.tsx                # browser entrypoint
│   ├── domain.ts               # pure rules
│   ├── auth.ts                 # pure auth validation
│   ├── firebase/               # Auth/Firestore adapter
│   ├── features/
│   │   ├── auth/
│   │   ├── events/
│   │   ├── members/
│   │   └── expenses/
│   └── components/             # reusable presentation
├── firestore.rules
├── references/
├── scripts/
└── handoffs/
```

The existing `domain.ts`, `auth.ts`, and `components/TripDashboard.tsx` are
the current tested foundation. Refactor incrementally; do not rewrite them
without preserving their tests.

## Runtime layers

1. `domain`: deterministic calculations and validation; no Firebase imports.
2. `firebase`: persistence, auth subscriptions, and Firestore snapshots.
3. `features`: user flows and mutation orchestration.
4. `components`: rendering and accessible interaction.
5. `App`: session, onboarding, selected trip, and feature composition.

Prefer dependency injection for `App` and feature tests so fake backends can
exercise behavior without network access.
