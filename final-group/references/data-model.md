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
order: non-negative integer
category: "transport" | "stay" | "food" | "activity" | "other"
startAt: ISO datetime
endAt: ISO datetime
status: "pending" | "approved" | "happening" | "completed" | "cancelled"
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
category?: "transport" | "accommodation" | "food" | "activities" | "other"
createdAt: server timestamp
updatedAt: server timestamp
```

Store money as integer VND, not floating-point fractions.
The optional overview fields are migration-safe: absent values mean **not set**.
The UI must show that absence directly and must not infer a location, assignee,
priority, budget, or expense category from a title or another field.
The `settled` status is only an internal reconciliation marker. It does not
represent or replace a transfer record, receipt, or payment-provider proof.

The collaboration extension is specified in
[`collaboration-data-extension.md`](./collaboration-data-extension.md). Its
documents are plain text only and remain within the Timeline/Overview flow.
