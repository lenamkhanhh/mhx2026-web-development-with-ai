import { describe, expect, it } from "vitest";
import {
  calculateBalances,
  canManageEvent,
  deriveEventStatus,
  hasScheduleConflict,
  reorderEvents,
  validateEventInput,
  type TripEvent,
} from "./domain";

const baseEvent: TripEvent = {
  id: "event-1",
  tripId: "trip-1",
  title: "Ăn sáng",
  description: "Bánh mì và cà phê",
  startAt: "2026-07-30T08:00:00.000Z",
  endAt: "2026-07-30T09:00:00.000Z",
  location: "Chợ Đà Lạt",
  category: "food",
  status: "upcoming",
  participantIds: ["lead-1", "member-1"],
  payerId: "lead-1",
  amount: 200_000,
  createdBy: "lead-1",
  approvedBy: "lead-1",
  order: 0,
};

describe("validateEventInput", () => {
  it("rejects a blank title", () => {
    expect(validateEventInput({ ...baseEvent, title: "  " })).toContain(
      "Tiêu đề là bắt buộc.",
    );
  });

  it("rejects an end time that is not after the start time", () => {
    expect(
      validateEventInput({
        ...baseEvent,
        endAt: baseEvent.startAt,
      }),
    ).toContain("Giờ kết thúc phải sau giờ bắt đầu.");
  });

  it("accepts a complete valid event", () => {
    expect(validateEventInput(baseEvent)).toEqual([]);
  });
});

describe("hasScheduleConflict", () => {
  it("detects overlapping approved events", () => {
    const candidate = {
      ...baseEvent,
      id: "event-2",
      startAt: "2026-07-30T08:30:00.000Z",
      endAt: "2026-07-30T09:30:00.000Z",
    };

    expect(hasScheduleConflict(candidate, [baseEvent])).toBe(true);
  });

  it("allows adjacent time ranges and ignores the event being edited", () => {
    expect(
      hasScheduleConflict(
        {
          ...baseEvent,
          startAt: "2026-07-30T09:00:00.000Z",
          endAt: "2026-07-30T10:00:00.000Z",
        },
        [baseEvent],
      ),
    ).toBe(false);

    expect(hasScheduleConflict(baseEvent, [baseEvent])).toBe(false);
  });
});

describe("deriveEventStatus", () => {
  it("moves an event from upcoming to ongoing and then done", () => {
    expect(
      deriveEventStatus(baseEvent, new Date("2026-07-30T08:30:00.000Z")),
    ).toBe("ongoing");
    expect(
      deriveEventStatus(baseEvent, new Date("2026-07-30T10:00:00.000Z")),
    ).toBe("done");
  });

  it("preserves pending, paused and cancelled states", () => {
    for (const status of ["pending", "paused", "cancelled"] as const) {
      expect(
        deriveEventStatus(
          { ...baseEvent, status },
          new Date("2026-07-30T10:00:00.000Z"),
        ),
      ).toBe(status);
    }
  });
});

describe("canManageEvent", () => {
  it("allows the lead to edit, approve and delete events", () => {
    expect(canManageEvent("lead", "lead-1", baseEvent)).toEqual({
      canEdit: true,
      canDelete: true,
      canApprove: true,
    });
  });

  it("only lets a member manage their own pending event", () => {
    const ownPending = {
      ...baseEvent,
      status: "pending" as const,
      createdBy: "member-1",
      approvedBy: null,
    };

    expect(canManageEvent("member", "member-1", ownPending)).toEqual({
      canEdit: true,
      canDelete: true,
      canApprove: false,
    });
    expect(canManageEvent("member", "member-2", ownPending)).toEqual({
      canEdit: false,
      canDelete: false,
      canApprove: false,
    });
  });
});

describe("calculateBalances", () => {
  it("splits each event across assigned members and returns net balances", () => {
    const balances = calculateBalances(
      [
        { id: "lead-1", displayName: "Khánh" },
        { id: "member-1", displayName: "Minh" },
        { id: "member-2", displayName: "An" },
      ],
      [
        baseEvent,
        {
          ...baseEvent,
          id: "event-2",
          amount: 300_000,
          payerId: "member-1",
          participantIds: ["lead-1", "member-1", "member-2"],
        },
      ],
    );

    expect(balances).toEqual([
      {
        memberId: "lead-1",
        displayName: "Khánh",
        paid: 200_000,
        owed: 200_000,
        balance: 0,
      },
      {
        memberId: "member-1",
        displayName: "Minh",
        paid: 300_000,
        owed: 200_000,
        balance: 100_000,
      },
      {
        memberId: "member-2",
        displayName: "An",
        paid: 0,
        owed: 100_000,
        balance: -100_000,
      },
    ]);
  });

  it("ignores zero-cost events and events without participants", () => {
    expect(
      calculateBalances(
        [{ id: "lead-1", displayName: "Khánh" }],
        [{ ...baseEvent, amount: 0, participantIds: [] }],
      ),
    ).toEqual([
      {
        memberId: "lead-1",
        displayName: "Khánh",
        paid: 0,
        owed: 0,
        balance: 0,
      },
    ]);
  });
});

describe("reorderEvents", () => {
  it("moves an event and normalizes order values", () => {
    const events = [
      baseEvent,
      { ...baseEvent, id: "event-2", order: 1 },
      { ...baseEvent, id: "event-3", order: 2 },
    ];

    expect(reorderEvents(events, "event-2", "up").map(({ id, order }) => ({
      id,
      order,
    }))).toEqual([
      { id: "event-2", order: 0 },
      { id: "event-1", order: 1 },
      { id: "event-3", order: 2 },
    ]);
  });
});
