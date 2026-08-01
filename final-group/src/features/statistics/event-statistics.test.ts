import { describe, expect, it } from "vitest";
import type { EventRecord } from "../../firebase/contracts";
import { calculateEventStatistics } from "./event-statistics";

const event = (overrides: Partial<EventRecord>): EventRecord => ({
  id: "event-1",
  order: 0,
  title: "Airport transfer",
  description: "Meet at the terminal.",
  category: "transport",
  startAt: "2026-08-01T08:00:00.000Z",
  endAt: "2026-08-01T09:00:00.000Z",
  status: "approved",
  participantIds: ["lead-1"],
  createdBy: "lead-1",
  approvedBy: "lead-1",
  ...overrides,
});

describe("calculateEventStatistics", () => {
  it("counts every approved category and lifecycle status", () => {
    const statistics = calculateEventStatistics([
      event({ id: "one", status: "happening" }),
      event({ id: "two", category: "food", status: "completed" }),
      event({ id: "three", category: "food", status: "paused" }),
      event({ id: "four", category: "activity", status: "pending" }),
    ]);

    expect(statistics.total).toBe(4);
    expect(statistics.byCategory).toMatchObject({ transport: 1, food: 2, activity: 1 });
    expect(statistics.byStatus).toMatchObject({ happening: 1, completed: 1, paused: 1, pending: 1 });
    expect(statistics.currentEvent?.id).toBe("one");
  });

  it("returns an honest empty current-event state", () => {
    expect(calculateEventStatistics([event({ status: "approved" })]).currentEvent).toBeNull();
  });
});
