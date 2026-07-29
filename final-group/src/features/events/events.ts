import type {
  AuthenticatedUser,
  CreateEventInput,
  EventRecord,
  FirestoreEventCategory,
  FirestoreEventStatus,
  FirestoreMemberRole,
  TripBackend,
} from "../../firebase/contracts";

const EVENT_CATEGORIES = new Set<FirestoreEventCategory>([
  "transport",
  "stay",
  "food",
  "activity",
  "other",
]);

export interface EventFeatureOptions {
  backend: TripBackend;
  tripId: string;
  actor: AuthenticatedUser;
  /** A membership snapshot used for responsive UI feedback only. */
  role: FirestoreMemberRole;
}

export type EventActionErrorCode =
  | "forbidden"
  | "invalid-input"
  | "invalid-state"
  | "not-found"
  | "schedule-conflict";

export class EventActionError extends Error {
  constructor(
    public readonly code: EventActionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "EventActionError";
  }
}

/**
 * Orchestrates the Event UI against the typed Firebase port. Security Rules
 * remain authoritative: `role` is only a local affordance, never proof of
 * authorization.
 */
export class EventFeature {
  private events: EventRecord[] = [];
  private readonly listeners = new Set<(events: EventRecord[]) => void>();
  private unsubscribeFromTrip: (() => void) | undefined;

  constructor(private readonly options: EventFeatureOptions) {}

  get snapshot(): EventRecord[] {
    return this.events.map(cloneEvent);
  }

