# Module handoff

## Owner

- Chat/module: Chat 5 - Expenses and Statistics Workbench
- Branch: `codex/final-5-workbench`
- Date: 2026-07-29

## Scope completed

- Added a scoped Workbench presentation for Expenses and Statistics only.
- Retained integer-VND creation validation and paid/owed/balance calculations.
- Added explicit VND whole-number guidance, participant selection, loading/error/retry presentation, and empty-ledger presentation already supplied by the feature.
- Replaced immediate settlement with a Lead-gated confirmation dialog, in-flight state, and retryable error feedback.
- Added a ledger note that makes clear that `pending` and `settled` are record states; neither erases member balances.
- Added scoped reduced-motion rules for the new motion affordances.

## Files changed

- `final-group/src/features/expenses/ExpensesPanel.tsx`
- `final-group/src/features/expenses/ExpensesPanel.css`
- `final-group/src/features/expenses/ExpensesPanel.test.tsx`
- `final-group/src/features/statistics/StatisticsPanel.tsx`
- `final-group/src/features/statistics/StatisticsPanel.css`

## Verification

```text
RED: ExpensesPanel confirmation test failed before the dialog was implemented.
Tests: node .\node_modules\vitest\vitest.mjs run final-group/src/features/expenses final-group/src/features/statistics
       PASS - 5 files, 15 tests
TypeScript: strict targeted tsc over Firebase contracts plus Expenses/Statistics sources
            PASS
Lint: targeted ESLint over Expenses/Statistics
      PASS
Boundary/secret check: powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1
```

## Known limitations or blockers

- VND is represented as a safe positive integer; no decimals are accepted.
- The dialog is a UX guard only. `canSettle` exposes it to a Lead, while `ExpenseFeature`, the backend contract, and Firestore rules remain the authoritative fail-closed boundary.
- Settlement calls the existing `TripBackend.settleExpense(tripId, expenseId)` integration through the parent callback; this task does not change Firebase, schema, rules, or App wiring.
- The optional loading/error/retry props are backward compatible. The current App owner may wire a snapshot-level loading or error source later.

## Next safe action

