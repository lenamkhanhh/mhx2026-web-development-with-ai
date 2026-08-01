import { describe, expect, it, vi } from "vitest";
import type {
  AuthenticatedUser,
  MemberRecord,
  TripBackend,
  TripSnapshot,
} from "../../firebase/contracts";
import { MemberActionError, MembersFeature } from "./members";

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
const records: MemberRecord[] = [
  {
    uid: lead.uid,
    displayName: "Lead",
    email: "lead@example.com",
    role: "lead",
    responsibility: "Coordination",
    isDemo: true,
  },
  {
    uid: member.uid,
    displayName: "Member",
    email: "member@example.com",
    role: "member",
    responsibility: "Photography",
    isDemo: true,
  },
];

function tripSnapshot(members = records): TripSnapshot {
  return {
    trip: {
      id: "trip-1",
      name: "Da Lat",
      destination: "Da Lat",
      startDate: "2026-07-30",
      endDate: "2026-08-01",
      leadId: lead.uid,
      joinCode: "DALAT26",
    },
    members,
    events: [],
    expenses: [],
  };
}

function createBackend(): TripBackend & {
  emit(snapshot: TripSnapshot): void;
  unsubscribe: ReturnType<typeof vi.fn>;
} {
  let tripListener: ((snapshot: TripSnapshot) => void) | undefined;
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
    updateResponsibility: vi.fn(async () => undefined),
    updateMemberProfile: vi.fn(async () => undefined),
    removeMember: vi.fn(async () => undefined),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    approveEvent: vi.fn(),
    deleteEvent: vi.fn(),
    reorderEvents: vi.fn(async (): Promise<never> => {
      throw new Error("unsupported");
    }),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
    settleExpense: vi.fn(),
    emit(snapshot) {
      tripListener?.(snapshot);
    },
    unsubscribe,
  };
}

describe("MembersFeature", () => {
  it("updates only the authenticated member display name", async () => {
    const backend = createBackend();
    const feature = new MembersFeature({ backend, tripId: "trip-1", actor: member, role: "member" });
    feature.replaceSnapshot(tripSnapshot());
    await feature.updateDisplayName(member.uid, "Minh Tran");
    expect(backend.updateMemberProfile).toHaveBeenCalledWith("trip-1", member.uid, { displayName: "Minh Tran" });
    await expect(feature.updateDisplayName(lead.uid, "Wrong")).rejects.toMatchObject({ code: "forbidden" });
  });
  it("updates only the authenticated member responsibility", async () => {
    const backend = createBackend();
    const feature = new MembersFeature({
      backend,
      tripId: "trip-1",
      actor: member,
      role: "member",
    });
    feature.replaceSnapshot(tripSnapshot());

    await feature.updateResponsibility(member.uid, "Video");
    expect(backend.updateResponsibility).toHaveBeenCalledWith(
      "trip-1",
      member.uid,
      "Video",
    );

    await expect(feature.updateResponsibility(lead.uid, "Changed")).rejects.toMatchObject({
      code: "forbidden",
    } satisfies Partial<MemberActionError>);
    expect(backend.updateResponsibility).toHaveBeenCalledTimes(1);
  });

  it("allows a lead to remove another member but never themselves", async () => {
    const backend = createBackend();
    const feature = new MembersFeature({
      backend,
      tripId: "trip-1",
      actor: lead,
      role: "lead",
    });
    feature.replaceSnapshot(tripSnapshot());

    await feature.removeMember(member.uid);
    expect(backend.removeMember).toHaveBeenCalledWith("trip-1", member.uid);

    await expect(feature.removeMember(lead.uid)).rejects.toMatchObject({
      code: "forbidden",
    } satisfies Partial<MemberActionError>);
  });

  it("does not let a member invoke the removal backend operation", async () => {
    const backend = createBackend();
    const feature = new MembersFeature({
      backend,
      tripId: "trip-1",
      actor: member,
      role: "member",
    });
    feature.replaceSnapshot(tripSnapshot());

    await expect(feature.removeMember(lead.uid)).rejects.toMatchObject({
      code: "forbidden",
    } satisfies Partial<MemberActionError>);
    expect(backend.removeMember).not.toHaveBeenCalled();
  });

  it("relays the trip member list and join code, then releases the subscription", () => {
    const backend = createBackend();
    const feature = new MembersFeature({
      backend,
      tripId: "trip-1",
      actor: lead,
      role: "lead",
    });
    const listener = vi.fn();
    feature.subscribe(listener);

    feature.start();
    backend.emit(tripSnapshot());
    feature.stop();

    expect(listener).toHaveBeenLastCalledWith({
      trip: expect.objectContaining({ joinCode: "DALAT26" }),
      members: records,
    });
    expect(backend.subscribeTrip).toHaveBeenCalledWith("trip-1", expect.any(Function));
    expect(backend.unsubscribe).toHaveBeenCalledOnce();
  });
});
