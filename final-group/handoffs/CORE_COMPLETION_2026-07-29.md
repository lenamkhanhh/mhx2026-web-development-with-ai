# Core completion handoff

## Owner

- Chat/module: integration — expenses and event ordering
- Branch: `codex/final-group-integration-clean`
- Date: 2026-07-29

## Scope completed

- Connected expense creation to the main App.
- Added lead-only expense settlement from UI through the typed backend.
- Added persistent, lead-controlled event ordering with compatibility for
  existing events that do not have an `order` field yet.
- Removed the obsolete disabled reorder and settlement cards.
- Kept join-by-code fail-closed because it still requires server verification.

## Files changed

- `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`
- `src/features/expenses/ExpensesPanel.tsx`, expense tests and feature logic
- `src/features/events/events.ts`, `src/features/events/events.test.ts`
- `src/firebase/contracts.ts`, `codec.ts`, `repository.ts`
- `firestore.rules`, rules tests, data-model reference and README

## Verification

```text
Tests: 16 suites, 70/70 passed
Rules: Firestore Emulator, 9/9 passed
Build: production build passed; existing >500 kB finalGroup chunk warning remains
Script: verify-final-group.ps1 -Full passed boundary and secret checks
Visual: local responsive App inspected; no page-level horizontal overflow
```

## Known limitations or blockers

- Join-by-code remains disabled until a callable function or server-verifiable
  join proof exists.
- Updated Firestore Rules have not been deployed to the Firebase project in
  this change set, following the user's request to postpone deployment.
- Existing events receive their persistent order the first time the lead
  reorders the itinerary.

## Next safe action

- Complete the callable join-by-code boundary, or freeze the MVP and then
  deploy the updated Firestore Rules before any live UI smoke test.

## Do not touch

- Portfolio, `bai-4/`, `bai-5/`, deployment settings, or submission forms.
