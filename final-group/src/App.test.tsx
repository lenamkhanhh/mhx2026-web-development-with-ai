// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    expect(container?.textContent).toContain("Chào mừng trở lại");
  });

  it("shows create-trip onboarding and keeps join-by-code disabled", async () => {
    await render(<App backend={makeBackend(user, null, [])} />);
    expect(container?.textContent).toContain("Tạo chuyến đi đầu tiên");
    expect(button("Nhập mã tham gia").disabled).toBe(true);
  });

  it("renders persisted labels, expense actions, and the remaining fail-closed control", async () => {
    await render(<App backend={makeBackend(user, snapshot.trip, [snapshot.trip], snapshot)} />);
    expect(container?.textContent).toContain("Đang diễn ra");
    expect(container?.textContent).toContain("Lưu trú");
    expect(button("Chuyển Nhận phòng xuống").disabled).toBe(false);
    expect(button("Thêm khoản chi").disabled).toBe(false);
    expect(button("Chốt Khách sạn").disabled).toBe(false);
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

function button(prefix: string): HTMLButtonElement {
  const candidate = [...(container?.querySelectorAll("button") ?? [])].find(
    (element) => element.textContent?.startsWith(prefix),
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
  };
}
