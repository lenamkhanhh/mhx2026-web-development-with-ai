# Module handoff

## Owner

- Chat/module: Chat 5 — Expenses and Statistics
- Branch: `codex/final-group-expenses-statistics`
- Date: 2026-07-28

## Scope completed

- Aligned the feature with Firebase's `ExpenseRecord`, `CreateExpenseInput`,
  `MemberRecord.uid`, and `TripBackend` contract without changing that contract.
- Added `ExpenseFeature` for integer-VND create, owner/Lead update-delete
  checks, and realtime expense-snapshot subscription.
- Added deterministic pure ledgers: paid, owed, and balance remain integer VND;
  indivisible VND is allocated in stable member order and always conserves the
  expense total.
- Added summary statistics and presentation panels ready for App integration.

## Files changed

- `final-group/src/features/expenses/expense-calculations.ts`
- `final-group/src/features/expenses/expense-calculations.test.ts`
- `final-group/src/features/expenses/expenses.ts`
- `final-group/src/features/expenses/expenses.test.ts`
- `final-group/src/features/expenses/ExpensesPanel.tsx`
- `final-group/src/features/expenses/ExpensesPanel.test.tsx`
- `final-group/src/features/expenses/index.ts`
- `final-group/src/features/statistics/expense-statistics.ts`
- `final-group/src/features/statistics/expense-statistics.test.ts`
- `final-group/src/features/statistics/StatisticsPanel.tsx`
- `final-group/src/features/statistics/StatisticsPanel.test.tsx`
- `final-group/src/features/statistics/index.ts`

## Verification

```text
Tests: node .\node_modules\vitest\vitest.mjs run final-group/src/features/expenses final-group/src/features/statistics
       PASS — 5 files, 12 tests
Coverage: node .\node_modules\vitest\vitest.mjs run --coverage final-group/src/features/expenses final-group/src/features/statistics
          PASS — statements 94.64%, branches 83.60%, functions 100%, lines 97.05%
TypeScript: strict targeted tsc over Firebase contracts plus Expenses/Statistics sources
            PASS
Lint: targeted ESLint over Expenses/Statistics
      PASS
Script: powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1
        PASS — boundary and secret checks
Build: not run; App integration remains explicitly owned by Chat 6.
```

## Known limitations or blockers

- Money is safe integer VND throughout. Firebase also rejects fractional and
  negative VND amounts.
- `ExpenseStatus` is reported as `pending` or `settled`, but current
  `TripBackend.updateExpense` intentionally accepts only `CreateExpenseInput`,
  which has no `status` field. The feature does not invent a settlement action.
- The approved schema has no payment-transfer or per-member settlement record.
  Therefore both `pending` and `settled` expense records remain in paid/owed/
  balance calculations; removing `settled` records would falsely erase debt.
- The ledger fails closed for records whose payer is absent from the current
  member snapshot or whose split has no current members. The panel reports
  their count instead of making up allocations.

## Next safe action

- Chat 6 can construct `ExpenseFeature` from `TripBackend`, pass the current
  `TripSnapshot.members` and `TripSnapshot.expenses` to `ExpensesPanel` and
  `StatisticsPanel`, and own the App/style integration.
- Before adding a “mark settled” UI, agree a schema and backend/rules change
  that records who transferred which VND amount to whom.

## Do not touch

- `final-group/src/firebase/`, `final-group/src/features/auth/`,
  `final-group/src/features/events/`, `final-group/src/features/members/`,
  `final-group/src/App.tsx`, schema references, Firestore rules, portfolio,
  Buổi 4, and Buổi 5.
