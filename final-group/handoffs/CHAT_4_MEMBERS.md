# Module handoff

## Owner

- Chat/module: Chat 4 — Members
- Branch: `codex/final-group-members-wave4`
- Date: 2026-07-28

## Scope completed

- Added `MembersFeature`, a typed `TripBackend` orchestration layer that
  subscribes to the selected trip, exposes its member list and join code, and
  releases its realtime subscription.
- Added responsibility updates limited in the client to the authenticated
  member's own UID, plus lead-only removal of another UID.
- Added `MembersPanel` using the approved Firebase-facing `MemberRecord` and
  `TripRecord` contracts; it displays the join code and hides unauthorized
  edit/removal controls.
- Added narrow authorization and feature tests. No Firestore schema, Rules,
  App, Auth, or Events files were changed.

## Files changed

- `final-group/src/features/members/authorization.ts`
- `final-group/src/features/members/authorization.test.ts`
- `final-group/src/features/members/members.ts`
- `final-group/src/features/members/members.test.ts`
- `final-group/src/features/members/MembersPanel.tsx`
- `final-group/src/features/members/MembersPanel.test.tsx`
- `final-group/src/features/members/vitest.config.mjs`
- `final-group/handoffs/CHAT_4_MEMBERS.md`

## Verification

```text
Tests: 6/6 authorization and MembersFeature tests passed with the available Vitest runner:
  node D:\Code\Code\AIO\Code\mxhuit26\node_modules\vitest\vitest.mjs run
    final-group/src/features/members/members.test.ts
    --config final-group/src/features/members/vitest.config.mjs
Type-check: authorization.ts and members.ts passed with strict standalone tsc.
Boundary/secret script: passed
  powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1
Panel test: written but not run for the same missing local React/jsdom runtime.
Build: not run; Members is intentionally not wired into App.
```

## Known limitations or blockers

- `role` in `MembersFeature` and `MembersPanel` is only a client-side UI
  affordance and can be stale or forged. Firestore Rules must remain the
  enforcement boundary; `TripBackend` itself does not carry the actor.
- The present Rules allow a lead to delete any other UID, including a second
  lead record if one existed; the UI only blocks self-removal. The agreed
  schema has no separate invariant guaranteeing exactly one lead membership.
- Direct panel type-check/test needs a stable local `react`, React type, and
  jsdom resolution path. Per coordinator instruction, no dependency install
  was attempted in this wave.

## Next safe action

- Integration should instantiate `MembersFeature` with the authenticated user
  and current membership role, bind its snapshot to `MembersPanel`, and wire
  the two panel callbacks to `updateResponsibility` and `removeMember`.
- Add Firestore Emulator Rules tests for self-only responsibility updates and
  lead-only deletion before enabling live production mutations.

## Do not touch

- `final-group/src/firebase/`, `final-group/firestore.rules`, Auth,
  Onboarding, Events, `final-group/src/App.tsx`, portfolio `src/`, `bai-4/`,
  `bai-5/`, deployment settings, and generated artifacts.
