// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TripBackend, TripRecord, UserRecord } from "../../firebase/contracts";
import {
  joinTrip,
  normalizeJoinCode,
  OnboardingFlow,
  submitNewTrip,
  type OnboardingBackend,
} from "./OnboardingFlow";

const profile: UserRecord = {
  uid: "user-1",
  displayName: "Khánh",
  email: "khanh@example.com",
  tripIds: [],
};

const trip: TripRecord = {
  id: "trip-1",
  name: "Đà Lạt cuối hạ",
  destination: "Đà Lạt",
  startDate: "2026-07-30",
  endDate: "2026-08-01",
  leadId: profile.uid,
  joinCode: "DALAT26",
};

type OnboardingBackend = Pick<TripBackend, "createTrip" | "joinTrip">;

function createBackend(
  overrides: Partial<OnboardingBackend> = {},
): OnboardingBackend {
  return {
    createTrip: vi.fn().mockResolvedValue(trip),
    joinTrip: vi.fn().mockRejectedValue(
      new Error("Joining by code is disabled until an approved join proof exists."),
    ),
    ...overrides,
  };
}

afterEach(cleanup);

describe("onboarding actions", () => {
  it("creates a trip with the backend-authenticated actor", async () => {
    const backend = createBackend();

    await expect(
      submitNewTrip(backend, profile, {
        name: "Đà Lạt cuối hạ",
        destination: "Đà Lạt",
        startDate: "2026-07-30",
        endDate: "2026-08-01",
      }),
    ).resolves.toEqual(trip);

    expect(backend.createTrip).toHaveBeenCalledWith({
      name: "Đà Lạt cuối hạ",
      destination: "Đà Lạt",
      startDate: "2026-07-30",
      endDate: "2026-08-01",
    }, profile);
  });

  it("normalizes a join code but preserves the backend's fail-closed join boundary", async () => {
    const backend = createBackend();

    expect(normalizeJoinCode(" da lat-26 ")).toBe("DA LAT-26");
    await expect(joinTrip(backend, profile, " dalat26 ")).rejects.toThrow(
      "Joining by code is disabled",
    );

    expect(backend.joinTrip).toHaveBeenCalledWith("DALAT26", profile);
  });

  it("rejects an invalid trip date range without writing", async () => {
    const backend = createBackend();

    await expect(
      submitNewTrip(backend, profile, {
        name: "Đà Lạt",
        destination: "Đà Lạt",
        startDate: "2026-08-01",
        endDate: "2026-07-30",
      }),
    ).rejects.toMatchObject({ errors: { endDate: expect.any(String) } });
    expect(backend.createTrip).not.toHaveBeenCalled();
  });
});

describe("OnboardingFlow", () => {
  it("keeps an invalid join code in the UI and does not call the backend", async () => {
    const backend = createBackend();
    const actor = userEvent.setup();
    render(<OnboardingFlow backend={backend} profile={profile} onTripReady={vi.fn()} />);

    await actor.click(screen.getByRole("tab", { name: "Tham gia chuyến đi" }));
    await actor.click(screen.getByRole("button", { name: "Tham gia bằng mã" }));

    expect(screen.getByText("Vui lòng nhập mã tham gia.")).toBeTruthy();
    expect(backend.joinTrip).not.toHaveBeenCalled();
  });

  it("creates a trip and hands it to App composition", async () => {
    const backend = createBackend();
    const onTripReady = vi.fn();
    const actor = userEvent.setup();
    render(<OnboardingFlow backend={backend} profile={profile} onTripReady={onTripReady} />);

    await actor.type(screen.getByLabelText("Tên chuyến đi"), trip.name);
    await actor.type(screen.getByLabelText("Điểm đến"), trip.destination);
    await actor.type(screen.getByLabelText("Ngày bắt đầu"), trip.startDate);
    await actor.type(screen.getByLabelText("Ngày kết thúc"), trip.endDate);
    await actor.click(screen.getByRole("button", { name: "Tạo chuyến đi" }));

    expect(await screen.findByText("Đã tạo chuyến đi.")).toBeTruthy();
    expect(onTripReady).toHaveBeenCalledWith(trip);
  });
});
