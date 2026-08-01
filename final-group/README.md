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
   A signed-in teammate can join with the generated 16-character code; the
   code is resolved through a time-limited, SHA-256-addressed Firestore proof.
3. Use the four workbench screens:
   - **Overview** — status and category filters, sort controls, real global
     search, activity context, and expense summary.
   - **Timeline** — create and fully edit events; approve, pause, resume,
     complete, cancel, delete, and reorder according to role; attach an event
     cost, add notes/sub-items, and inspect category/status/current-event
     statistics. Open events advance automatically while the app is active.
   - **Expenses** — create, filter, edit, delete, calculate balances, and
     settle an expense as lead.
   - **Members** — join by verified code, search/filter members, edit your
     display name and responsibility, inspect permissions, and remove another
     member as lead.
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

Notes and sub-items are stored in Firestore under their trip, with an
actor-attributed activity record written in the same client batch. The activity
feed is append-only in Security Rules and only shows persisted records. It is
not presented as a server-forensic audit trail: trusted audit logging would
require a server-side writer.

Join codes never authorize membership on their own. New trips atomically create
a time-limited proof whose document id is the SHA-256 digest of a high-entropy
code. Rules allow a signed-in caller to create only their own `member` record
when that proof is active, unexpired, and belongs to the requested trip; the
same path cannot grant `lead` or add a different uid. Proof collections cannot
be listed.

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

For a synthetic preview, append `?demo=1`. It is in-memory, visibly labelled,
resets on reload, and never writes to Firebase, including on the public build.

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

## Known limitations

Trips created before the proof-backed join migration do not automatically gain
a new proof. Create a fresh trip when evaluating join-by-code. Proof rotation
is protected by Rules but is not exposed as a separate UI control in this
release.

File uploads remain unavailable because Firebase Storage and its matching
Security Rules are intentionally not configured in this release.
