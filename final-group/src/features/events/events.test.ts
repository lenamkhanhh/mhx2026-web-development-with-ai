import { describe, expect, it, vi } from "vitest";
import type {
  AuthenticatedUser,
  CreateEventInput,
  EventRecord,
  TripBackend,
  TripSnapshot,
} from "../../firebase/contracts";
import { EventFeature } from "./events";

const lead: AuthenticatedUser = {
  uid: "lead-1",
  email: "lead@example.com",
  displayName: "Lead",
};
const member: AuthenticatedUser = {
  uid: "member-1",
  email: "member@example.com",
  displayName: "Member",
};

const input: CreateEventInput = {
  title: "Ăn sáng",
  category: "food",
  startAt: "2026-07-30T08:00:00.000Z",
  endAt: "2026-07-30T09:00:00.000Z",
  participantIds: ["lead-1", "member-1"],
};

function event(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "event-1",
    ...input,
    status: "approved",
    createdBy: "lead-1",
    approvedBy: "lead-1",
    ...overrides,
  };
}

function snapshot(events: EventRecord[]): TripSnapshot {
  return {
    trip: {
      id: "trip-1",
      name: "Đà Lạt",
      destination: "Đà Lạt",
      startDate: "2026-07-30",
      endDate: "2026-08-01",
      leadId: lead.uid,
      joinCode: "DALAT26",
    },
    members: [],
    events,
    expenses: [],
  };
}

function createBackend(): TripBackend & {
  emit(events: EventRecord[]): void;
  unsubscribe: ReturnType<typeof vi.fn>;
} {
  let tripListener: ((value: TripSnapshot) => void) | undefined;
  const unsubscribe = vi.fn();

  return {
    observeSession: vi.fn(() => unsubscribe),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    upsertProfile: vi.fn(),
    getProfile: vi.fn(),
    subscribeTrips: vi.fn(() => unsubscribe),
    subscribeTrip: vi.fn((_tripId, listener) => {
      tripListener = listener;
      return unsubscribe;
    }),
    createTrip: vi.fn(),
    joinTrip: vi.fn(async (): Promise<never> => {
      throw new Error("unsupported");
    }),
    updateResponsibility: vi.fn(),
    removeMember: vi.fn(),
    createEvent: vi.fn(async (_tripId, value) =>
      event({ ...value, id: "created-1", createdBy: member.uid, approvedBy: null, status: "pending" }),
    ),
    updateEvent: vi.fn(async () => undefined),
    approveEvent: vi.fn(async () => undefined),
    deleteEvent: vi.fn(async () => undefined),
    reorderEvents: vi.fn(async (): Promise<never> => {
      throw new Error("persistent event ordering is not approved");
    }),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
    emit(events) {
      tripListener?.(snapshot(events));
    },
    unsubscribe,
  };
}

describe("EventFeature", () => {
  it("creates a member event through TripBackend after pure input validation", async () => {
    const backend = createBackend();
    const feature = new EventFeature({ backend, tripId: "trip-1", actor: member, role: "member" });

    await feature.create(input);

    expect(backend.createEvent).toHaveBeenCalledWith("trip-1", input, member);
    await expect(feature.create({ ...input, title: " " })).rejects.toMatchObject({
      code: "invalid-input",
    });
    expect(backend.createEvent).toHaveBeenCalledTimes(1);
  });

  it("rejects conflicting lead creation and pending approval before calling Firebase", async () => {
    const backend = createBackend();
    const feature = new EventFeature({ backend, tripId: "trip-1", actor: lead, role: "lead" });
    feature.replaceEvents([event()]);

    await expect(
      feature.create({
        ...input,
        title: "Trùng lịch",
        startAt: "2026-07-30T08:30:00.000Z",
        endAt: "2026-07-30T09:30:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "schedule-conflict" });

    feature.replaceEvents([
      event(),
      event({
        id: "pending-1",
        status: "pending",
        approvedBy: null,
        createdBy: member.uid,
        startAt: "2026-07-30T08:30:00.000Z",
        endAt: "2026-07-30T09:30:00.000Z",
      }),
    ]);

    await expect(feature.approve("pending-1")).rejects.toMatchObject({
      code: "schedule-conflict",
    });
    expect(backend.approveEvent).not.toHaveBeenCalled();
  });

  it("uses approved vocabulary for lead approval and cancellation", async () => {
    const backend = createBackend();
    const feature = new EventFeature({ backend, tripId: "trip-1", actor: lead, role: "lead" });
    feature.replaceEvents([event({ id: "pending-1", status: "pending", approvedBy: null })]);

    await feature.approve("pending-1");
    await feature.cancel("pending-1");

    expect(backend.approveEvent).toHaveBeenNthCalledWith(1, "trip-1", "pending-1", "approved");
    expect(backend.approveEvent).toHaveBeenNthCalledWith(2, "trip-1", "pending-1", "cancelled");
  });

  it("allows only an owner to update a pending event", async () => {
    const backend = createBackend();
    const feature = new EventFeature({ backend, tripId: "trip-1", actor: member, role: "member" });
    feature.replaceEvents([event({ createdBy: member.uid, status: "pending", approvedBy: null })]);

    await feature.update("event-1", { title: "Ăn trưa" });
    expect(backend.updateEvent).toHaveBeenCalledWith("trip-1", "event-1", { title: "Ăn trưa" });

    feature.replaceEvents([event({ createdBy: member.uid, status: "approved" })]);
    await expect(feature.update("event-1", { title: "Không được sửa" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("relays realtime trip snapshots and releases the subscription", () => {
    const backend = createBackend();
    const feature = new EventFeature({ backend, tripId: "trip-1", actor: lead, role: "lead" });
    const listener = vi.fn();
    feature.subscribe(listener);

    feature.start();
    backend.emit([event({ title: "Từ Firestore" })]);
    feature.stop();

    expect(listener).toHaveBeenLastCalledWith([event({ title: "Từ Firestore" })]);
    expect(backend.subscribeTrip).toHaveBeenCalledWith("trip-1", expect.any(Function));
    expect(backend.unsubscribe).toHaveBeenCalledOnce();
  });

  it("synchronizes approved events with Firestore happening/completed statuses", async () => {
    const backend = createBackend();
    const feature = new EventFeature({ backend, tripId: "trip-1", actor: lead, role: "lead" });
    feature.replaceEvents([
      event({ id: "active", status: "approved" }),
      event({ id: "pending", status: "pending" }),
      event({ id: "cancelled", status: "cancelled" }),
    ]);

    await feature.syncStatuses(new Date("2026-07-30T08:30:00.000Z"));

    expect(backend.approveEvent).toHaveBeenCalledWith("trip-1", "active", "happening");
    expect(backend.approveEvent).toHaveBeenCalledTimes(1);
  });

  it("forwards reorder through the backend without inventing an order field", async () => {
    const backend = createBackend();
    const feature = new EventFeature({ backend, tripId: "trip-1", actor: lead, role: "lead" });
    feature.replaceEvents([event({ id: "first" }), event({ id: "second" })]);

    await expect(feature.reorder("second", "up")).rejects.toThrow(
      "persistent event ordering is not approved",
    );
    expect(backend.reorderEvents).toHaveBeenCalledWith("trip-1", ["second", "first"]);
  });
});
