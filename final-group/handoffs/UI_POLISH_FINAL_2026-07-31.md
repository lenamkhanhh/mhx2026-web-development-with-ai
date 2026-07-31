# Module handoff

## Owner

- Chat/module: Coordinator — TripFlow UI critic polish
- Branch: `codex/final-group-integration-clean`
- Date: 2026-07-31

## Scope completed

- Fixed the Expenses tablet/mobile grid override. Ledger regions now stack at narrow widths; there is no collapsed 34 px balance or settlement rail.
- Changed Expenses metrics to truthful VND totals for pending and settled expenses, retaining counts only as supporting metadata.
- Rebuilt Timeline rows for compact operations scanning: persisted time rail, location, assignee, participant count, semantic status, an action menu, and an electric-blue selected state.
- Enriched Overview activity context from local-resettable demo records only and gave persisted activity kinds semantic icon/tone mapping.
- Made Members scan-first: explicit role column, non-editable responsibilities render as text, and authorized action controls are compact.

## Files changed

- `final-group/src/components/WorkbenchOverview.tsx`
- `final-group/src/components/workbench.css`
- `final-group/src/components/workbench.css.test.ts`
- `final-group/src/components/screen-density.css.test.ts`
- `final-group/src/demo/localDemo.ts`
- `final-group/src/features/events/EventsWorkbench.tsx`
- `final-group/src/features/events/EventsWorkbench.module.css`
- `final-group/src/features/events/EventsWorkbench.test.tsx`
- `final-group/src/features/expenses/ExpensesPanel.tsx`
- `final-group/src/features/expenses/ExpensesPanel.css`
- `final-group/src/features/expenses/ExpensesPanel.test.tsx`
- `final-group/src/features/members/MembersPanel.tsx`
- `final-group/src/features/members/MembersPanel.css`
- `final-group/src/features/members/MembersPanel.test.tsx`

## Verification

```text
RED: focused UI regressions failed as expected before source changes.
Tests: npm.cmd test -- final-group --run — 26 files, 138 tests passed.
Build: npm.cmd run build — passed (existing finalGroup chunk-size warning only).
Script: powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1 — boundary and secret checks passed.
Visual: capture-workbench.mjs captured all four screens at 1600x1000 and 390x844 from the local ?demo=1 backend; no document horizontal overflow. Mobile Expenses rails measure 370 px wide.
Checkpoints: 303db75, 3bf2aa2, 58cc1cc, acb0be3.
```

## Known limitations or blockers

- The Expenses composer remains a real drawer rather than a permanently opened decorative column.
- Members deliberately omit online and last-active fields because the persisted schema has neither field.
- Join-by-code, persisted reorder, and settlement proof remain fail-closed where server-side proof is unavailable.
- This task did not push, deploy, or submit any form.

## Next safe action

- Let the user smoke-test `http://127.0.0.1:4176/final-group/?demo=1`; then a coordinator may explicitly decide whether to push the committed checkpoints.

## Do not touch

- `final-group/src/firebase/`, `final-group/firestore.rules`, portfolio, `bai-4/`, `bai-5/`, and the user-owned `tmp/` directory without a separately authorized backend/schema task.
