import type {
  EventRecord,
  FirestoreEventCategory,
  FirestoreEventStatus,
} from "../../firebase/contracts";

const CATEGORIES: FirestoreEventCategory[] = ["transport", "stay", "food", "activity", "other"];
const STATUSES: FirestoreEventStatus[] = ["pending", "approved", "happening", "paused", "completed", "cancelled"];

export interface EventStatistics {
  total: number;
  byCategory: Record<FirestoreEventCategory, number>;
  byStatus: Record<FirestoreEventStatus, number>;
  currentEvent: EventRecord | null;
}

export function calculateEventStatistics(events: EventRecord[]): EventStatistics {
  const byCategory = Object.fromEntries(CATEGORIES.map((category) => [category, 0])) as Record<FirestoreEventCategory, number>;
  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<FirestoreEventStatus, number>;
  for (const event of events) {
    byCategory[event.category] += 1;
    byStatus[event.status] += 1;
  }
  const currentEvent = events
    .filter((event) => event.status === "happening")
    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt))[0] ?? null;
  return { total: events.length, byCategory, byStatus, currentEvent };
}
