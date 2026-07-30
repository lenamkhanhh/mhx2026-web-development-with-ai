# Module handoff

## Owner

- Chat/module: Final 6 / TripFlow UI integration
- Branch: `codex/final-group-integration-clean`
- Date: 2026-07-30

## Scope completed

- Rebuilt the authenticated shell and the four real product screens to follow the
  approved dense operations-workbench references.
- Reworked Overview into a table-first command center with real status filters,
  itinerary data, pending actions, expense summary, and recent expenses.
- Aligned Timeline, Expenses, Members, Auth, and Onboarding with the same visual
  system while preserving their existing product logic.
- Preserved the synthetic, reload-resetting `?demo=1` preview and its visible
  local-data notice.
- Preserved inline validation, pending-action locking, keyboard focus,
  responsive layouts, reduced-motion handling, Firebase authorization
  boundaries, and fail-closed join-by-code behavior.
- Fixed browser E2E ambiguity by making page tabs semantic tab controls and by
  opening the Timeline detail panel only after a real user selection.

## Files changed

- `AGENTS.md`
- `final-group/references/UI_STYLE_REFERENCE.md`
- `final-group/references/ui/00-overview-workbench.png`
- `final-group/references/ui/06-overview-workbench.png`
- `final-group/src/App.tsx`
- `final-group/src/components/WorkbenchShell.tsx`
- `final-group/src/components/WorkbenchShell.test.tsx`
- `final-group/src/components/WorkbenchOverview.tsx`
- `final-group/src/components/WorkbenchOverview.test.tsx`
- `final-group/src/components/workbench.css`
- `final-group/src/features/events/EventsWorkbench.tsx`
- `final-group/src/features/events/EventsWorkbench.module.css`
- `final-group/src/features/expenses/ExpensesPanel.css`
- `final-group/src/features/members/MembersPanel.css`
- `final-group/src/features/auth/AuthFlow.tsx`
- `final-group/src/features/auth/AuthFlow.module.css`
- `final-group/src/features/onboarding/OnboardingFlow.tsx`
- `final-group/src/features/onboarding/OnboardingFlow.module.css`

## Verification

```text
Tests: npm.cmd test -- final-group
Result: 22 files, 115 tests passed

Build: npm.cmd run build
Result: passed

Script: powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1 -Full
Result: passed (115 unit tests, production build, 9 Firestore Rules tests,
2 browser E2E tests, boundary and secret scans)
```

## Known limitations or blockers

- Vite reports an existing warning that the final-group JavaScript chunk is
  approximately 620 kB after minification. It does not fail the build or local
  acceptance flow.
- The app deliberately does not invent unsupported location, priority, audit,
  persisted reorder, settlement, or server-verifiable join data.

## Next safe action

- Perform user acceptance testing at
  `http://127.0.0.1:4173/final-group/?demo=1`.
- After explicit coordinator approval, prepare the separate deployment and
  submission phase.

## Do not touch

- Do not weaken Firebase Security Rules or treat client-side role badges as
  authorization.
- Do not make join-by-code optimistic without server-verifiable proof.
- Do not deploy, push `main`, or submit the course form without coordinator
  approval.
