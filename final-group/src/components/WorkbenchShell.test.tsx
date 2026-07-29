// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkbenchShell, type WorkbenchView } from "./WorkbenchShell";

const trip = {
  name: "Đà Lạt",
  destination: "Đà Lạt",
  startDate: "2026-08-01",
  endDate: "2026-08-03",
};

function renderShell(
  activeView: WorkbenchView = "overview",
  onChangeView = vi.fn(),
) {
  return {
    onChangeView,
    ...render(
      <WorkbenchShell
        activeView={activeView}
        displayName="Lan"
        onChangeView={onChangeView}
        onLogout={vi.fn()}
        pendingCount={2}
        role="lead"
        trip={trip}
      >
        <section aria-label="Nội dung hiện tại">Nội dung hiện tại</section>
      </WorkbenchShell>,
    ),
  };
}

describe("WorkbenchShell", () => {
  it("renders only the real TripFlow work areas and marks the active view", () => {
    renderShell("schedule");

    expect(screen.getByRole("navigation", { name: "Điều hướng TripFlow" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tổng quan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lịch trình/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Chi phí" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Thành viên" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Files|Notes|Integrations/i })).not.toBeInTheDocument();
    expect(screen.getByText("2 chờ duyệt")).toBeInTheDocument();
    expect(screen.getByText("Nội dung hiện tại")).toBeInTheDocument();
  });

  it("changes view from keyboard- and pointer-accessible navigation", async () => {
    const user = userEvent.setup();
    const { onChangeView } = renderShell();

    await user.click(screen.getByRole("link", { name: "Chi phí" }));

    expect(onChangeView).toHaveBeenCalledWith("expenses");
  });

  it("exposes a stable status region and sign-out action", () => {
    renderShell();

    expect(screen.getByRole("status", { name: "Trạng thái hệ thống" })).toHaveTextContent("Firebase");
    expect(screen.getByRole("button", { name: "Đăng xuất" })).toBeInTheDocument();
    expect(screen.getByText("Lan")).toBeInTheDocument();
  });
});