  subscribe(listener: (events: EventRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    this.stop();
    this.unsubscribeFromTrip = this.options.backend.subscribeTrip(
      this.options.tripId,
      (snapshot) => this.replaceEvents(snapshot.events),
    );
  }

  stop(): void {
    this.unsubscribeFromTrip?.();
    this.unsubscribeFromTrip = undefined;
  }

  replaceEvents(events: EventRecord[]): void {
    this.events = events
      .map(cloneEvent)
      .sort((left, right) =>
        left.order - right.order ||
        Date.parse(left.startAt) - Date.parse(right.startAt) ||
        left.id.localeCompare(right.id),
      );
    this.notify();
  }

  async create(input: CreateEventInput): Promise<EventRecord> {
    assertEventInput(input);
    if (this.options.role === "lead") {
      this.assertNoConflict({
        id: "",
        order: this.events.length,
        ...input,
        status: "approved",
        createdBy: this.options.actor.uid,
        approvedBy: this.options.actor.uid,
      });
    }
    return this.options.backend.createEvent(
      this.options.tripId,
      input,
      this.options.actor,
    );
  }

  async update(
    eventId: string,
    patch: Partial<CreateEventInput>,
  ): Promise<void> {
    const existing = this.requireEvent(eventId);
    this.assertCanEdit(existing);
    const next = { ...existing, ...patch };
    assertEventInput(toCreateInput(next));
    this.assertNoConflict(next);
    await this.options.backend.updateEvent(this.options.tripId, eventId, patch);
  }

  async delete(eventId: string): Promise<void> {
    this.assertCanEdit(this.requireEvent(eventId));
    await this.options.backend.deleteEvent(this.options.tripId, eventId);
  }

  async approve(eventId: string): Promise<void> {
    this.assertLead();
    const event = this.requireEvent(eventId);
    if (event.status !== "pending") {
      throw new EventActionError(
        "invalid-state",
        "Only pending events can be approved.",
      );
    }
    this.assertNoConflict({ ...event, status: "approved" });
    await this.options.backend.approveEvent(
      this.options.tripId,
      eventId,
      "approved",
    );
  }

  async cancel(eventId: string): Promise<void> {
    this.assertLead();
    this.requireEvent(eventId);
    await this.options.backend.approveEvent(
      this.options.tripId,
      eventId,
      "cancelled",
    );
  }

  async reorder(eventId: string, direction: "up" | "down"): Promise<void> {
    this.assertLead();
    const currentIndex = this.events.findIndex((event) => event.id === eventId);
    if (currentIndex === -1) this.notFound();
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const ids = this.events.map((event) => event.id);
    if (targetIndex >= 0 && targetIndex < ids.length) {
      [ids[currentIndex], ids[targetIndex]] = [ids[targetIndex], ids[currentIndex]];
    }
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    await this.options.backend.reorderEvents(this.options.tripId, ids);
  }

  async syncStatuses(now = new Date()): Promise<void> {
    this.assertLead();
    const changes: Array<{
      id: string;
      status: Exclude<FirestoreEventStatus, "pending">;
    }> = [];
    for (const event of this.events) {
      const status = deriveEventStatus(event, now);
      if (status !== event.status && status !== "pending") {
        changes.push({ id: event.id, status });
      }
    }
    await Promise.all(
      changes.map(({ id, status }) =>
        this.options.backend.approveEvent(this.options.tripId, id, status),
      ),
    );
  }

  private assertCanEdit(event: EventRecord): void {
    if (
      this.options.role !== "lead" &&
      !(event.createdBy === this.options.actor.uid && event.status === "pending")
    ) {
      throw new EventActionError(
        "forbidden",
        "You cannot modify this event.",
      );
    }
  }

  private assertLead(): void {
    if (this.options.role !== "lead") {
      throw new EventActionError(
        "forbidden",
        "Only the trip lead can perform this action.",
      );
    }
  }

  private assertNoConflict(candidate: EventRecord): void {
    if (hasScheduleConflict(candidate, this.events)) {
      throw new EventActionError(
        "schedule-conflict",
        "This event overlaps another active trip event.",
      );
    }
  }

  private requireEvent(eventId: string): EventRecord {
    const event = this.events.find((candidate) => candidate.id === eventId);
    if (!event) this.notFound();
    return event;
  }

  private notFound(): never {
    throw new EventActionError("not-found", "The event no longer exists.");
  }

  private notify(): void {
    const snapshot = this.snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }
}

export function assertEventInput(input: CreateEventInput): void {
  if (
    !input.title.trim() ||
    !EVENT_CATEGORIES.has(input.category) ||
    !isDateTime(input.startAt) ||
    !isDateTime(input.endAt) ||
    Date.parse(input.endAt) <= Date.parse(input.startAt) ||
    input.participantIds.length === 0
  ) {
    throw new EventActionError("invalid-input", "Invalid event input.");
  }
}

export function hasScheduleConflict(
  candidate: EventRecord,
  events: EventRecord[],
): boolean {
  if (!occupiesSchedule(candidate.status)) return false;
  const candidateStart = Date.parse(candidate.startAt);
  const candidateEnd = Date.parse(candidate.endAt);
  if (!Number.isFinite(candidateStart) || !Number.isFinite(candidateEnd)) {
    return false;
  }

  return events.some((event) => {
    if (event.id === candidate.id || !occupiesSchedule(event.status)) return false;
    const start = Date.parse(event.startAt);
    const end = Date.parse(event.endAt);
    return candidateStart < end && candidateEnd > start;
  });
}

export function deriveEventStatus(
  event: Pick<EventRecord, "status" | "startAt" | "endAt">,
  now = new Date(),
): FirestoreEventStatus {
  if (event.status === "pending" || event.status === "cancelled") {
    return event.status;
  }
  const start = Date.parse(event.startAt);
  const end = Date.parse(event.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return event.status;
  if (now.getTime() >= end) return "completed";
  if (now.getTime() >= start) return "happening";
  return "approved";
}

function occupiesSchedule(status: FirestoreEventStatus): boolean {
  return status === "approved" || status === "happening";
}

function isDateTime(value: string): boolean {
  return value.includes("T") && Number.isFinite(Date.parse(value));
}

function toCreateInput(event: EventRecord): CreateEventInput {
  return {
    title: event.title,
    category: event.category,
    startAt: event.startAt,
    endAt: event.endAt,
    participantIds: event.participantIds,
  };
}

function cloneEvent(event: EventRecord): EventRecord {
  return { ...event, participantIds: [...event.participantIds] };
}
