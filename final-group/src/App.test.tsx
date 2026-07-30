// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import {
  App,
  categoryLabel,
  statusLabel,
} from "./App";
import type { TripBackend, TripSnapshot } from "./firebase/contracts";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

describe("TripFlow integration mappings", () => {
  it("labels every persisted event category without using the legacy UI vocabulary", () => {
    expect(categoryLabel("transport")).toBe("Di chuyển");
    expect(categoryLabel("stay")).toBe("Lưu trú");
    expect(categoryLabel("food")).toBe("Ăn uống");
    expect(categoryLabel("activity")).toBe("Hoạt động");
    expect(categoryLabel("other")).toBe("Khác");
  });

  it("labels every persisted event status without silently coercing it", () => {
    expect(statusLabel("pending")).toBe("Chờ duyệt");
    expect(statusLabel("approved")).toBe("Đã duyệt");
    expect(statusLabel("happening")).toBe("Đang diễn ra");
    expect(statusLabel("completed")).toBe("Đã hoàn thành");
    expect(statusLabel("cancelled")).toBe("Đã huỷ");
  });
});

describe("TripFlow App composition", () => {
  it("shows the AuthFlow when no Firebase session exists", async () => {
    await render(<App backend={makeBackend(null)} />);
    expect(screen.getByTestId("auth-workbench")).toBeTruthy();
    expect(container?.textContent).toContain("TRIPFLOW WORKBENCH");
  });

  it("shows create-trip onboarding and keeps join-by-code disabled", async () => {
    await render(<App backend={makeBackend(user, null, [])} />);
    expect(screen.getByTestId("onboarding-workbench")).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("tab", { name: "Tham gia chuyến đi" }));
    expect(button("Chưa thể tham gia bằng mã").disabled).toBe(true);
  });

  it("labels an in-memory preview as local demo data instead of live trip data", async () => {
    await render(
      <App
        backend={makeBackend(user, snapshot.trip, [snapshot.trip], snapshot)}
        demoMode
      />,
    );

    expect(screen.getByTestId("local-demo-notice").textContent).toContain(
      "Dữ liệu minh họa local",
    );
  });

  it("renders persisted labels, expense actions, and the remaining fail-closed control", async () => {
    await render(<App backend={makeBackend(user, snapshot.trip, [snapshot.trip], snapshot)} />);
    expect(container?.textContent).toContain("Đang diễn ra");

    await openWorkbenchView("schedule");
    expect(screen.getByTestId("events-workbench")).toBeTruthy();
    expect(container?.textContent).toContain("Lưu trú");
    expect(button("Đưa Nhận phòng xuống").disabled).toBe(false);

    await openWorkbenchView("expenses");
    expect(button("Thêm khoản chi").disabled).toBe(false);
    expect(button("Chốt Khách sạn").disabled).toBe(false);
  });

  it("composes the Workbench shell and keeps feature screens behind its navigation", async () => {
    await render(<App backend={makeBackend(user, snapshot.trip, [snapshot.trip], snapshot)} />);
    expect(container?.textContent).toContain("Workbench");

    await openWorkbenchView("expenses");
    expect(container?.textContent).toContain("Chi phí & chia tiền");
    expect(button("Thêm khoản chi").disabled).toBe(false);
  });

  it("keeps an event draft when the backend rejects instead of reporting false success", async () => {
    const backend = makeBackend(user, snapshot.trip, [snapshot.trip], snapshot, {
      createEvent: vi.fn().mockRejectedValue(new Error("Backend rejected the event.")),
    });
    const actor = userEvent.setup();

    await render(<App backend={backend} />);
    await openWorkbenchView("schedule");
    await actor.click(screen.getByRole("button", { name: "Thêm hoạt động" }));

    await actor.type(screen.getByLabelText("Tên hoạt động"), "Chợ đêm");
    const dateInputs = container?.querySelectorAll<HTMLInputElement>(
      'input[type="datetime-local"]',
    );
    expect(dateInputs?.length).toBe(2);
    await actor.type(dateInputs?.[0] as HTMLInputElement, "2026-08-02T18:00");
    await actor.type(dateInputs?.[1] as HTMLInputElement, "2026-08-02T19:00");
    await actor.click(screen.getByRole("checkbox", { name: "Lan" }));
    await actor.click(button("Thêm vào lịch trình"));

    await waitFor(() => {
      expect(
        (screen.getByLabelText("Tên hoạt động") as HTMLInputElement).value,
      ).toBe("Chợ đêm");
    });
    expect(container?.textContent).toContain("Backend rejected the event.");
  });

  it("never renders a snapshot whose trip id differs from the selected trip", async () => {
    const secondTrip = {
      ...snapshot.trip,
      id: "trip-2",
      name: "Huế",
      destination: "Huế",
    };
    const backend = makeBackend(
      user,
      snapshot.trip,
      [snapshot.trip, secondTrip],
      snapshot,
      {
        subscribeTrip: (_tripId, listener) => {
          listener(snapshot);
          return vi.fn();
        },
      },
    );
    const actor = userEvent.setup();

    await render(<App backend={backend} />);
    await actor.selectOptions(
      screen.getByLabelText("Chuyến đi đang mở"),
      secondTrip.id,
    );

    await waitFor(() => {
      expect(container?.textContent).toContain("Đang tải bảng điều khiển chuyến đi");
    });
    expect(container?.textContent).not.toContain("Nhận phòng");
  });
});

