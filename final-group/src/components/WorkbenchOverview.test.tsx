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

    const table = screen.getByRole("table", { name: "Danh sách hoạt động" });
    expect(table).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Hoạt động" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Ngày & giờ" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Người tham gia" })).toBeTruthy();
    expect(within(table).getByText("Nhận phòng")).toBeTruthy();
    expect(within(table).getByText("Tham quan vườn hoa")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Đang mở 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Chờ duyệt 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hoàn tất 0" })).toBeTruthy();
  });

  it("provides a contextual right rail for pending work and real expenses", () => {
    render(
      <WorkbenchOverview
        currentUserId="user-1"
        onOpenExpenses={vi.fn()}
        onOpenSchedule={vi.fn()}
        snapshot={snapshot}
      />,
    );

    const context = screen.getByRole("complementary", { name: "Ngữ cảnh chuyến đi" });
    expect(within(context).getByText("Hàng chờ duyệt")).toBeTruthy();
    expect(within(context).getByText("Tham quan vườn hoa")).toBeTruthy();
    expect(within(context).getByText("Tổng chi")).toBeTruthy();
    expect(within(context).getAllByText("1.800.000 ₫").length).toBeGreaterThan(0);
    expect(within(context).getByText("Chi gần đây")).toBeTruthy();
    expect(within(context).getByText("Khách sạn")).toBeTruthy();
  });
});
