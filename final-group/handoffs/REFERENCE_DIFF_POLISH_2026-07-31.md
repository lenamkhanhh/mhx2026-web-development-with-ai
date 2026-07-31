# Reference diff polish — 2026-07-31

## Scope completed

- Expenses now has a real-data right rail: settlement suggestions, category totals, and the three most recent persisted expenses. It does not invent payments, members, or activity.
- Timeline cards no longer repeat full date strings per row. Day headings and the time rail remain the date context; cards show category, compact time range, participant count, real notes, selection, detail actions, and pending/reorder behavior.
- Members now presents a compact locked action, plus the reference-style default-role control as intentionally disabled UI. There is no client-side role mutation because Firestore rules and a server-verifiable join contract remain authoritative.
- Workbench metadata was softened without reducing the readable 10px minimum, and desktop/mobile capture confirms no horizontal overflow.

## Changed files

- `src/components/workbench.css`
- `src/features/events/EventsWorkbench.tsx`
- `src/features/events/EventsWorkbench.module.css`
- `src/features/events/EventsWorkbench.test.tsx`
- `src/features/expenses/ExpensesPanel.tsx`
- `src/features/expenses/ExpensesPanel.css`
- `src/features/expenses/ExpensesPanel.test.tsx`
- `src/features/members/MembersPanel.tsx`
- `src/features/members/MembersPanel.css`
- `src/features/members/MembersPanel.test.tsx`

## Verification

- `npm.cmd test -- final-group --run` — 26 files, 144 tests passed.
- `npm.cmd run build` — passed; Vite reported only the existing chunk-size warning.
- `powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1` — passed.
- `git diff --check` — passed.
- Captures: `output/tripflow-reference-polish/` and `output/tripflow-reference-polish-mobile/`.
  - 1600px and 390px captures cover Overview, Timeline, Expenses, Members.
  - Metrics report no horizontal overflow on all eight captures.

## Known limitations

- Join-by-code remains visibly fail-closed until a server-verifiable callable/schema is implemented.
- Default member role is display-only until an authorized backend contract exists.
- Settlement suggestions are calculations, not transfer confirmations.
- No deploy, push, or submission action was taken.

## Next safe action

Review the local demo at `http://127.0.0.1:4176/final-group/?demo=1`; after approval, push the local commit to trigger the existing deployment.
