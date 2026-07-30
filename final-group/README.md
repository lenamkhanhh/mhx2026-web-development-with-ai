# TripFlow Workbench

TripFlow is a collaborative travel-planning workbench built for the UIT Web
Development with AI final group project. It keeps a shared trip's itinerary,
expenses, and members in one Firebase-backed workspace.

## Live project

- **Production app:** https://mxhuit26.vercel.app/final-group/
- **Source repository:** https://github.com/lenamkhanhh/mhx2026-web-development-with-ai

## What a reviewer can test

1. Create an account or sign in with Firebase Email/Password Authentication.
2. Create a trip in the onboarding flow. The creator becomes the trip lead.
3. Use the four workbench screens:
   - **Overview** — status and category filters, sort controls, real global
     search, activity context, and expense summary.
   - **Timeline** — create, edit, approve, cancel, delete, and reorder
     itinerary items according to role.
   - **Expenses** — create, filter, edit, delete, calculate balances, and
     settle an expense as lead.
   - **Members** — search/filter members, assign responsibilities, inspect
     permissions, and remove a member as lead.
4. Check permission behaviour: members can propose pending itinerary items;
   only the lead can approve/reorder events, settle expenses, or remove another
   member.

## Stack

- React 19, TypeScript, and Vite
- Firebase Authentication and Cloud Firestore
- Vitest, Firebase Rules unit tests, and Playwright E2E tests
- Vercel for the public frontend deployment

## Data and security

The client uses only Firebase's public web configuration. Firestore Security
Rules are the authorization boundary for every data mutation; UI role badges
are only affordances. All money is stored as integer VND. The repository does
not contain service-account credentials or private keys.

Joining an existing trip by code is intentionally shown as unavailable in this
release. A client-only implementation could let a user self-grant membership,
so this action remains fail-closed until a server-verifiable join flow is
available.

## Local setup

```bash
npm install
```

Copy `final-group/.env.example` to the repository-root `.env.local`, then add
the five public Firebase web variables. Do not add an Admin SDK credential,
private key, or service-account JSON.

```bash
npm run dev -- --host 127.0.0.1
```

Open `/final-group/` on the local Vite URL.

For a synthetic, development-only preview, append `?demo=1`. It is in-memory,
visibly labelled, resets on reload, and is intentionally disabled in production.

## Verification

```bash
npm.cmd test -- final-group
powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1
npm.cmd run build
```

With Java installed, the full local verification also covers Firestore Rules and
browser E2E flows:

```powershell
powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1 -Full
```

## Known limitation

The production app does not include a server-verified invite/join-by-code
endpoint yet. A reviewer can still verify the complete create-trip and
lead/member management workflow by creating a new account and trip.
