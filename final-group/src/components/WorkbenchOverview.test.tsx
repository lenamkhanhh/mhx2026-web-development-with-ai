// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TripSnapshot } from "../firebase/contracts";
import { WorkbenchOverview } from "./WorkbenchOverview";

const snapshot: TripSnapshot = {
  trip: {
    id: "trip-1",
    name: "Đà Lạt cuối tuần",
    destination: "Đà Lạt",
    startDate: "2026-08-01",
    endDate: "2026-08-03",
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
    },
  ],
  expenses: [],
};

describe("WorkbenchOverview", () => {
  it("summarizes the current trip and exposes next actions", () => {
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

    expect(screen.getByRole("heading", { name: "Đà Lạt cuối tuần" })).toBeTruthy();
    expect(screen.getByText("Nhận phòng")).toBeTruthy();
    expect(screen.getByText("1 hoạt động")).toBeTruthy();
    expect(screen.getByText("1 thành viên")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mở lịch trình" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Thêm khoản chi" })).toBeTruthy();
  });
});
