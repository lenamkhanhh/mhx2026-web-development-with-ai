# TripFlow data model

Use these names unless a migration is explicitly agreed in the handoff.

## Firestore paths

```text
users/{uid}
trips/{tripId}
trips/{tripId}/members/{uid}
trips/{tripId}/events/{eventId}
trips/{tripId}/expenses/{expenseId}
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
createdAt: server timestamp
updatedAt: server timestamp
```

Store money as integer VND, not floating-point fractions.
