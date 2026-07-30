// @vitest-environment jsdom

import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function renderWorkbench(overrides: Partial<ComponentProps<typeof EventsWorkbench>> = {}) {
  const props: ComponentProps<typeof EventsWorkbench> = { currentUserId: "lead-1", events: [], members, role: "lead", onApprove: vi.fn().mockResolvedValue(undefined), onCancel: vi.fn().mockResolvedValue(undefined), onCreate: vi.fn().mockResolvedValue(undefined), onDelete: vi.fn().mockResolvedValue(undefined), onMove: vi.fn().mockResolvedValue(undefined), onSync: vi.fn().mockResolvedValue(undefined), onUpdate: vi.fn().mockResolvedValue(undefined), ...overrides };
  return { ...render(<EventsWorkbench {...props} />), props };
}
async function openComposer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Add item" }));
  return screen.getByRole("form", { name: "Create a timeline item" });
}
beforeEach(() => vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("EventsWorkbench", () => {
  it("renders a distinct empty state and opens the event composer on demand", async () => {
    const user = userEvent.setup();
    renderWorkbench();
    expect(screen.getByRole("heading")).toBeTruthy();
    expect(screen.getAllByText(/Timeline/).length).toBeGreaterThan(1);
    expect(screen.queryByRole("form", { name: "Create a timeline item" })).toBeNull();
    expect(await openComposer(user)).toBeTruthy();
  });

  it("shows canonical status/category labels and only the member-owned pending action", () => {
    renderWorkbench({ currentUserId: "member-1", role: "member", events: [event({ id: "pending", title: "Proposal", status: "pending", createdBy: "member-1", approvedBy: null }), event({ id: "approved", title: "Visit", category: "activity" })] });
    const pending = within(screen.getByTestId("event-pending"));
    const approved = within(screen.getByTestId("event-approved"));
    const pendingActions = within(pending.getByLabelText("Actions for Proposal"));
    const approvedActions = within(approved.getByLabelText("Actions for Visit"));

    expect(pending.getByText("In review")).toBeTruthy();
    expect(pending.getByText(/Food & drinks ·/)).toBeTruthy();
    expect(approved.getByText("Open")).toBeTruthy();
    expect(approved.getByText(/Activity ·/)).toBeTruthy();
    expect(pendingActions.getByRole("button", { name: "Delete" })).toBeTruthy();
    expect(pendingActions.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(pendingActions.queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(approvedActions.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sync statuses" })).toBeNull();
  });

  it("renders every persisted status/category label and the lead action matrix", () => {
    const cases = [
      { id: "pending", title: "Train", status: "pending", category: "transport", statusLabel: "In review", categoryLabel: "Transport" },
      { id: "approved", title: "Hotel", status: "approved", category: "stay", statusLabel: "Open", categoryLabel: "Stay" },
      { id: "happening", title: "Lunch", status: "happening", category: "food", statusLabel: "In progress", categoryLabel: "Food & drinks" },
      { id: "completed", title: "Museum", status: "completed", category: "activity", statusLabel: "Done", categoryLabel: "Activity" },
      { id: "cancelled", title: "Backup", status: "cancelled", category: "other", statusLabel: "Cancelled", categoryLabel: "Other" },
    ] as const;
    renderWorkbench({ events: cases.map((item, order) => event({ ...item, order })) });

    for (const item of cases) {
      const row = within(screen.getByTestId(`event-${item.id}`));
      expect(row.getByText(item.statusLabel)).toBeTruthy();
      expect(row.getByText(new RegExp(`^${item.categoryLabel} ·`))).toBeTruthy();
      expect(row.getByRole("button", { name: "Delete" })).toBeTruthy();
    }

    const pendingActions = within(screen.getByLabelText("Actions for Train"));
    expect(pendingActions.getByRole("button", { name: "Approve" })).toBeTruthy();
    expect(pendingActions.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(within(screen.getByLabelText("Actions for Hotel")).queryByRole("button", { name: "Approve" })).toBeNull();
    expect(within(screen.getByLabelText("Actions for Hotel")).getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(within(screen.getByLabelText("Actions for Backup")).queryByRole("button", { name: "Approve" })).toBeNull();
    expect(within(screen.getByLabelText("Actions for Backup")).queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(screen.getByRole("button", { name: "Sync statuses" })).toBeTruthy();
  });

  it("starts with a focused inspector and filters the timeline by status and date", async () => {
    const user = userEvent.setup();
    renderWorkbench({
      events: [
        event(),
        event({
          id: "pending",
          title: "Proposal",
          order: 1,
          startAt: "2026-07-31T08:00:00.000Z",
          endAt: "2026-07-31T09:00:00.000Z",
          status: "pending",
          approvedBy: null,
        }),
      ],
    });

    const details = screen.getByRole("complementary", { name: "Event details" });
    expect(within(details).getByText("Breakfast")).toBeTruthy();
    expect(
      within(details).getAllByRole("tab", { hidden: true }),
    ).toHaveLength(4);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter status" }),
      "pending",
    );
    expect(screen.queryByTestId("event-event-1")).toBeNull();
    expect(screen.getByTestId("event-pending")).toBeTruthy();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter status" }),
      "all",
    );
    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2026-07-31" },
    });
    expect(screen.queryByTestId("event-event-1")).toBeNull();
    expect(screen.getByTestId("event-pending")).toBeTruthy();
  });

  it("honors an event selected from Overview", () => {
    renderWorkbench({
      events: [
        event(),
        event({ id: "selected", title: "Selected event", order: 1 }),
      ],
      initialSelectedEventId: "selected",
    });

    const details = screen.getByRole("complementary", { name: "Event details" });
    expect(within(details).getByText("Selected event")).toBeTruthy();
  });

  it("lets a permitted member open the Notes workspace for the selected event", async () => {
    const user = userEvent.setup();
    renderWorkbench({ events: [event()] });

    const details = screen.getByRole("complementary", { name: "Event details" });
    const notesTab = within(details).getByRole("tab", { name: "Notes" });
    expect(notesTab.hasAttribute("disabled")).toBe(false);

    await user.click(notesTab);
    expect(within(details).getByRole("form", { name: "Add note" })).toBeTruthy();
  });

  it("opens a real detail panel and saves a permitted event title edit", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    renderWorkbench({ events: [event()], onUpdate });

    await user.click(screen.getByRole("button", { name: "Open Breakfast details" }));
    const details = screen.getByRole("complementary", { name: "Event details" });
    expect(within(details).getByText("Breakfast")).toBeTruthy();

    await user.click(within(details).getByRole("button", { name: "Edit event" }));
    const title = within(details).getByRole("textbox", { name: "Activity title" });
    await user.clear(title);
    await user.type(title, "Brunch");
    await user.click(within(details).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith("event-1", { title: "Brunch" }));
  });

  it("shows saving feedback, submits typed data, and resets after success", async () => {
    const user = userEvent.setup(); const save = deferred<void>();
    const { container, props } = renderWorkbench({ onCreate: vi.fn(() => save.promise) });
    await openComposer(user);
    const dateInputs = [...container.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]')];
    await user.type(screen.getByRole("textbox"), "Sunrise");
    await user.selectOptions(screen.getByRole("combobox", { name: "Category" }), "transport");
    await user.type(dateInputs[0], "2026-07-30T06:00"); await user.type(dateInputs[1], "2026-07-30T07:00");
    await user.click(screen.getAllByRole("checkbox")[0]); await user.click(container.querySelector('button[type="submit"]')!);
    expect((container.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(props.onCreate).toHaveBeenCalledWith({
      title: "Sunrise",
      category: "transport",
      startAt: new Date("2026-07-30T06:00").toISOString(),
      endAt: new Date("2026-07-30T07:00").toISOString(),
      participantIds: ["lead-1"],
    });
    save.resolve(); await waitFor(() => expect(props.onCreate).toHaveBeenCalledTimes(1));
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
  });

  it("locks every composer control while an event save is pending", async () => {
    const user = userEvent.setup();
    const save = deferred<void>();
    const { container } = renderWorkbench({ onCreate: vi.fn(() => save.promise) });
    await openComposer(user);
    const dateInputs = [
      ...container.querySelectorAll<HTMLInputElement>(
        'input[type="datetime-local"]',
      ),
    ];
    const title = screen.getByLabelText("Item title");
    const category = screen.getByRole("combobox", { name: "Category" });
    const participant = screen.getAllByRole("checkbox")[0];
    const submit = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    )!;

    await user.type(title, "Locked draft");
    await user.type(dateInputs[0], "2026-07-30T06:00");
    await user.type(dateInputs[1], "2026-07-30T07:00");
    await user.click(participant);
    await user.click(submit);

    expect((title as HTMLInputElement).disabled).toBe(true);
    expect((category as HTMLSelectElement).disabled).toBe(true);
    expect(dateInputs.every((input) => input.disabled)).toBe(true);
    expect((participant as HTMLInputElement).disabled).toBe(true);
    expect(submit.disabled).toBe(true);

    save.resolve();
    await waitFor(() => expect(submit.disabled).toBe(false));
  });

  it("keeps the composer draft and announces rollback feedback when saving fails", async () => {
    const user = userEvent.setup(); const { container, props } = renderWorkbench({ onCreate: vi.fn().mockRejectedValue(new Error("offline")) });
    await openComposer(user);
    const dateInputs = [...container.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]')];
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
    const moveButtons = (screen.getAllByRole("button") as HTMLButtonElement[]).filter((button) => button.getAttribute("aria-label")?.includes("Visit") && !button.disabled);
    await user.click(moveButtons[0]); const timeline = screen.getByRole("list");
    await waitFor(() => expect(within(timeline).getAllByRole("listitem")[0].getAttribute("data-event-id")).toBe("second"));
    expect(within(timeline).getByTestId("event-second").getAttribute("data-motion")).toBe("reordering");
    move.reject(new Error("unsupported"));
    await waitFor(() => expect(within(timeline).getAllByRole("listitem")[0].getAttribute("data-event-id")).toBe("first"));
    expect(screen.getByRole("alert").textContent?.length).toBeGreaterThan(0);
  });

  it("keeps the optimistic reorder locked through a stale snapshot and clears it only after confirmation", async () => {
    const user = userEvent.setup();
    const pendingMove = deferred<void>();
    const onMove = vi.fn(() => pendingMove.promise);
    const first = event({ id: "first", title: "Breakfast" });
    const second = event({ id: "second", title: "Visit", order: 1 });
    const unrelated = event({ id: "unrelated", title: "Dinner", order: 2 });
    const rendered = renderWorkbench({ events: [first, second], onMove });

    await user.click(screen.getByRole("button", { name: "Move Visit up" }));
    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));

    const reorderButtons = (screen.getAllByRole("button") as HTMLButtonElement[]).filter((button) => button.getAttribute("aria-label")?.startsWith("Move "));
    expect(reorderButtons.length).toBeGreaterThan(0);
    expect(reorderButtons.every((button) => button.disabled)).toBe(true);

    pendingMove.resolve();
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Waiting for the realtime update"));
    expect(reorderButtons.every((button) => button.disabled)).toBe(true);

    rendered.rerender(<EventsWorkbench {...rendered.props} events={[{ ...first }, { ...second }, unrelated]} />);
    await waitFor(() => {
      const staleTimeline = screen.getByRole("list");
      const staleButtons = (screen.getAllByRole("button") as HTMLButtonElement[]).filter((button) => button.getAttribute("aria-label")?.startsWith("Move "));
      expect(within(staleTimeline).getAllByRole("listitem").map((item) => item.getAttribute("data-event-id"))).toEqual(["second", "first", "unrelated"]);
      expect(staleButtons.every((button) => button.disabled)).toBe(true);
    });

    rendered.rerender(<EventsWorkbench {...rendered.props} events={[{ ...second, order: 0 }, { ...first, order: 1 }, unrelated]} />);
    await waitFor(() => {
      const refreshedButtons = (screen.getAllByRole("button") as HTMLButtonElement[]).filter((button) => button.getAttribute("aria-label")?.startsWith("Move "));
      expect(refreshedButtons.some((button) => !button.disabled)).toBe(true);
    });
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it("marks motion as reduced when the user requests it", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    renderWorkbench({ events: [event()] });
    expect(screen.getByTestId("events-workbench").getAttribute("data-reduced-motion")).toBe("true");
  });
});