async function render(node: ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(node);
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function openWorkbenchView(view: "schedule" | "expenses") {
  const link = container?.querySelector<HTMLAnchorElement>(`a[href="#${view}"]`);
  expect(link).toBeTruthy();

  await act(async () => {
    link?.click();
    await new Promise((resolve) => setTimeout(resolve, 220));
  });
}
function button(prefix: string): HTMLButtonElement {
  const candidate = [...(container?.querySelectorAll("button") ?? [])].find(
    (element) =>
      element.textContent?.startsWith(prefix) ||
      element.getAttribute("aria-label")?.startsWith(prefix),
  );
  if (!(candidate instanceof HTMLButtonElement)) throw new Error(`Missing button: ${prefix}`);
  return candidate;
}

const user = { uid: "user-1", email: "user@example.com", displayName: "Lan" };
const snapshot: TripSnapshot = {
  trip: { id: "trip-1", name: "Đà Lạt", destination: "Đà Lạt", startDate: "2026-08-01", endDate: "2026-08-03", leadId: "user-1", joinCode: "DALAT26" },
  members: [{ uid: "user-1", displayName: "Lan", email: "user@example.com", role: "lead", responsibility: "Lịch trình", isDemo: false }],
  events: [
    { id: "event-1", order: 0, title: "Nhận phòng", category: "stay", startAt: "2026-08-01T08:00:00.000Z", endAt: "2026-08-01T09:00:00.000Z", status: "happening", participantIds: ["user-1"], createdBy: "user-1", approvedBy: "user-1" },
    { id: "event-2", order: 1, title: "Ăn trưa", category: "food", startAt: "2026-08-01T11:00:00.000Z", endAt: "2026-08-01T12:00:00.000Z", status: "approved", participantIds: ["user-1"], createdBy: "user-1", approvedBy: "user-1" },
  ],
  expenses: [{
    id: "expense-1",
    title: "Khách sạn",
    amount: 1_000_000,
    paidBy: "user-1",
    splitAmong: ["user-1"],
    status: "pending",
    createdBy: "user-1",
  }],
};

function makeBackend(
  session: typeof user | null,
  profileTrip: TripSnapshot["trip"] | null = null,
  trips = profileTrip ? [profileTrip] : [],
  selectedSnapshot: TripSnapshot | null = null,
  overrides: Partial<TripBackend> = {},
): TripBackend {
  return {
    observeSession: (listener) => { listener(session); return vi.fn(); },
    register: vi.fn(), login: vi.fn(), logout: vi.fn(), upsertProfile: vi.fn(),
    getProfile: vi.fn().mockResolvedValue(session ? { uid: session.uid, email: session.email ?? "", displayName: session.displayName ?? "", tripIds: profileTrip ? [profileTrip.id] : [] } : null),
    subscribeTrips: (_uid, listener) => { listener(trips); return vi.fn(); },
    subscribeTrip: (_tripId, listener) => { if (selectedSnapshot) listener(selectedSnapshot); return vi.fn(); },
    createTrip: vi.fn(), joinTrip: vi.fn(), updateResponsibility: vi.fn(), removeMember: vi.fn(),
    createEvent: vi.fn(), updateEvent: vi.fn(), approveEvent: vi.fn(), deleteEvent: vi.fn(), reorderEvents: vi.fn(),
    createExpense: vi.fn(), updateExpense: vi.fn(), deleteExpense: vi.fn(), settleExpense: vi.fn(),
    ...overrides,
  };
}
