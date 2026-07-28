import { describe, expect, it, vi } from "vitest";
import type {
  AuthenticatedUser,
  CreateExpenseInput,
  ExpenseRecord,
  TripBackend,
  TripSnapshot,
} from "../../firebase/contracts";
import { ExpenseFeature } from "./expenses";

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
const input: CreateExpenseInput = {
  title: "Ăn tối",
  amount: 100_001,
  paidBy: lead.uid,
  splitAmong: [lead.uid, member.uid],
};

function expense(overrides: Partial<ExpenseRecord> = {}): ExpenseRecord {
  return {
    id: "expense-1",
    ...input,
    status: "pending",
    createdBy: member.uid,
    ...overrides,
  };
}

function snapshot(expenses: ExpenseRecord[]): TripSnapshot {
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
    events: [],
    expenses,
  };
}

function createBackend(): TripBackend & {
  // eslint-disable-next-line no-unused-vars -- Type-only callback parameter.
  emit(expenses: ExpenseRecord[]): void;
  unsubscribe: ReturnType<typeof vi.fn>;
} {
  // eslint-disable-next-line no-unused-vars -- Type-only callback parameter.
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
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    approveEvent: vi.fn(),
    deleteEvent: vi.fn(),
    reorderEvents: vi.fn(async (): Promise<never> => {
      throw new Error("unsupported");
    }),
    createExpense: vi.fn(async (_tripId, value, actor) =>
      expense({ ...value, id: "created-1", createdBy: actor.uid }),
    ),
    updateExpense: vi.fn(async () => undefined),
    deleteExpense: vi.fn(async () => undefined),
    emit(expenses) {
      tripListener?.(snapshot(expenses));
    },
    unsubscribe,
  };
}

describe("ExpenseFeature", () => {
  it("creates an integer-VND expense through TripBackend after pure validation", async () => {
    const backend = createBackend();
    const feature = new ExpenseFeature({
      backend,
      tripId: "trip-1",
      actor: member,
      role: "member",
    });

    await feature.create(input);

    expect(backend.createExpense).toHaveBeenCalledWith("trip-1", input, member);
    await expect(feature.create({ ...input, amount: 1.5 })).rejects.toMatchObject({
      code: "invalid-input",
    });
    expect(backend.createExpense).toHaveBeenCalledTimes(1);
  });

  it("allows a member to change only their own expense and a lead to manage any expense", async () => {
    const backend = createBackend();
    const memberFeature = new ExpenseFeature({
      backend,
      tripId: "trip-1",
      actor: member,
      role: "member",
    });
    memberFeature.replaceExpenses([expense()]);

    await memberFeature.update("expense-1", { title: "Ăn trưa" });
    expect(backend.updateExpense).toHaveBeenCalledWith("trip-1", "expense-1", {
      title: "Ăn trưa",
    });

    memberFeature.replaceExpenses([expense({ createdBy: lead.uid })]);
    await expect(memberFeature.delete("expense-1")).rejects.toMatchObject({
      code: "forbidden",
    });

    const leadFeature = new ExpenseFeature({
      backend,
      tripId: "trip-1",
      actor: lead,
      role: "lead",
    });
    leadFeature.replaceExpenses([expense({ createdBy: member.uid })]);
    await leadFeature.delete("expense-1");
    expect(backend.deleteExpense).toHaveBeenCalledWith("trip-1", "expense-1");
  });

  it("relays realtime expense snapshots and releases the subscription", () => {
    const backend = createBackend();
    const feature = new ExpenseFeature({
      backend,
      tripId: "trip-1",
      actor: lead,
      role: "lead",
    });
    const listener = vi.fn();
    feature.subscribe(listener);

    feature.start();
    backend.emit([expense({ title: "Từ Firestore" })]);
    feature.stop();

    expect(listener).toHaveBeenLastCalledWith([expense({ title: "Từ Firestore" })]);
    expect(backend.subscribeTrip).toHaveBeenCalledWith("trip-1", expect.any(Function));
    expect(backend.unsubscribe).toHaveBeenCalledOnce();
  });
});
