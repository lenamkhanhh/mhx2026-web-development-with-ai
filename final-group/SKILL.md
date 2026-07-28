# Final group project working contract

## Source of truth

`final-group/` is a separate course application. Do not mix its feature code
with the portfolio in `src/`, the Buổi 4 artifact in `bai-4/`, or the Buổi 5
artifact in `bai-5/`.

## Module ownership

- `src/domain.ts`: pure business rules and shared domain types.
- `src/auth.ts`: pure authentication input validation and safe error mapping.
- `src/components/`: presentational dashboard components.
- `src/firebase/`: Firebase Auth/Firestore adapter (when implemented).
- `src/features/auth/`: auth and onboarding screens (when implemented).
- `src/features/events/`: event CRUD, approval, conflicts, and statuses.
- `src/features/members/`: trip membership and Lead/Member actions.
- `src/features/expenses/`: expenses, balances, and statistics.

## Safety rules

1. Keep Firebase web configuration public-only; never commit service-account
   credentials, private keys, or `.env` secrets.
2. Enforce authorization in Firestore Security Rules, not only in React UI.
3. Use synthetic demo members only for local seed data and label them as demo.
4. Preserve the existing `/bai-5/` route and portfolio behavior.
5. Run targeted tests before changing shared configuration.
6. Do not push `main` or deploy until the integration/release review is done.

## Required verification

```bash
npm.cmd test -- final-group
npm.cmd run build
```

The final handoff must include changed files, tests executed, build result,
known limitations, and whether Firebase/Vercel behavior was verified live.
