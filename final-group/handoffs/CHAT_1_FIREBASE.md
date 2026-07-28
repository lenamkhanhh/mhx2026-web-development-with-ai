# Module handoff

## Owner

- Chat/module: Chat 1 — Firebase architecture
- Branch: `codex/final-group-firebase`
- Date: 2026-07-28

## Scope completed

- Added the typed Firestore-facing `TripBackend` contract plus Firebase Auth and
  Firestore adapter under `src/firebase/`.
- Added public-config validation (`VITE_FIREBASE_*` only), auth session/login/
  register/logout methods, profile hydration, trip/member/event/expense
  repositories, and realtime trip subscriptions.
- Enforced the agreed Firestore document vocabulary: the adapter uses
  `approved`/`happening`/`completed`, the five agreed event categories, and
  integer VND expenses. It does not reuse the older UI-domain vocabulary.
- Added fail-closed `joinTrip` and `reorderEvents`: the approved schema cannot
  securely prove a join-code submission in Security Rules and has no persisted
  event-order field. Neither operation opens an authorization bypass.
- Added Firestore Security Rules for membership reads, lead/member event
  behavior, responsibility changes, expenses, and server timestamps.

## Files changed

- `final-group/src/firebase/contracts.ts`
- `final-group/src/firebase/codec.ts`
- `final-group/src/firebase/repository.ts`
- `final-group/src/firebase/index.ts`
- `final-group/src/firebase/repository.test.ts`
- `final-group/src/firebase/vitest.config.mjs`
- `final-group/firestore.rules`

## Verification

```text
Tests: 4/4 repository-contract tests passed with the available Vitest runner:
       node D:\Code\Code\AIO\Code\mxhuit26\node_modules\vitest\vitest.mjs run ...
Smoke: adapter module import + trip/config/invalid-VND assertions passed via tsx.
Build: not run. The worktree has no stable local node_modules/.bin, and final-group is not included by root tsconfig.
Script: powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1 passed (boundary and secret checks).
Rules emulator: not run. firebase-tools, @firebase/rules-unit-testing, firebase.json, and a Firestore emulator configuration are absent.
```

## Known limitations or blockers

- Joining by code requires an approved server-verifiable design: e.g. a
  callable function, or an approved join-proof/index document. Rules cannot
  safely allow a client to self-create membership based only on a secret that
  is neither in the member write nor in a protected server-side proof.
- Event reordering requires an approved persisted ordering field/strategy. No
  such field exists in `references/data-model.md`.
- `users/{uid}.tripIds` is deliberately an untrusted convenience index. A
  lead removing a member cannot safely remove a trip ID from another user's
  profile using the current client-only permission model, so it can become
  stale; membership remains the authorization source of truth.
- The existing `final-group/src/domain.ts` has a different event
  status/category vocabulary. Integration must add an explicit mapping or a
  separately approved schema alignment; do not silently coerce persisted
  values.

## Next safe action

- Choose an approved join/reorder schema or callable-function approach, then
  add Firestore Emulator rules tests before enabling either UI control.
- Have the integration chat wire `TripBackend` through dependency injection
  and add an explicit adapter-to-UI domain mapping.

## Do not touch

- Portfolio `src/`, `bai-4/`, `bai-5/`, Firebase project deployment settings,
  or generated artifacts.
