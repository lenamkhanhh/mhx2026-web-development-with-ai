import type { ComponentProps } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventRecord, MemberRecord } from "../../firebase/contracts";
import { EventsWorkbench } from "./EventsWorkbench";

const members: MemberRecord[] = [
  { uid: "lead-1", displayName: "Khanh", email: "lead@example.com", role: "lead", responsibility: "Schedule", isDemo: false },
  { uid: "member-1", displayName: "Minh", email: "member@example.com", role: "member", responsibility: "Photos", isDemo: false },
];
function event(overrides: Partial<EventRecord> = {}): EventRecord {
  return { id: "event-1", title: "Breakfast", category: "food", startAt: "2026-07-30T08:00:00.000Z", endAt: "2026-07-30T09:00:00.000Z", status: "approved", participantIds: ["lead-1", "member-1"], createdBy: "lead-1", approvedBy: "lead-1", order: 0, ...overrides };
}
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason?: unknown) => void; const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; }
function renderWorkbench(overrides: Partial<ComponentProps<typeof EventsWorkbench>> = {}) {
  const props: ComponentProps<typeof EventsWorkbench> = { currentUserId: "lead-1", events: [], members, role: "lead", onApprove: vi.fn().mockResolvedValue(undefined), onCancel: vi.fn().mockResolvedValue(undefined), onCreate: vi.fn().mockResolvedValue(undefined), onDelete: vi.fn().mockResolvedValue(undefined), onMove: vi.fn().mockResolvedValue(undefined), onSync: vi.fn().mockResolvedValue(undefined), ...overrides };
  return { ...render(<EventsWorkbench {...props} />), props };
}
beforeEach(() => vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("EventsWorkbench", () => {
  it("renders a distinct empty state and the event composer", () => {
    const { container } = renderWorkbench();
    expect(screen.getByRole("heading")).toBeTruthy();
    expect(screen.getAllByText(/Timeline/).length).toBeGreaterThan(1);
    expect(container.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it("shows pending and approved states while hiding lead controls from members", () => {
    const { container } = renderWorkbench({ currentUserId: "member-1", role: "member", events: [event({ id: "pending", title: "Proposal", status: "pending", createdBy: "member-1", approvedBy: null }), event({ id: "approved", title: "Visit", category: "activity" })] });
    expect(container.querySelector('[class*="status_pending"]')).toBeTruthy();
    expect(container.querySelector('[class*="status_approved"]')).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("shows saving feedback, submits typed data, and resets after success", async () => {
    const user = userEvent.setup(); const save = deferred<void>();
    const { container, props } = renderWorkbench({ onCreate: vi.fn(() => save.promise) });
    const dateInputs = container.querySelectorAll('input[type="datetime-local"]') as NodeListOf<HTMLInputElement>;
    await user.type(screen.getByRole("textbox"), "Sunrise");
    await user.type(dateInputs[0], "2026-07-30T06:00"); await user.type(dateInputs[1], "2026-07-30T07:00");
    await user.click(screen.getAllByRole("checkbox")[0]); await user.click(container.querySelector('button[type="submit"]')!);
    expect((container.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status")).toBeTruthy();
    save.resolve(); await waitFor(() => expect(props.onCreate).toHaveBeenCalledTimes(1));
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
  });

  it("keeps the composer draft and announces rollback feedback when saving fails", async () => {
    const user = userEvent.setup(); const { container, props } = renderWorkbench({ onCreate: vi.fn().mockRejectedValue(new Error("offline")) });
    const dateInputs = container.querySelectorAll('input[type="datetime-local"]') as NodeListOf<HTMLInputElement>;
    await user.type(screen.getByRole("textbox"), "Night market");
    await user.type(dateInputs[0], "2026-07-30T18:00"); await user.type(dateInputs[1], "2026-07-30T19:00");
    await user.click(screen.getAllByRole("checkbox")[0]); await user.click(container.querySelector('button[type="submit"]')!);
    await waitFor(() => expect(screen.getByRole("alert").textContent?.length).toBeGreaterThan(0));
    expect((screen.getByRole("textbox") as HTMLInputElement).value.length).toBeGreaterThan(0); expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it("applies an optimistic lead-only move then rolls back after rejected reorder", async () => {
    const user = userEvent.setup(); const move = deferred<void>();
    renderWorkbench({ events: [event({ id: "first", title: "Breakfast" }), event({ id: "second", title: "Visit", order: 1 })], onMove: vi.fn(() => move.promise) });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const moveButtons = screen.getAllByRole("button").filter((button) => button.getAttribute("aria-label")?.includes("Visit") && !button.disabled);
    await user.click(moveButtons[0]); const timeline = screen.getByRole("list");
    await waitFor(() => expect(within(timeline).getAllByRole("listitem")[0].getAttribute("data-event-id")).toBe("second"));
    expect(within(timeline).getByTestId("event-second").getAttribute("data-motion")).toBe("reordering");
    move.reject(new Error("unsupported"));
    await waitFor(() => expect(within(timeline).getAllByRole("listitem")[0].getAttribute("data-event-id")).toBe("first"));
    expect(screen.getByRole("alert").textContent?.length).toBeGreaterThan(0);
  });

  it("marks motion as reduced when the user requests it", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    renderWorkbench({ events: [event()] });
    expect(screen.getByTestId("events-workbench").getAttribute("data-reduced-motion")).toBe("true");
  });
});
