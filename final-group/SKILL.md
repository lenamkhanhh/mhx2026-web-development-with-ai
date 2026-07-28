---
name: mhx-final-group
description: Shared working contract for the UIT final group-project app in final-group/. Use when implementing, reviewing, testing, documenting, or handing off any TripFlow module.
---

# MHX final group project skill

Read this file before changing anything in `final-group/`. Then load only the
references listed for the assigned module in
[`handoffs/TASK_PROMPTS.md`](./handoffs/TASK_PROMPTS.md).

## First five minutes

1. Confirm the current branch and `git status`.
2. Read `references/architecture.md`.
3. Read the module-specific references before editing.
4. Inspect the real execution path and existing tests.
5. Keep changes inside the module ownership boundary.

## Non-negotiable rules

- Keep the final app self-contained under `final-group/`.
- Preserve the portfolio (`src/`), Buổi 4 (`bai-4/`), and Buổi 5 (`bai-5/`).
- Treat `references/data-model.md` and `references/permissions.md` as the
  source of truth; do not silently invent fields or authorization behavior.
- Keep business rules pure and testable. Do not hide permission checks only in
  React UI; Firestore rules must enforce them too.
- Firebase web configuration may be public client configuration. Never commit
  service-account JSON, private keys, tokens, passwords, or `.env` secrets.
- Use synthetic demo members only for local seed data and label them as demo.
- Do not deploy, push `main`, or submit a form from a feature chat.

## Verification and handoff

Run the narrowest relevant tests while working. Before handing off, run:

```powershell
npm.cmd test -- final-group
powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1
```

Use `-Full` only after the App/Firebase implementation exists:

```powershell
powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1 -Full
```

Record changed files, tests, build result, known limitations, and the next
safe action using [`handoffs/HANDOFF_TEMPLATE.md`](./handoffs/HANDOFF_TEMPLATE.md).
