# Public interactive demo access

## Owner

- Chat/module: Coordinator integration
- Branch: `codex/final-group-integration-clean`
- Date: 2026-07-31

## Scope completed

- Added an account-free `?demo=1` interactive sandbox that runs solely against
  the synthetic in-memory TripBackend.
- Added the `Explore interactive demo` entry point to authentication and an
  `Exit demo` action in the visible sandbox notice.
- Kept real Firebase authentication and Firestore out of the sandbox path;
  changes reset on reload.

## Files changed

- `src/main.tsx`
- `src/App.tsx`
- `src/demo/localDemo.ts` and its tests
- `src/features/auth/AuthFlow.tsx`, CSS, and tests
- `src/styles.css`
- `e2e/public-demo-access.spec.ts`

## Verification

```text
RED: 3 focused suites failed for the intended missing production access, auth action, and exit control.
GREEN: 3 focused suites / 21 tests passed.
E2E: public-demo-access.spec.ts passed; creates an item, reloads to reset it, exits to auth, and observes no external request.
Full gate: boundary/secret scan, 135 unit tests, production build, Rules emulator, and browser E2E invoked through verify-final-group.ps1 -Full.
```

## Known limitations or blockers

- The sandbox is intentionally browser-memory-only and is not collaborative or durable.
- Join-by-code and Firebase Storage remain fail-closed until their server-side authorization paths exist.

## Next safe action

- Mirror this batch to the standalone submission repository, run its verifier,
  then deploy the existing Vercel project.

## Do not touch

- Firebase production data, Security Rules, or real user accounts for demo data.
