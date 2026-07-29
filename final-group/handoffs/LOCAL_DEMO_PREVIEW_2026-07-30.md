# Local rich-demo preview handoff

## Owner

- Chat/module: Final 0 — coordinator / local acceptance preview
- Branch: `codex/final-group-integration-clean`
- Date: 2026-07-30

## Scope completed

- Added an opt-in local preview at `/final-group/?demo=1` that uses an
  in-memory `TripBackend`, never the Firebase adapter.
- Seeded three synthetic trips for visual acceptance testing. The primary
  Bangkok board has five demo members, ten itinerary entries across every
  supported event status, and eight VND expense entries across pending and
  settled states.
- Kept the data interactive: the normal create/update/delete/reorder/settle
  flows broadcast to local subscribers and reset on page reload.
- Kept join-by-code fail-closed and added an explicit local-data notice so the
  preview cannot be mistaken for real Firebase data.

## Files changed

- `AGENTS.md`
- `final-group/src/demo/localDemo.ts`
- `final-group/src/demo/localDemo.test.ts`
- `final-group/src/main.tsx`
- `final-group/src/App.tsx` and `final-group/src/App.test.tsx`
- `final-group/src/styles.css`

## Verification

```text
RED: localDemo test initially failed because the local-only backend did not exist.
Tests: localDemo + App target — 2 files, 12/12 passed
Tests: npm.cmd test -- final-group — 22 files, 112/112 passed
Build: npm.cmd run build passed
Script: verify-final-group.ps1 passed boundary and secret checks
Visual: http://127.0.0.1:4173/final-group/?demo=1 inspected in Overview,
        Timeline, Expenses, and Members; rich data, status variety, and local
        warning were visible.
```

## Known limitations or blockers

- The preview is intentionally development-only. Production builds do not
  activate it, even if the query string is present.
- It is a visual/local interaction sandbox, not a Firestore Emulator or
  production Firebase smoke test. Reloading clears all local mutations.
- Join-by-code remains server-proof required and fail-closed in demo mode too.
- The existing Vite finalGroup bundle-size warning remains non-blocking.

## Next safe action

- Let the user perform manual acceptance testing using the local demo tab.
  Capture only actionable UI/UX feedback, then apply it before any deployment
  or form submission decision.

## Do not touch

- Production Firebase documents, credentials, deployment settings, `main`
  branch, or coursework submission forms as part of local-preview work.
