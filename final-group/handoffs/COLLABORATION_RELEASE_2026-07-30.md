# Collaboration release handoff

## Owner

- Chat/module: Final-group coordinator
- Branch: `codex/final-group-integration-clean`
- Date: 2026-07-30

## Scope completed

- Added persisted event notes and actionable sub-items to the Timeline inspector.
- Added actor-attributed, append-only persisted activity for those collaboration actions.
- Extended Firestore repository decoding, local demo data, and Security Rules.
- Added emulator browser coverage for persistence and lead/member realtime behaviour.

## Files changed

- `final-group/src/firebase/contracts.ts`
- `final-group/src/firebase/repository.ts`
- `final-group/firestore.rules`
- `final-group/src/App.tsx`
- `final-group/src/features/events/EventsWorkbench.tsx`
- `final-group/src/components/WorkbenchOverview.tsx`
- `final-group/src/demo/localDemo.ts`
- Related unit, Rules, and Playwright tests; README and data-extension reference.

## Verification

```text
Tests: npm.cmd test -- final-group (26 files, 133 tests passed)
Rules: npm.cmd run test:final-group:rules (13 tests passed)
Build: npm.cmd run build (passed)
E2E: npm.cmd run test:final-group:e2e (2 tests passed)
Script: verify-final-group.ps1 -Full (passed)
```

## Known limitations or blockers

- Activity is an actor-attributed client record protected as append-only by Rules, not a server-forensic audit trail.
- Firebase Storage uploads are intentionally unavailable.
- Join-by-code remains fail-closed until a server-verifiable service is introduced.

## Next safe action

- Commit this verified change set, deploy Firestore Rules and the Vercel frontend, then smoke-test the public route.

## Do not touch

- Do not implement client-only join-by-code or claim that activity is server-forensic.
- Do not seed synthetic demo data into production Firebase.
