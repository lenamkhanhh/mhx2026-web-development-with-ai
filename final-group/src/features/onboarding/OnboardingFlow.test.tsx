// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TripRecord, UserRecord } from "../../firebase/contracts";
import { joinTrip, normalizeJoinCode, OnboardingFlow, submitNewTrip, type OnboardingBackend } from "./OnboardingFlow";

const profile: UserRecord = { uid: "user-1", displayName: "Khanh", email: "khanh@example.com", tripIds: [] };
const trip: TripRecord = { id: "trip-1", name: "Da Lat weekend", destination: "Da Lat", startDate: "2026-07-30", endDate: "2026-08-01", leadId: profile.uid, joinCode: "DALAT26" };
function createBackend(overrides: Partial<OnboardingBackend> = {}): OnboardingBackend { return { createTrip: vi.fn().mockResolvedValue(trip), joinTrip: vi.fn().mockRejectedValue(new Error("Joining by code is disabled until an approved join proof exists.")), ...overrides }; }
afterEach(cleanup);

describe("onboarding actions", () => {
  it("creates a trip with the backend-authenticated actor", async () => { const backend=createBackend(); await expect(submitNewTrip(backend, profile, { name: trip.name, destination: trip.destination, startDate: trip.startDate, endDate: trip.endDate })).resolves.toEqual(trip); expect(backend.createTrip).toHaveBeenCalledWith({name:trip.name,destination:trip.destination,startDate:trip.startDate,endDate:trip.endDate},profile); });
  it("normalizes a join code but preserves the backend fail-closed boundary", async () => { const backend=createBackend(); expect(normalizeJoinCode(" da lat-26 ")).toBe("DA LAT-26"); await expect(joinTrip(backend,profile," dalat26 ")).rejects.toThrow("Joining by code is disabled"); expect(backend.joinTrip).toHaveBeenCalledWith("DALAT26",profile); });
  it("rejects an invalid date range without writing", async () => { const backend=createBackend(); await expect(submitNewTrip(backend,profile,{...trip,startDate:"2026-08-01",endDate:"2026-07-30"})).rejects.toMatchObject({errors:{endDate:expect.any(String)}}); expect(backend.createTrip).not.toHaveBeenCalled(); });
});
describe("OnboardingFlow", () => {
  it("renders English setup paths and keeps join fail-closed", () => { const backend=createBackend(); render(<OnboardingFlow backend={backend} profile={profile} onTripReady={vi.fn()}/>); expect(screen.getByRole("region",{name:"Create a new workspace"})).toBeTruthy(); expect(screen.getByRole("region",{name:"Join by code"})).toBeTruthy(); expect((screen.getByRole("button",{name:"Join by code is not available yet"}) as HTMLButtonElement).disabled).toBe(true); expect(backend.joinTrip).not.toHaveBeenCalled(); });
  it("shows inline validation without writing", async () => { const backend=createBackend(); const actor=userEvent.setup(); render(<OnboardingFlow backend={backend} profile={profile} onTripReady={vi.fn()}/>); await actor.click(screen.getByRole("button",{name:"Create new trip"})); expect(screen.getByLabelText("Trip name").getAttribute("aria-invalid")).toBe("true"); expect(backend.createTrip).not.toHaveBeenCalled(); });
  it("locks creation while pending", async () => { let resolve:((value:TripRecord)=>void)|undefined; const backend=createBackend({createTrip:vi.fn().mockImplementation(()=>new Promise<TripRecord>((r)=>{resolve=r;}))}); const actor=userEvent.setup(); render(<OnboardingFlow backend={backend} profile={profile} onTripReady={vi.fn()}/>); await actor.type(screen.getByLabelText("Trip name"),trip.name); await actor.type(screen.getByLabelText("Destination"),trip.destination); await actor.type(screen.getByLabelText("Start date"),trip.startDate); await actor.type(screen.getByLabelText("End date"),trip.endDate); await actor.click(screen.getByRole("button",{name:"Create new trip"})); expect((screen.getByRole("button",{name:"Creating trip…"}) as HTMLButtonElement).disabled).toBe(true); resolve?.(trip); });
  it("creates a trip and hands it to App", async () => { const backend=createBackend(); const ready=vi.fn(); const actor=userEvent.setup(); render(<OnboardingFlow backend={backend} profile={profile} onTripReady={ready}/>); await actor.type(screen.getByLabelText("Trip name"),trip.name); await actor.type(screen.getByLabelText("Destination"),trip.destination); await actor.type(screen.getByLabelText("Start date"),trip.startDate); await actor.type(screen.getByLabelText("End date"),trip.endDate); await actor.click(screen.getByRole("button",{name:"Create new trip"})); expect(await screen.findByText("Trip created.")).toBeTruthy(); expect(ready).toHaveBeenCalledWith(trip); });
});
