# Module handoff

## Owner

- Chat/module: Chat 3 — Events
- Branch: `codex/final-group-events`
- Date: 2026-07-28

## Scope completed

- Added a `TripBackend`-based event feature with create, update, delete,
  lead approval/cancellation, client-side overlap validation, realtime trip
  snapshot handling, and lead-only status synchronization.
- Kept Firebase authorization authoritative. The membership role passed to the
  feature only controls responsive UI feedback; the backend and Firestore
  rules still validate the actual actor.
- Added pure event input, conflict, and status-derivation helpers using the
  approved Firestore vocabulary.
- Preserved the fail-closed ordering boundary: the feature forwards an intended
  event-id order to `TripBackend.reorderEvents`, which currently rejects until
  an approved persisted ordering strategy exists.

## Files changed

- `final-group/src/features/events/events.ts`
- `final-group/src/features/events/events.test.ts`
- `final-group/src/features/events/vitest.config.mjs`
- `final-group/handoffs/CHAT_3_EVENTS.md`

## Verification

```text
RED: 7 event tests failed against the pre-contract feature implementation.
Tests: 7/7 passed
  node D:\Code\Code\AIO\Code\mxhuit26\node_modules\vitest\vitest.mjs run
    final-group/src/features/events/events.test.ts
    --config final-group/src/features/events/vitest.config.mjs
Coverage: events.ts passed the TDD threshold
  statements 88.34%, branches 84.84%, functions 91.17%, lines 92.30%
Type-check: passed
  node D:\Code\Code\AIO\Code\mxhuit26\node_modules\typescript\lib\tsc.js
    --noEmit --target ES2022 --module ESNext --moduleResolution Bundler
    --strict --skipLibCheck final-group/src/features/events/events.ts
Script: passed
  powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1
Build: not run; root tsconfig does not include final-group and this feature is
  not yet wired into App.
```

## Known limitations or blockers

- Firestore statuses are `pending`, `approved`, `happening`, `completed`, and
  `cancelled`. The older UI domain uses `upcoming`, `ongoing`, `done`, and
  additionally `paused`. Integration must explicitly map
  `approved → upcoming`, `happening → ongoing`, `completed → done`; there is
  no approved persisted mapping for `paused`.
- Firestore categories are `transport`, `stay`, `food`, `activity`, and
  `other`, differing from the older UI-domain categories. Existing EventDraft
  presentation-only fields (`description`, `location`, `payerId`, `amount`)
  are not in the approved event schema and are intentionally not persisted.
- Reordering remains unavailable by design: the schema has no `order` field.
  The integration UI must disable/hide its reorder controls until a schema or
  server-side strategy is approved.
- Conflict validation is a client-side preflight, not an atomic Firestore
  invariant. Strict cross-client conflict prevention needs an approved
  transaction/server design and Rules support.

## Next safe action

- In the integration layer, inject `TripBackend`, map Firestore records to the
  legacy UI only explicitly, and hide unsupported event fields/actions.
- Add Emulator/rules tests plus an approved persisted ordering and conflict
  strategy before enabling those actions in a production UI.

## Do not touch

- `final-group/src/firebase/`, auth/onboarding ownership, `final-group/src/App.tsx`,
  portfolio `src/`, `bai-4/`, `bai-5/`, deployment settings, or Firestore schema.
