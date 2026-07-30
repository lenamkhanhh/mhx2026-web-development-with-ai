import { describe, expect, it } from "vitest";
import type {
  AuthenticatedUser,
  TripRecord,
  TripSnapshot,
} from "../firebase/contracts";
import {
  createLocalDemoTripBackend,
  shouldUseLocalDemoPreview,
} from "./localDemo";

describe("local rich TripFlow demo", () => {
  it("is opt-in and development-only", () => {
    expect(shouldUseLocalDemoPreview("?demo=1", true)).toBe(true);
    expect(shouldUseLocalDemoPreview("?demo=1", false)).toBe(false);
    expect(shouldUseLocalDemoPreview("?demo=0", true)).toBe(false);
    expect(shouldUseLocalDemoPreview("", true)).toBe(false);
  });

  it("starts with a rich synthetic trip board and keeps join-by-code fail-closed", async () => {
    const backend = createLocalDemoTripBackend();
    const observed: {
      user: AuthenticatedUser | null;
      trips: TripRecord[];
      snapshot: TripSnapshot | undefined;
    } = { user: null, trips: [], snapshot: undefined };

    backend.observeSession((user) => {
      observed.user = user;
    });
    expect(observed.user?.uid).toBe("demo-lead");

    backend.subscribeTrips("demo-lead", (nextTrips) => {
      observed.trips = nextTrips;
    });
    expect(observed.trips.length).toBeGreaterThanOrEqual(3);

    backend.subscribeTrip(observed.trips[0]!.id, (nextSnapshot) => {
      observed.snapshot = nextSnapshot;
    });
    expect(observed.snapshot).toBeDefined();
    expect(observed.snapshot!.members.length).toBeGreaterThanOrEqual(5);
    expect(observed.snapshot!.members.every((member) => member.isDemo)).toBe(true);
    expect(observed.snapshot!.events.length).toBeGreaterThanOrEqual(9);
    expect(observed.snapshot!.events.every((event) => Boolean(event.createdAt))).toBe(true);
    expect(observed.snapshot!.events.every((event) => Boolean(event.location && event.assigneeUid && event.priority))).toBe(true);
    expect(new Set(observed.snapshot!.events.map((event) => event.status))).toEqual(
      new Set(["pending", "approved", "happening", "completed", "cancelled"]),
    );
    expect(observed.snapshot!.expenses.length).toBeGreaterThanOrEqual(7);
    expect(observed.snapshot!.expenses.every((expense) => Boolean(expense.createdAt))).toBe(true);
    expect(observed.snapshot!.expenses.every((expense) => Boolean(expense.category))).toBe(true);
    expect(observed.snapshot!.trip.budgetVnd).toBeGreaterThan(0);
    expect(new Set(observed.snapshot!.expenses.map((expense) => expense.status))).toEqual(
      new Set(["pending", "settled"]),
    );

    await expect(backend.joinTrip("BANGKOK26", observed.user!)).rejects.toThrow(
      /xác minh từ server/i,
    );
  });

  it("broadcasts local mutations to preview subscribers without persistence", async () => {
    const backend = createLocalDemoTripBackend();
    const observed: {
      user: AuthenticatedUser | null;
      trips: TripRecord[];
      latest: TripSnapshot | undefined;
    } = { user: null, trips: [], latest: undefined };

    backend.observeSession((nextUser) => {
      observed.user = nextUser;
    });
    backend.subscribeTrips("demo-lead", (nextTrips) => {
      observed.trips = nextTrips;
    });
    backend.subscribeTrip(observed.trips[0]!.id, (snapshot) => {
      observed.latest = snapshot;
    });

    const before = observed.latest!.expenses.length;
    await backend.createExpense(
      observed.trips[0]!.id,
      {
        title: "Vé tàu demo mới",
        amount: 250_000,
        paidBy: "demo-lead",
        splitAmong: ["demo-lead", "demo-minh"],
      },
      observed.user!,
    );

    expect(observed.latest!.expenses).toHaveLength(before + 1);
    expect(observed.latest!.expenses.at(-1)).toMatchObject({
      title: "Vé tàu demo mới",
      status: "pending",
      createdAt: expect.any(String),
    });
  });
});
