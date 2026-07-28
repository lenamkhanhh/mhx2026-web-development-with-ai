// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Trip, UserProfile } from "../../types";
import {
  joinTrip,
  normalizeJoinCode,
  OnboardingFlow,
  submitNewTrip,
  type OnboardingBackend,
} from "./OnboardingFlow";

const profile: UserProfile = {
  uid: "user-1",
  displayName: "Khánh",
  email: "khanh@example.com",
  tripIds: [],
};

const trip: Trip = {
  id: "trip-1",
  name: "Đà Lạt cuối hạ",
  destination: "Đà Lạt",
  startDate: "2026-07-30",
  endDate: "2026-08-01",
  leadId: profile.uid,
  joinCode: "DALAT26",
};

function createBackend(overrides: Partial<OnboardingBackend> = {}): OnboardingBackend {
  return {
    createTrip: vi.fn().mockResolvedValue(trip),
    joinTrip: vi.fn().mockResolvedValue(trip),
    ...overrides,
  };
}

afterEach(cleanup);

describe("onboarding actions", () => {
  it("creates a lead membership using the authenticated profile", async () => {
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
      trip: {
        name: "Đà Lạt cuối hạ",
        destination: "Đà Lạt",
        startDate: "2026-07-30",
        endDate: "2026-08-01",
        leadId: profile.uid,
      },
      member: {
        uid: profile.uid,
        displayName: profile.displayName,
        email: profile.email,
        role: "lead",
        responsibility: "",
        isDemo: false,
      },
    });
  });

  it("normalizes a join code and always creates a member role request", async () => {
    const backend = createBackend();

    expect(normalizeJoinCode(" da lat-26 ")).toBe("DA LAT-26");
    await joinTrip(backend, profile, " dalat26 ");

    expect(backend.joinTrip).toHaveBeenCalledWith({
      joinCode: "DALAT26",
      member: {
        uid: profile.uid,
        displayName: profile.displayName,
        email: profile.email,
        role: "member",
        responsibility: "",
        isDemo: false,
      },
    });
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

    await actor.click(screen.getByRole("button", { name: "Tham gia chuyến đi" }));
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
