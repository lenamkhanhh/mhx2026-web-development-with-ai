// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkbenchShell, type WorkbenchView } from "./WorkbenchShell";

afterEach(cleanup);

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

    expect(screen.getByRole("navigation", { name: "Điều hướng TripFlow" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tổng quan" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Lịch trình" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Chi phí" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Thành viên" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Files|Notes|Integrations/i })).toBeNull();
    expect(screen.getByRole("link", { name: "Lịch trình" }).textContent).toContain("2");
    expect(screen.getByText("Nội dung hiện tại")).toBeTruthy();
  });

  it("changes view from keyboard- and pointer-accessible navigation", async () => {
    const user = userEvent.setup();
    const { onChangeView } = renderShell();

    await user.click(screen.getByRole("link", { name: "Chi phí" }));

    expect(onChangeView).toHaveBeenCalledWith("expenses");
  });

  it("exposes a stable status region and sign-out action", () => {
    renderShell();

    expect(screen.getByRole("status", { name: "Trạng thái hệ thống" }).textContent).toContain("Firebase");
    expect(screen.getByRole("button", { name: "Đăng xuất" })).toBeTruthy();
    expect(screen.getByText("Lan")).toBeTruthy();
  });
});
