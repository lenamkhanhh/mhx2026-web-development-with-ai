# Coordinator UI/UX completion handoff

## Owner

- Chat/module: Final 0 — coordinator, authenticated TripFlow workbench
- Branch: `codex/final-group-integration-clean`
- Date: 2026-07-29

## Scope completed

- Brought the four approved authenticated screens to the dense light workbench
  direction: Overview, Timeline, Expenses, and Members.
- Kept the real App composition boundary intact: `App` owns session/trip
  snapshots and calls the typed Events and Expenses features for mutations.
- Added explicit, keyboard-reachable Timeline detail/edit and Expenses
  detail/edit/delete panels. Panels open only from a deliberate `Chi tiết`
  action, so browsing the dense ledger does not duplicate or obscure rows.
- Densified the Members screen with a permission-context table and an explicit
  server-verification warning for the join code. Client role badges remain
  affordances; Firebase Rules remain the enforcement boundary.
- Restyled Auth and Onboarding to the approved warm light workbench system
  without changing their inline validation, pending locks, or fail-closed
  behavior.
- Preserved the existing reduced-motion, loading, empty, error/retry, and
  optimistic reorder-lock behavior.

## Files changed

- `src/App.tsx`
- `src/features/events/EventsWorkbench.tsx`,
  `src/features/events/EventsWorkbench.module.css`, and
  `src/features/events/EventsWorkbench.test.tsx`
- `src/features/expenses/ExpensesPanel.tsx`,
  `src/features/expenses/ExpensesPanel.css`, and
  `src/features/expenses/ExpensesPanel.test.tsx`
- `src/features/members/MembersPanel.tsx`,
  `src/features/members/MembersPanel.css`, and
  `src/features/members/MembersPanel.workbench.test.tsx`
- `src/features/auth/AuthFlow.tsx`, `src/features/auth/AuthFlow.module.css`,
  and `src/features/auth/AuthFlow.test.tsx`
- `src/features/onboarding/OnboardingFlow.tsx`,
  `src/features/onboarding/OnboardingFlow.module.css`, and
  `src/features/onboarding/OnboardingFlow.test.tsx`

## Verification

```text
Tests: npm.cmd test -- final-group — 21 test files, 108/108 tests passed
Rules: npm.cmd run test:final-group:rules — Firestore Emulator, 9/9 passed
E2E: npm.cmd run test:final-group:e2e — 2 critical Playwright flows passed
Build: npm.cmd run build — production build passed
Script: final-group/scripts/verify-final-group.ps1 -Full — boundary and secret
        scans, unit tests, build, Rules, and E2E checks completed successfully
Diff: git diff --check passed; worktree clean before this documentation handoff
Visual: local authenticated Members and Expenses screens inspected in the
        browser without mutating the user's existing data
```

## Known limitations or blockers

- Join-by-code intentionally remains fail-closed until a callable function or
  equivalent server-verifiable proof is implemented and reviewed.
- This is a local release checkpoint only: Firebase Rules have not been
  deployed, no production Firebase smoke test has been claimed, and no
  deployment, push to `main`, or form submission was performed.
- Vite still emits the existing `finalGroup` chunk-size warning. It does not
  block the production build, but code-splitting is the next performance task
  if a bundle budget is required.

## Next safe action

- Use an isolated/demo Firebase account to manually exercise create trip,
  Timeline edit/reorder, expense update/delete/settle, member responsibility,
  logout/login, and the visible fail-closed join-code state. Then request
  explicit approval before deploying Rules/app or submitting coursework.

## Do not touch

- `final-group/src/firebase/`, `final-group/firestore.rules`, deployment
  settings, submission forms, and unrelated `bai-4/`, `bai-5/`, or portfolio
  projects without a separate scoped task.
