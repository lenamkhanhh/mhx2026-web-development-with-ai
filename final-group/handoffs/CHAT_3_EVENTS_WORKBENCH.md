# Chat 3 Events Workbench handoff

- Branch: `codex/final-group-events-workbench`
- Baseline: `eba8bfc`
- Ownership: `final-group/src/features/events/**` and event-focused tests only.

## Delivered

- Added `EventsWorkbench`, a scoped, typed presentation component for the existing `EventFeature` and `TripBackend` callback surface.
- Added a calm timeline/workbench: create-event composer, explicit empty state, Firestore status chips (`pending`, `approved`, `happening`, `completed`, `cancelled`), lead-only approve/cancel/sync controls, and member-safe action visibility.
- Added lead-only optimistic up/down reordering with rollback feedback when the backend rejects the write. The item uses a short CSS transform transition; the `prefers-reduced-motion` media query and the component's data attribute disable it.
- Added saving, success, and rollback/error feedback without changing Firebase contracts, rules, schema, App, or the existing dashboard component.

## Tests and evidence

1. RED checkpoint: `a0a339b test: add events workbench behavior contract`; the test failed solely because `./EventsWorkbench` did not yet exist.
2. GREEN command (shared checkout dependency override only):
   ```powershell
   $env:EVENTS_TEST_NODE_MODULES='D:\Code\Code\AIO\Code\mxhuit26\node_modules'
   node 'D:\Code\Code\AIO\Code\mxhuit26\node_modules\vitest\vitest.mjs' run final-group/src/features/events --coverage --config final-group/src/features/events/vitest.config.mjs
   ```
   Result: 2 files passed, 13 tests passed. Overall V8 coverage: 82.71% statements, 86.56% branches, 80.00% functions, 89.44% lines.
3. `powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1` passed boundary and secret checks.
4. `git diff --check` passed.

## Integration note

The component is deliberately not mounted from `App.tsx` or `components/TripDashboard.tsx`, because those files are outside this task's ownership. A later integration owner can replace the dashboard's inline event composer/panel with `EventsWorkbench`, connecting its props to the existing `EventFeature` methods and realtime snapshot.

## Contract vocabulary

The UI maps the typed Firebase status vocabulary directly: `pending`, `approved`, `happening`, `completed`, and `cancelled`. Reorder calls the existing typed `TripBackend.reorderEvents(tripId, eventIds)` through the provided `onMove` callback; no adapter/schema/rules change was required.