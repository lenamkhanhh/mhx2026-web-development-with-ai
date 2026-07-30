# Overview visual QA — 2026-07-30

## Comparison target

- Source visual truth: `references/ui/06-overview-workbench.png` (1568 × 1003 px).
- Implementation capture: `output/ui-qa-2026-07-30/overview-after.png` (1600 × 1000 px), rendered at a 1600 × 1000 desktop viewport, `?demo=1`, lead user, Bangkok demo trip, Overview selected.
- Combined evidence: `output/ui-qa-2026-07-30/overview-comparison.png` (3168 × 1051 px). The source and implementation are placed side by side; no device chrome or density normalization was needed beyond the small capture-size difference.

## Comparison history

### Iteration 1

- Findings: dotted field, oversized page rhythm, overly loose table rows and context rail, and no visible route to the real reorder workflow.
- Fixes: removed the dotted field; tightened page, toolbar, table, status, and right-rail spacing; reduced heading/row scale; added a footer action that opens Timeline where persisted reorder already exists.
- Post-fix evidence: `output/ui-qa-2026-07-30/overview-after.png`.

## Findings

- [P1] Data-backed operational columns are unavailable.
  Location: Overview table and right context rail.
  Evidence: the reference has Location, Assignee, Priority, timestamped Activity Feed, budget and category allocation. The implementation intentionally renders only EventRecord/ExpenseRecord fields currently present in the Firebase contract.
  Impact: the page cannot reach 1:1 structural parity without presenting invented values as real.
  Fix: approve a separate Firebase/schema phase for event location, assignee, priority, activity/audit records, trip budget, and expense categories; add rules, codecs, tests, and migration/demo data before exposing them.

- [P2] The banner remains a full-width information row.
  Location: above Overview controls.
  Evidence: local demo disclosure must remain visible by project rule; the reference does not include it.
  Impact: it consumes one extra dense row in the local demo only.
  Fix: retain it in demo mode for safety; production should not render it.

## Fidelity surfaces

- Fonts and typography: condensed editorial heading plus compact mono metadata align with the approved workbench language; title and row scale were reduced to avoid the oversized local result.
- Spacing and layout rhythm: shell, compact toolbar, table rows, rail panels, and footer are denser; thin borders and low-radius cards remain intact.
- Colors and visual tokens: warm light field, charcoal sidebar, electric blue interaction state, acid-lime create action, and semantic status colors match the approved tokens.
- Image quality and assets: no new raster assets were introduced. Existing Phosphor line icons remain consistent with the implementation’s established icon set.
- Copy and content: all visible records are synthetic, local-demo-labelled data. The reorder affordance truthfully routes to Timeline rather than implying overview-table drag persistence.

## Open questions

- Whether the course scope warrants the schema expansion required for the reference’s activity feed, detailed columns, and budget analytics.

## Implementation checklist

1. Keep this UI-only phase limited to the current Workbench presentation and verified navigation.
2. If schema expansion is approved, implement it as a Firebase contract/rules migration before adding the missing reference modules.
3. Re-run visual QA with the expanded real data once that work exists.

## Follow-up polish

- [P3] Consider an explicit overflow menu after a real action list is defined; do not add decorative controls.

final result: blocked
