// @vitest-environment jsdom

import type { ComponentProps } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkbenchShell, type WorkbenchView } from "./WorkbenchShell";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
  overrides: Partial<ComponentProps<typeof WorkbenchShell>> = {},
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
        {...overrides}
      >
        <section aria-label="Nội dung hiện tại">Nội dung hiện tại</section>
      </WorkbenchShell>,
    ),
  };
}

describe("WorkbenchShell", () => {
  it("renders only the real TripFlow work areas and marks the active view", () => {
    renderShell("schedule");

    const sidebar = screen.getByRole("navigation", { name: "TripFlow navigation" });
    expect(sidebar).toBeTruthy();
    expect(within(sidebar).getByRole("link", { name: "Overview" })).toBeTruthy();
    expect(within(sidebar).getByRole("link", { name: "Timeline" }).getAttribute("aria-current")).toBe("page");
    expect(within(sidebar).getByRole("link", { name: "Expenses" })).toBeTruthy();
    expect(within(sidebar).getByRole("link", { name: "Members" })).toBeTruthy();
    expect(within(sidebar).queryByRole("link", { name: /Files|Notes|Integrations/i })).toBeNull();
    expect(within(sidebar).getByRole("link", { name: "Timeline" }).textContent).toContain("2");
    expect(screen.getByText("Nội dung hiện tại")).toBeTruthy();
  });

  it("changes view from keyboard- and pointer-accessible navigation", async () => {
    const user = userEvent.setup();
    const { onChangeView } = renderShell();

    const sidebar = screen.getByRole("navigation", { name: "TripFlow navigation" });
    await user.click(within(sidebar).getByRole("link", { name: "Expenses" }));

    expect(onChangeView).toHaveBeenCalledWith("expenses");
  });

  it("exposes a stable status region and sign-out action", () => {
    renderShell();

    expect(screen.getByRole("status", { name: "System status" }).textContent).toContain("Firebase");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    expect(screen.getByText("Lan")).toBeTruthy();
  });

  it("renders the approved workbench header, metadata, and four page tabs", () => {
    renderShell("schedule");

    expect(screen.getByRole("searchbox", { name: "Search TripFlow" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "ĐÀ LẠT / TIMELINE" })).toBeTruthy();
    expect(screen.getByText("1 member")).toBeTruthy();
    expect(screen.getByText("# TRIP-1")).toBeTruthy();

    const tabs = screen.getByRole("navigation", { name: "Trip views" });
    expect(within(tabs).getAllByRole("tab")).toHaveLength(4);
    expect(within(tabs).getByRole("tab", { name: "Timeline" }).getAttribute("aria-selected")).toBe("true");
  });

  it("uses topbar search to navigate to a real work area", async () => {
    const user = userEvent.setup();
    const { onChangeView } = renderShell();

    await user.type(screen.getByRole("searchbox", { name: "Search TripFlow" }), "expense");
    await user.click(screen.getByRole("button", { name: "Open Expenses" }));

    expect(onChangeView).toHaveBeenCalledWith("expenses");
  });

  it("finds a real itinerary item and opens its Timeline context", async () => {
    const user = userEvent.setup();
    const onOpenSearchResult = vi.fn();
    renderShell("overview", vi.fn(), {
      onOpenSearchResult,
      searchRecords: [{ id: "event-1", label: "Airport pickup", meta: "Timeline item", view: "schedule" }],
    });

    await user.type(screen.getByRole("searchbox", { name: "Search TripFlow" }), "airport");
    await user.click(screen.getByRole("button", { name: "Open Airport pickup" }));

    expect(onOpenSearchResult).toHaveBeenCalledWith({ id: "event-1", view: "schedule" });
  });

  it("returns to the top whenever the active work area changes", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    renderShell();

    await user.click(screen.getByRole("link", { name: "Expenses" }));

    expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", top: 0 });
  });

  it("implements the advertised keyboard shortcuts without hijacking text input", async () => {
    const user = userEvent.setup();
    const onChangeView = vi.fn();
    renderShell("overview", onChangeView);

    await user.keyboard("{Control>}k{/Control}");
    expect(document.activeElement).toBe(
      screen.getByRole("searchbox", { name: "Search TripFlow" }),
    );

    await user.keyboard("{Escape}");
    await user.keyboard("n");
    expect(onChangeView).toHaveBeenCalledWith("schedule");

    await user.keyboard("e");
    expect(onChangeView).toHaveBeenCalledWith("expenses");

    const search = screen.getByRole("searchbox", { name: "Search TripFlow" });
    await user.click(search);
    await user.type(search, "n");
    expect(onChangeView).toHaveBeenCalledTimes(2);
  });

  it("exposes real invite and share actions in the page header", async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn();
    const onShare = vi.fn();
    renderShell("overview", vi.fn(), { onInvite, onShare });

    await user.click(screen.getByRole("button", { name: "Invite" }));
    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(onInvite).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
