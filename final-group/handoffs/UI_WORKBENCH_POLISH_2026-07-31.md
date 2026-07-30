# Workbench UI polish — 2026-07-31

## Scope

Re-aligned the four authenticated TripFlow views with the approved dense
operations-workbench captures. This is a presentation and responsive-layout
pass only: Firestore contracts, role gates, mutation handlers, and the
fail-closed join-by-code message are unchanged.

## Changed files

- `src/components/workbench.css`
  - Keeps the Overview context rail at laptop widths and gives itinerary rows
    slightly more readable density.
- `src/features/events/EventsWorkbench.module.css`
  - Keeps the Timeline inspector beside the event rail until tablet width and
    reduces visual weight of inline management controls.
- `src/features/expenses/ExpensesPanel.css`
  - Re-composes Expenses into a primary expense register with a contextual
    balance, settlement, and detail rail.
- `src/features/members/MembersPanel.tsx`
  - Separates the primary member lane from the contextual rail without changing
    member operations or join-code behavior.
- `src/features/members/MembersPanel.css`
  - Makes the right rail an independent Join code then Member context column;
    it stacks below the main lane at tablet/mobile widths.
- `src/components/workbench.css.test.ts`
- `src/components/screen-density.css.test.ts`
  - Update responsive density assertions to the intentional laptop/tablet
    breakpoints.

## Verification

- Focused UI tests: 29 passed across Overview, Timeline, Expenses, Members,
  and responsive-density contracts.
- `npm.cmd run build`: passed.
- Visual QA: local `?demo=1` screenshots at 1600px and 1280px for Overview,
  Timeline, Expenses, and Members. Confirmed desktop right rails and the
  tablet stacking behavior.

## Known limitation

- The complete repository suite is currently 189/190. The only failure is the
  pre-existing `server/vercelDeployment.test.ts` assertion that requires an
  obsolete two-rule `vercel.json`; the current repository intentionally has
  additional `/bai-5` and `/final-group` rewrite rules. This pass did not alter
  Vercel routing or that unrelated deployment test.

## Next safe action

Review the local demo visually with the user, then sync/commit the approved
polish to the standalone submission repository and deploy through its existing
Vercel connection.
