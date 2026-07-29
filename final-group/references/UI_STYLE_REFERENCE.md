# TripFlow Workbench UI style reference

Status: approved visual reference from the user on 2026-07-29.

The five reference captures in [`ui/`](./ui/) are the source of truth for the
TripFlow final-group interface:

1. [`01-timeline-workbench.png`](./ui/01-timeline-workbench.png) — timeline
2. [`02-expenses-workbench.png`](./ui/02-expenses-workbench.png) — expenses
3. [`03-members-workbench.png`](./ui/03-members-workbench.png) — members
4. [`04-auth-workbench.png`](./ui/04-auth-workbench.png) — authentication
5. [`05-onboarding-workbench.png`](./ui/05-onboarding-workbench.png) —
   first-trip onboarding

## Design read

This is a dense operations workbench, closer to Linear, Notion, or Attio than
to a marketing landing page. It should feel like a calm internal tool for
planning and operating a real trip.

- Warm white/light-gray application field with very light grid or dot texture.
- Compact charcoal/navy sidebar with a clear active blue rail and restrained
  green sync indicator.
- Dark, oversized editorial page titles; compact uppercase metadata and labels.
- Thin cool-gray borders, shallow radius, and almost no drop shadows.
- Electric blue is the primary interaction color: active navigation, links,
  primary buttons, focus, and selected rows.
- Acid lime is a deliberate status/action accent, mainly for synced/healthy
  states and create/continue actions.
- Status colors are semantic and sparse: green for done/settled, amber for
  review/pending, blue for open/selected, red only for negative balances.
- Information density comes from tables, timelines, metadata rows, compact
  cards, right-side detail panels, and visible audit/activity context.
- Icons are small line icons with consistent weight; they support scanning and
  must not become decoration.
- Auth and onboarding use the same system: white bordered cards, Vietnamese
  labels, generous whitespace, lime CTA, and a fail-closed join-code warning.
- Responsive behavior may collapse the sidebar and stack panels, but must retain
  the same hierarchy and real content.

## What to preserve

- Only the four real workbench screens: Overview, Timeline, Expenses, Members.
- Real feature states and actions; no fake decorative modules or invented data
  presented as real.
- Inline validation, pending-action locking, keyboard-visible focus, and
  `prefers-reduced-motion`.
- The right detail/context panel pattern where it materially helps the task.

## What to avoid

- Dark sci-fi dashboards, neon gradients, glassmorphism, oversized decorative
  illustrations, or a hero-first landing-page composition.
- Excessive rounded “pill” UI, heavy shadows, animated backgrounds, or
  scroll-hijacking transitions.
- Adding Files, Notes, Checklists, Integrations, or Settings as extra product
  screens unless explicitly required by the assignment; they may remain only as
  non-functional navigation affordances in the reference.
- Showing a client-side role badge or join-code success as proof of permission.
  Firebase rules and server-verifiable flows remain authoritative.

Any visual change to the authenticated app must be checked against these
captures and this contract before handoff.
