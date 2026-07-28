// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TripEvent } from "../domain";
import { TripDashboard } from "./TripDashboard";

const events: TripEvent[] = [
  {
    id: "event-1",
    tripId: "trip-1",
    title: "Săn mây đồi chè",
    description: "Xuất phát sớm để đón bình minh.",
    startAt: "2026-07-30T22:00:00.000Z",
    endAt: "2026-07-30T23:30:00.000Z",
    location: "Đồi chè Cầu Đất",
    category: "sightseeing",
    status: "upcoming",
    participantIds: ["lead-1", "member-1"],
    payerId: "lead-1",
    amount: 320_000,
    createdBy: "lead-1",
    approvedBy: "lead-1",
    order: 0,
  },
];

const members = [
  {
    id: "lead-1",
    userId: "lead-1",
    displayName: "Khánh",
    email: "lead@example.com",
    role: "lead" as const,
    responsibility: "Lịch trình",
  },
  {
    id: "member-1",
    userId: "member-1",
    displayName: "Minh",
    email: "member@example.com",
    role: "member" as const,
    responsibility: "Chụp ảnh",
  },
];

afterEach(cleanup);

describe("TripDashboard", () => {
  it("renders the trip, current role and summary metrics", () => {
    render(
      <TripDashboard
        activeView="overview"
        currentUserId="lead-1"
        events={events}
        members={members}
        now={new Date("2026-07-30T20:00:00.000Z")}
        trip={{
          id: "trip-1",
          name: "Đà Lạt cuối hạ",
          destination: "Đà Lạt",
          startDate: "2026-07-30",
          endDate: "2026-08-01",
          leadId: "lead-1",
          joinCode: "DALAT26",
        }}
        onChangeView={vi.fn()}
        onCreateEvent={vi.fn()}
        onEditEvent={vi.fn()}
        onDeleteEvent={vi.fn()}
        onApproveEvent={vi.fn()}
        onMoveEvent={vi.fn()}
        onUpdateMember={vi.fn()}
        onDeleteMember={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Đà Lạt cuối hạ" }),
    ).toBeTruthy();
    expect(screen.getAllByText("Lead").length).toBeGreaterThan(0);
    expect(screen.getByText("1 sự kiện")).toBeTruthy();
    expect(screen.getByText("320.000 ₫")).toBeTruthy();
  });

  it("shows schedule evidence and lead-only actions", () => {
    render(
      <TripDashboard
        activeView="schedule"
        currentUserId="lead-1"
        events={events}
        members={members}
        now={new Date("2026-07-30T20:00:00.000Z")}
        trip={{
          id: "trip-1",
          name: "Đà Lạt cuối hạ",
          destination: "Đà Lạt",
          startDate: "2026-07-30",
          endDate: "2026-08-01",
          leadId: "lead-1",
          joinCode: "DALAT26",
        }}
        onChangeView={vi.fn()}
        onCreateEvent={vi.fn()}
        onEditEvent={vi.fn()}
        onDeleteEvent={vi.fn()}
        onApproveEvent={vi.fn()}
        onMoveEvent={vi.fn()}
        onUpdateMember={vi.fn()}
        onDeleteMember={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Lịch trình chuyến đi" }),
    ).toBeTruthy();
    expect(screen.getByText("Săn mây đồi chè")).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "Thêm hoạt động" }).length,
    ).toBeGreaterThan(0);
  });
});
