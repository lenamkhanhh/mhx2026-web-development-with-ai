# TripFlow data model

Use these names unless a migration is explicitly agreed in the handoff.

## Firestore paths

```text
users/{uid}
trips/{tripId}
trips/{tripId}/members/{uid}
trips/{tripId}/events/{eventId}
trips/{tripId}/expenses/{expenseId}
trips/{tripId}/notes/{noteId}
trips/{tripId}/subitems/{subitemId}
trips/{tripId}/activity/{activityId}
tripJoinProofs/{proofId}
```

## Documents

### `users/{uid}`

```text
displayName: string
email: string
tripIds: string[]
updatedAt: server timestamp
```

### `trips/{tripId}`

```text
name: string
destination: string
startDate: YYYY-MM-DD
endDate: YYYY-MM-DD
leadId: uid
joinCode: uppercase string
budgetVnd?: non-negative integer VND
createdAt: server timestamp
updatedAt: server timestamp
```

### `members/{uid}`

```text
displayName: string
email: string
role: "lead" | "member"
responsibility: string
isDemo: boolean
joinedAt: server timestamp
```

### `events/{eventId}`

```text
title: string
description: string
order: non-negative integer
category: "transport" | "stay" | "food" | "activity" | "other"
startAt: ISO datetime
endAt: ISO datetime
status: "pending" | "approved" | "happening" | "completed" | "cancelled" | "paused"
participantIds: string[]
createdBy: uid
approvedBy: uid | null
location?: string
assigneeUid?: uid
priority?: "low" | "medium" | "high"
createdAt: server timestamp
updatedAt: server timestamp
```

### `expenses/{expenseId}`

```text
title: string
amount: non-negative number
paidBy: uid
splitAmong: uid[]
status: "pending" | "settled"
createdBy: uid
eventId?: event id from the same trip
category?: "transport" | "accommodation" | "food" | "activities" | "other"
createdAt: server timestamp
updatedAt: server timestamp
```

An expense with `eventId` is the normalized cost record for that itinerary
event. Its `splitAmong` list mirrors the event participants, while `paidBy`
stores the representative payer selected in the event form. Expenses without
`eventId` remain valid trip-wide expenses.

### `tripJoinProofs/{proofId}`

```text
tripId: string
active: boolean
expiresAt: timestamp
createdBy: lead uid
createdAt: server timestamp
```

`proofId` is the SHA-256 digest of a high-entropy normalized join code. The
proof collection is not listable. An authenticated user may resolve only a
proof id they already know and may use it only to create their own member
document with role `member`. Firestore Rules validate the proof, trip, expiry,
and immutable role.

Store money as integer VND, not floating-point fractions.
The optional overview fields are migration-safe: absent values mean **not set**.
The UI must show that absence directly and must not infer a location, assignee,
priority, budget, or expense category from a title or another field.
The `settled` status is only an internal reconciliation marker. It does not
represent or replace a transfer record, receipt, or payment-provider proof.

During the additive migration, legacy event documents without `description`
decode to an empty string and remain readable. Every new event write includes
a bounded description. `paused` events keep their explicit state and are not
advanced by the realtime status engine. `cancelled` events remain visible and
continue to occupy their time range for conflict validation.

The collaboration extension is specified in
[`collaboration-data-extension.md`](./collaboration-data-extension.md). Its
documents are plain text only and remain within the Timeline/Overview flow.
