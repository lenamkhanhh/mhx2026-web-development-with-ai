---
name: tripflow-ui-critic
description: Audit and improve TripFlow Workbench visual fidelity against the approved screenshots in final-group/references/ui while preserving real React, Firebase, permission, accessibility, and responsive behavior. Use for TripFlow UI reviews, screenshot comparisons, visual polish, layout or typography corrections, UX-state audits, and pre-handoff verification of Overview, Timeline, Expenses, Members, authentication, or onboarding.
---

# TripFlow UI Critic

Treat the approved captures and `final-group/references/UI_STYLE_REFERENCE.md`
as the visual source of truth. Do not redesign from generic dashboard advice.

## Audit workflow

1. Inspect the current branch, `git status`, and real execution path.
2. Read `final-group/SKILL.md`, `final-group/references/architecture.md`, and
   `final-group/references/UI_STYLE_REFERENCE.md`.
3. Inspect every reference capture relevant to the requested screen.
4. Run the app through the real React entrypoint. Use only the visibly labelled,
   development-only `?demo=1` backend for dense synthetic audit data.
5. Capture the current UI at the same viewport as the reference. Run:

   ```powershell
   node .\.agents\skills\tripflow-ui-critic\scripts\capture-workbench.mjs `
     --url http://127.0.0.1:4173/final-group/?demo=1 `
     --output output\tripflow-ui-audit
   ```

6. Read [references/critique-rubric.md](references/critique-rubric.md) and
   score each relevant criterion from 0 to 2. Support every score with a
   screenshot, DOM measurement, or exact source location.
7. Read [references/anti-patterns.md](references/anti-patterns.md). Separate
   source-of-truth violations from optional polish.
8. Write the audit with
   [references/audit-report-template.md](references/audit-report-template.md).
9. Rank findings by visible impact:
   - P0: unusable, misleading, inaccessible, or breaks a real workflow.
   - P1: major reference mismatch in composition, density, hierarchy, or rail.
   - P2: local inconsistency in typography, spacing, control anatomy, or color.
   - P3: optional polish with no meaningful task impact.

## Visual fidelity gates

Apply these gates in addition to the weighted rubric. Treat a failed gate as
an actionable finding even when the overall region layout looks correct.

### Typography

- Use Barlow Condensed only for the page-level editorial title; use Inter for
  readable body, table, and control copy; reserve IBM Plex Mono for short
  labels, codes, and column metadata.
- Do not ship rendered workbench copy below 10px. Target at least 12px for
  primary row text, 11px for secondary metadata, and 10px for compact labels.
- Check computed sizes in the capture, not only CSS declarations. Titles must
  retain a visible hierarchy without consuming the table's first viewport.

### Semantic color and icon coverage

- Electric blue owns active navigation, links, focus, primary actions, and
  selected rows. Acid lime is limited to create/continue and healthy/synced
  states; never use it as a generic decoration or default role badge.
- Green means done/settled, amber means pending/review, blue means open/
  selected, and red is reserved for negative balances or destructive
  confirmation.
- Render a category-specific line icon whenever persisted category data exists:
  event categories in itinerary/timeline and expense categories in the
  Expenses ledger and Overview Recent Expenses. A generic currency icon is
  only the uncategorized fallback.
- Keep icons in one 24–28px scan frame with a consistent 14–18px line glyph;
  icon color may tint the frame but must not replace the text label.

### Screen parity and density

- Overview must show the table, counters, activity feed, expense summary, and
  the beginning of Recent Expenses in the first desktop viewport; synthetic
  demo content must remain visibly labelled.
- Timeline must put the date/time axis and selected row above secondary
  actions; avoid repeated full-word controls on every row when an overflow
  action or row selection can carry the same real behavior.
- Expenses must expose category as a scan axis in the ledger, keep the ledger
  dominant when a composer/detail surface is open, and keep total/pending/
  settled/balance numerically comparable.
- Members must present identity, role, status/responsibility, and actions as a
  dense scan; keep destructive removal behind a compact action affordance and
  show only persisted activity. Join-code UI remains visibly fail-closed.

### Evidence gate

- Record viewport, URL/mode, commit, capture time, sidebar/context bounds,
  document height, horizontal overflow, visible row counts, and computed title
  or metadata font sizes in every audit.
- Before UI edits, add a focused user-visible regression test and run it RED;
  after edits, run GREEN plus a desktop and 390px capture. Do not claim visual
  parity from source inspection alone.

## Change workflow

When the user authorizes implementation:

1. Fix no more than three to five highest-impact mismatches per iteration.
2. Preserve data contracts, Firebase authorization, real actions, loading,
   error, empty, pending, and reduced-motion states.
3. Prefer existing React and CSS architecture. Do not introduce a new component
   framework merely to imitate a screenshot.
4. Capture the same screens again and compare before and after.
5. Run the narrowest related tests, then build and
   `final-group/scripts/verify-final-group.ps1` when appropriate.
6. Record changed files, captures, tests, known limitations, and next safe
   action. Do not deploy, push main, or submit without coordinator approval.

## Decision rules

- Project reference beats generic design advice.
- Real application state beats decorative fidelity.
- Semantic status meaning beats exact pixel color.
- Layout, density, hierarchy, and alignment beat ornamental details.
- Pixel differences are evidence of change, not evidence of improvement.
- Keep the four product screens only. Never invent Files, Notes, Checklists,
  Integrations, or Settings implementations for visual fullness.
- Fail closed around join codes and client-side role affordances.
- If a requested visual change conflicts with permissions, schema, or an owned
  feature contract, stop and report the conflict.

## Audit output

Always include:

- current branch and commit;
- audited URL, mode, viewport, and capture timestamp;
- overall weighted score and per-screen score;
- a short “already aligned” section;
- prioritized findings with evidence;
- recommended repair order;
- verification limits;
- explicit confirmation that audit-only work did not change product UI.
