// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TripBackend } from "../../firebase/contracts";
import { AuthFlow, authenticate, hydrateProfile, logout } from "./AuthFlow";

const user = { uid: "user-1", email: "khanh@example.com", displayName: "Khanh" };
type AuthBackend = Pick<TripBackend, "login" | "register" | "logout" | "getProfile" | "upsertProfile">;
function createBackend(overrides: Partial<AuthBackend> = {}): AuthBackend {
  return { login: vi.fn().mockResolvedValue(user), register: vi.fn().mockResolvedValue(user), logout: vi.fn().mockResolvedValue(undefined), getProfile: vi.fn().mockResolvedValue(null), upsertProfile: vi.fn().mockResolvedValue(undefined), ...overrides };
}
afterEach(cleanup);

describe("hydrateProfile", () => {
  it("uses the persisted profile when it already exists", async () => {
    const persisted = { ...user, tripIds: ["trip-1"] };
    const backend = createBackend({ getProfile: vi.fn().mockResolvedValue(persisted) });
    await expect(hydrateProfile(backend, user)).resolves.toEqual(persisted);
    expect(backend.upsertProfile).not.toHaveBeenCalled();
  });
  it("creates a profile with an empty trip list for a first session", async () => {
    const backend = createBackend();
    await expect(hydrateProfile(backend, user)).resolves.toEqual({ ...user, tripIds: [] });
    expect(backend.upsertProfile).toHaveBeenCalledWith(user);
  });
});

describe("authenticate", () => {
  it("registers, then hydrates the user's profile", async () => {
    const backend = createBackend();
    await expect(authenticate(backend, "register", { displayName: "Khanh", email: user.email, password: "TripFlow!2026", confirmPassword: "TripFlow!2026" })).resolves.toEqual({ user, profile: { ...user, tripIds: [] } });
    expect(backend.register).toHaveBeenCalledOnce();
    expect(backend.upsertProfile).toHaveBeenCalledOnce();
  });
  it("rejects invalid credentials before calling the backend", async () => {
    const backend = createBackend();
    await expect(authenticate(backend, "login", { email: "not-an-email", password: "" })).rejects.toMatchObject({ errors: expect.any(Object) });
    expect(backend.login).not.toHaveBeenCalled();
  });
});
describe("logout", () => { it("delegates logout to the injected TripBackend", async () => { const backend = createBackend(); await logout(backend); expect(backend.logout).toHaveBeenCalledOnce(); }); });

describe("AuthFlow", () => {
  it("renders the workbench shell with accessible English auth tabs", () => {
    render(<AuthFlow backend={createBackend()} onAuthenticated={vi.fn()} />);
    expect(screen.getByTestId("auth-workbench").getAttribute("data-motion")).toBe("calm");
    expect(screen.getByText("TRIPFLOW WORKBENCH")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Log in" }).getAttribute("aria-selected")).toBe("true");
  });
  it("opens an explicitly supplied interactive demo without submitting credentials", async () => {
    const actor = userEvent.setup(); const onOpenDemo = vi.fn(); const backend = createBackend();
    render(<AuthFlow backend={backend} onAuthenticated={vi.fn()} onOpenDemo={onOpenDemo} />);
    await actor.click(screen.getByRole("button", { name: "Explore interactive demo" }));
    expect(onOpenDemo).toHaveBeenCalledOnce();
    expect(backend.login).not.toHaveBeenCalled();
    expect(backend.register).not.toHaveBeenCalled();
  });
  it("reveals and hides passwords without changing their values", async () => {
    const actor = userEvent.setup(); render(<AuthFlow backend={createBackend()} onAuthenticated={vi.fn()} />);
    const password = screen.getByLabelText("Password") as HTMLInputElement;
    await actor.type(password, "TripFlow!2026"); expect(password.type).toBe("password");
    await actor.click(screen.getByRole("button", { name: "Show password" })); expect(password.type).toBe("text");
    await actor.click(screen.getByRole("button", { name: "Hide password" })); expect(password.type).toBe("password");
  });
  it("shows English validation and does not submit an invalid registration", async () => {
    const backend = createBackend(); const actor = userEvent.setup(); render(<AuthFlow backend={backend} onAuthenticated={vi.fn()} />);
    await actor.click(screen.getByRole("tab", { name: "Create account" })); await actor.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Enter a display name.")).toBeTruthy(); expect(screen.getByLabelText("Display name").getAttribute("aria-invalid")).toBe("true"); expect(backend.register).not.toHaveBeenCalled();
  });
  it("locks both tabs and exposes a pending label while authentication is in flight", async () => {
    let resolveLogin: ((value: typeof user) => void) | undefined;
    const backend = createBackend({ login: vi.fn().mockImplementation(() => new Promise<typeof user>((resolve) => { resolveLogin = resolve; })) });
    const actor = userEvent.setup(); render(<AuthFlow backend={backend} onAuthenticated={vi.fn()} />);
    await actor.type(screen.getByLabelText("Email"), user.email); await actor.type(screen.getByLabelText("Password"), "TripFlow!2026"); await actor.click(screen.getByRole("button", { name: "Log in" }));
    expect((screen.getByRole("button", { name: "Logging in…" }) as HTMLButtonElement).disabled).toBe(true); expect((screen.getByRole("tab", { name: "Create account" }) as HTMLButtonElement).disabled).toBe(true); resolveLogin?.(user);
  });
  it("keeps backend details private while showing a mapped inline auth error", async () => {
    const backend = createBackend({ login: vi.fn().mockRejectedValue({ code: "auth/network-request-failed" }) }); const actor = userEvent.setup(); render(<AuthFlow backend={backend} onAuthenticated={vi.fn()} />);
    await actor.type(screen.getByLabelText("Email"), user.email); await actor.type(screen.getByLabelText("Password"), "TripFlow!2026"); await actor.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Could not connect to Firebase. Check your network.")).toBeTruthy();
  });
  it("logs in and exposes the hydrated profile to App composition", async () => {
    const backend = createBackend(); const onAuthenticated = vi.fn(); const actor = userEvent.setup(); render(<AuthFlow backend={backend} onAuthenticated={onAuthenticated} />);
    await actor.type(screen.getByLabelText("Email"), user.email); await actor.type(screen.getByLabelText("Password"), "TripFlow!2026"); await actor.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Signed in successfully.")).toBeTruthy(); expect(onAuthenticated).toHaveBeenCalledWith({ user, profile: { ...user, tripIds: [] } });
  });
});
