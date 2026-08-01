# Final group assignment requirement matrix

Source: the three-page group assignment PDF supplied by the user. This file is
the approved additive migration contract for closing the remaining functional
gaps without adding product screens.

## Event management

- Persist title, description, start/end, location, category, participants,
  status, creator/approver, and stable order.
- Event creation may include amount and payer. Store that money once as an
  `ExpenseRecord` linked by `eventId`; derive `splitAmong` from participants.
- New member events start pending. The lead may approve, pause, resume,
  complete, cancel, edit, delete, or reorder according to Rules.
- Validate required text, end after start, participants, payer membership,
  integer VND, and schedule conflicts.

## Time engine

- Approved events become happening at start and completed after end while the
  app is active. Recheck on initial load, a bounded interval, and tab focus.
- Pending, paused, and cancelled events never auto-transition.
- Cancelled events stay visible and occupy their time range.
- Show the current happening event explicitly.

## Members and authorization

- Firebase Authentication protects real workspaces.
- Trip creation creates exactly one lead.
- A valid high-entropy join proof creates the caller's own member document;
  it cannot grant lead or add a different uid.
- Members may edit their own display name/responsibility. Leads may remove
  another member, but never the trip lead.

## Expenses and statistics

- Split every included expense deterministically across `splitAmong` members.
- Show each member's paid, owed, and net balance plus settlement suggestions.
- Show total trip cost and event counts by category and status.
- Show the event currently happening, or an honest empty state.

## Compatibility and release

- Existing event and expense documents remain readable throughout migration.
- Demo data stays synthetic and visibly labelled.
- No new screen beyond Overview, Timeline, Expenses, and Members.
- Rules, unit, component, integration, and E2E gates precede any push/deploy.
