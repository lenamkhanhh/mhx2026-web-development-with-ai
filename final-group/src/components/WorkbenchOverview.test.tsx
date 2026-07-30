// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TripSnapshot } from "../firebase/contracts";
import { WorkbenchOverview } from "./WorkbenchOverview";

afterEach(cleanup);

const snapshot: TripSnapshot = {
  trip: {
    id: "trip-1",
    name: "Đà Lạt cuối tuần",
    destination: "Đà Lạt",
    startDate: "2026-08-01",
    endDate: "2026-08-03",
    budgetVnd: 3_000_000,
    leadId: "user-1",
    joinCode: "DALAT26",
  },
  members: [
    {
      uid: "user-1",
      displayName: "Lan",
      email: "lan@example.com",
      role: "lead",
      responsibility: "Lịch trình",
      isDemo: false,
    },
    {
      uid: "user-2",
      displayName: "Minh",
      email: "minh@example.com",
      role: "member",
      responsibility: "Chi phí",
      isDemo: false,
    },
  ],
  events: [
    {
      id: "event-1",
      order: 0,
      title: "Nhận phòng",
      category: "stay",
      startAt: "2026-08-01T08:00:00.000Z",
      endAt: "2026-08-01T09:00:00.000Z",
      status: "approved",
      participantIds: ["user-1"],
      createdBy: "user-1",
      approvedBy: "user-1",
      location: "Lien Khuong Airport",
      assigneeUid: "user-1",
      priority: "high",
      createdAt: "2026-08-01T07:30:00.000Z",
    },
    {
      id: "event-2",
      order: 1,
      title: "Tham quan vườn hoa",
      category: "activity",
      startAt: "2026-08-01T10:00:00.000Z",
      endAt: "2026-08-01T11:00:00.000Z",
      status: "pending",
      participantIds: ["user-1", "user-2"],
      createdBy: "user-2",
      approvedBy: null,
      location: "Da Lat Flower Park",
      assigneeUid: "user-2",
      priority: "medium",
      createdAt: "2026-08-01T07:45:00.000Z",
    },
  ],
  expenses: [
    {
      id: "expense-1",
      title: "Khách sạn",
      amount: 1_800_000,
      paidBy: "user-1",
      splitAmong: ["user-1", "user-2"],
      status: "settled",
      createdBy: "user-1",
      category: "accommodation",
      createdAt: "2026-08-01T07:50:00.000Z",
    },
  ],
  activity: [
    {
      id: "activity-1",
      kind: "note_added",
      eventId: "event-1",
      actorId: "user-1",
      label: "Added a note",
      createdAt: "2026-08-01T08:10:00.000Z",
    },
  ],
};

describe("WorkbenchOverview", () => {
  it("renders a table-first command center using real trip data", () => {
    const onOpenSchedule = vi.fn();
    const onOpenExpenses = vi.fn();
    render(
      <WorkbenchOverview
        currentUserId="user-1"
        onOpenExpenses={onOpenExpenses}
        onOpenSchedule={onOpenSchedule}
        snapshot={snapshot}
      />,
    );

    const table = screen.getByRole("table", { name: "Trip itinerary" });
    expect(table).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Item" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Date & time" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Location" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Assignee" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Priority" })).toBeTruthy();
    expect(within(table).getByText("Nhận phòng")).toBeTruthy();
    expect(within(table).getByText("Tham quan vườn hoa")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "In review 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Done 0" })).toBeTruthy();
  });

  it("provides a truthful activity feed and real expense context", () => {
    render(
      <WorkbenchOverview
        currentUserId="user-1"
        onOpenExpenses={vi.fn()}
        onOpenSchedule={vi.fn()}
        snapshot={snapshot}
      />,
    );

    const context = screen.getByRole("complementary", { name: "Trip context" });
    expect(within(context).getByText("Activity feed")).toBeTruthy();
    expect(within(context).getByText("Added a note")).toBeTruthy();
    expect(within(context).getByText("Expense summary")).toBeTruthy();
    expect(within(context).getByText("Budget")).toBeTruthy();
    expect(within(context).getByText("Accommodation")).toBeTruthy();
    expect(within(context).getAllByText("1.800.000 ₫").length).toBeGreaterThan(0);
    expect(within(context).getByText("Recent expenses")).toBeTruthy();
    expect(within(context).getByText("Khách sạn")).toBeTruthy();
  });

  it("sorts real itinerary rows and opens the selected event in Timeline", async () => {
    const user = userEvent.setup();
    const onOpenSchedule = vi.fn();
    render(
      <WorkbenchOverview
        currentUserId="user-1"
        onOpenExpenses={vi.fn()}
        onOpenSchedule={onOpenSchedule}
        snapshot={snapshot}
      />,
    );

    const table = screen.getByRole("table", { name: "Trip itinerary" });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort itinerary" }),
      "time-desc",
    );
    expect(within(table).getAllByRole("row")[1].textContent).toContain(
      "Tham quan vườn hoa",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Open Nhận phòng in Timeline",
      }),
    );
    expect(onOpenSchedule).toHaveBeenCalledWith("event-1");
  });

  it("filters itinerary rows by persisted category", async () => {
    const user = userEvent.setup();
    render(<WorkbenchOverview currentUserId="user-1" onOpenExpenses={vi.fn()} onOpenSchedule={vi.fn()} snapshot={snapshot} />);
    const table = screen.getByRole("table", { name: "Trip itinerary" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Filter itinerary" }), "activity");

    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getByText("Activity")).toBeTruthy();
  });

  it("links the overview footer to the real reorder workflow in Timeline", async () => {
    const user = userEvent.setup();
    const onOpenSchedule = vi.fn();
    render(
      <WorkbenchOverview
        currentUserId="user-1"
        onOpenExpenses={vi.fn()}
        onOpenSchedule={onOpenSchedule}
        snapshot={snapshot}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reorder in Timeline" }));

    expect(onOpenSchedule).toHaveBeenCalledWith();
  });
});
