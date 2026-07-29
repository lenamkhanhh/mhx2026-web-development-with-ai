import { describe, expect, it } from "vitest";
import type { TripSnapshot } from "../firebase/contracts";
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
    let currentUser = null;
    let trips = [];
    let snapshot: TripSnapshot | undefined;

    backend.observeSession((user) => {
      currentUser = user;
    });
    expect(currentUser?.uid).toBe("demo-lead");

    backend.subscribeTrips("demo-lead", (nextTrips) => {
      trips = nextTrips;
    });
    expect(trips.length).toBeGreaterThanOrEqual(3);

    backend.subscribeTrip(trips[0]!.id, (nextSnapshot) => {
      snapshot = nextSnapshot;
    });
    expect(snapshot).toBeDefined();
    expect(snapshot!.members.length).toBeGreaterThanOrEqual(5);
    expect(snapshot!.members.every((member) => member.isDemo)).toBe(true);
    expect(snapshot!.events.length).toBeGreaterThanOrEqual(9);
    expect(new Set(snapshot!.events.map((event) => event.status))).toEqual(
      new Set(["pending", "approved", "happening", "completed", "cancelled"]),
    );
    expect(snapshot!.expenses.length).toBeGreaterThanOrEqual(7);
    expect(new Set(snapshot!.expenses.map((expense) => expense.status))).toEqual(
      new Set(["pending", "settled"]),
    );

    await expect(backend.joinTrip("BANGKOK26", currentUser!)).rejects.toThrow(
      /xác minh từ server/i,
    );
  });

  it("broadcasts local mutations to preview subscribers without persistence", async () => {
    const backend = createLocalDemoTripBackend();
    let user = null;
    let trips = [];
    let latest: TripSnapshot | undefined;

    backend.observeSession((nextUser) => {
      user = nextUser;
    });
    backend.subscribeTrips("demo-lead", (nextTrips) => {
      trips = nextTrips;
    });
    backend.subscribeTrip(trips[0]!.id, (snapshot) => {
      latest = snapshot;
    });

    const before = latest!.expenses.length;
    await backend.createExpense(
      trips[0]!.id,
      {
        title: "Vé tàu demo mới",
        amount: 250_000,
        paidBy: "demo-lead",
        splitAmong: ["demo-lead", "demo-minh"],
      },
      user!,
    );

    expect(latest!.expenses).toHaveLength(before + 1);
    expect(latest!.expenses.at(-1)).toMatchObject({
      title: "Vé tàu demo mới",
      status: "pending",
    });
  });
});
