// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkbenchShell, type WorkbenchView } from "./WorkbenchShell";

afterEach(cleanup);

const trip = {
  id: "trip-1",
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
        memberCount={1}
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

    const sidebar = screen.getByRole("navigation", { name: "Điều hướng TripFlow" });
    expect(sidebar).toBeTruthy();
    expect(within(sidebar).getByRole("link", { name: "Tổng quan" })).toBeTruthy();
    expect(within(sidebar).getByRole("link", { name: "Lịch trình" }).getAttribute("aria-current")).toBe("page");
    expect(within(sidebar).getByRole("link", { name: "Chi phí" })).toBeTruthy();
    expect(within(sidebar).getByRole("link", { name: "Thành viên" })).toBeTruthy();
    expect(within(sidebar).queryByRole("link", { name: /Files|Notes|Integrations/i })).toBeNull();
    expect(within(sidebar).getByRole("link", { name: "Lịch trình" }).textContent).toContain("2");
    expect(screen.getByText("Nội dung hiện tại")).toBeTruthy();
  });

  it("changes view from keyboard- and pointer-accessible navigation", async () => {
    const user = userEvent.setup();
    const { onChangeView } = renderShell();

    const sidebar = screen.getByRole("navigation", { name: "Điều hướng TripFlow" });
    await user.click(within(sidebar).getByRole("link", { name: "Chi phí" }));

    expect(onChangeView).toHaveBeenCalledWith("expenses");
  });

  it("exposes a stable status region and sign-out action", () => {
    renderShell();

    expect(screen.getByRole("status", { name: "Trạng thái hệ thống" }).textContent).toContain("Firebase");
    expect(screen.getByRole("button", { name: "Đăng xuất" })).toBeTruthy();
    expect(screen.getByText("Lan")).toBeTruthy();
  });

  it("renders the approved workbench header, metadata, and four page tabs", () => {
    renderShell("schedule");

    expect(screen.getByRole("searchbox", { name: "Tìm nhanh trong TripFlow" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "ĐÀ LẠT / LỊCH TRÌNH" })).toBeTruthy();
    expect(screen.getByText("1 thành viên")).toBeTruthy();
    expect(screen.getByText("# TRIP-1")).toBeTruthy();

    const tabs = screen.getByRole("navigation", { name: "Màn hình chuyến đi" });
    expect(within(tabs).getAllByRole("link")).toHaveLength(4);
    expect(within(tabs).getByRole("link", { name: "Lịch trình" }).getAttribute("aria-current")).toBe("page");
  });

  it("uses topbar search to navigate to a real work area", async () => {
    const user = userEvent.setup();
    const { onChangeView } = renderShell();

    await user.type(screen.getByRole("searchbox", { name: "Tìm nhanh trong TripFlow" }), "chi");
    await user.click(screen.getByRole("button", { name: "Mở Chi phí" }));

    expect(onChangeView).toHaveBeenCalledWith("expenses");
  });
});
