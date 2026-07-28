# Module handoff

## Owner

- Chat/module: Chat 2 — Auth and onboarding
- Branch: `codex/final-group-auth-onboarding`
- Date: 2026-07-28

## Scope completed

- Added dependency-injected login, registration, logout, and profile hydration
  flows backed by the Firebase `TripBackend` contract.
- Auth validation stays in the existing pure `auth.ts`; `AuthFlow` prevents
  invalid backend calls and converts backend errors with `mapAuthError`.
- Profile hydration reads `getProfile(uid)` first. When absent, it calls
  `upsertProfile(user)` and supplies the equivalent first-session profile to
  App composition.
- Added create-trip onboarding using `createTrip(input, actor)` exactly as
  defined by `TripBackend`.
- Added join-code input normalization and a fail-closed join UI. The current
  `TripBackend.joinTrip(joinCode, actor)` intentionally rejects until an
  approved server-verifiable join design exists; the UI surfaces that limit
  without attempting a client-side membership write.
- Cherry-picked Firebase contract commit `387fe40` as `e305ba2` only to
  consume its exported contract; no Firebase files were modified by Chat 2.

## Files changed

- `final-group/src/features/auth/AuthFlow.tsx`
- `final-group/src/features/auth/AuthFlow.test.tsx`
- `final-group/src/features/onboarding/OnboardingFlow.tsx`
- `final-group/src/features/onboarding/OnboardingFlow.test.tsx`
- `final-group/handoffs/CHAT_2_AUTH.md`

## Verification

```text
Tests: 12/12 passed
  D:\Code\Code\AIO\Code\mxhuit26\node_modules\.bin\vitest.cmd run
  --config D:\Code\Code\AIO\Code\mxhuit26\vite.config.mjs
  final-group/src/features/auth/AuthFlow.test.tsx
  final-group/src/features/onboarding/OnboardingFlow.test.tsx

Module-wide attempt: 32 tests passed across 5 suites. The existing
`final-group/src/components/TripDashboard.test.tsx` could not start because
this worktree's incomplete local dependency tree cannot resolve
`react/jsx-dev-runtime` from that sibling component path. This is separate
from the Auth/Onboarding tests, which run against the available runner.

TypeScript: passed for auth/onboarding plus the consumed Firebase contract
  using a targeted no-emit tsc invocation with the available dependency types.

Build: not run; `final-group/App.tsx` and route/build composition are owned by
  the integration chat.
```

## Known limitations or blockers

- Joining a trip remains unavailable by design until the coordinator approves
  a server-verifiable join-proof/callable-function design and rules tests.
- `AuthFlow` and `OnboardingFlow` are ready for dependency injection but are
  not wired into `final-group/App.tsx`; no live Firebase UI behavior is claimed.
- Existing UI `types.ts` is structurally compatible for trip/profile rendering,
  but the integration chat must retain explicit event category/status mapping
  noted in the Firebase handoff.
- The full `final-group` test target is not green until the worktree has a
  consistent local dependency resolution path for the existing dashboard test.

## Next safe action

- Integration chat should create one `TripBackend`, subscribe via
  `observeSession`, inject it into both flows, then show onboarding when the
  hydrated profile has no selected trip. Keep the join action disabled or show
  its current safe limitation until a backend design is approved.

## Do not touch

- `final-group/src/firebase/` and `final-group/firestore.rules`
- `final-group/src/App.tsx`, `final-group/src/main.tsx`, route/build wiring,
  portfolio `src/`, `bai-4/`, `bai-5/`, deployment settings, or generated
  artifacts.
