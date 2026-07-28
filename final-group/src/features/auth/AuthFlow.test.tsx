// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "../../types";
import {
  AuthFlow,
  authenticate,
  hydrateProfile,
  type AuthBackend,
} from "./AuthFlow";

const user = {
  uid: "user-1",
  email: "khanh@example.com",
  displayName: "Khánh",
};

function createBackend(overrides: Partial<AuthBackend> = {}): AuthBackend {
  return {
    signIn: vi.fn().mockResolvedValue(user),
    register: vi.fn().mockResolvedValue(user),
    signOut: vi.fn().mockResolvedValue(undefined),
    getProfile: vi.fn().mockResolvedValue(null),
    saveProfile: vi.fn().mockImplementation(
      async (profile: UserProfile) => profile,
    ),
    ...overrides,
  };
}

afterEach(cleanup);

describe("hydrateProfile", () => {
  it("uses the persisted profile when it already exists", async () => {
    const persisted = { ...user, tripIds: ["trip-1"] };
    const backend = createBackend({ getProfile: vi.fn().mockResolvedValue(persisted) });

    await expect(hydrateProfile(backend, user)).resolves.toEqual(persisted);
    expect(backend.saveProfile).not.toHaveBeenCalled();
  });

  it("creates a profile with an empty trip list for a first session", async () => {
    const backend = createBackend();

    await expect(hydrateProfile(backend, user)).resolves.toEqual({
      ...user,
      tripIds: [],
    });
    expect(backend.saveProfile).toHaveBeenCalledWith({ ...user, tripIds: [] });
  });
});

describe("authenticate", () => {
  it("registers, then hydrates the user's profile", async () => {
    const backend = createBackend();

    await expect(
      authenticate(backend, "register", {
        displayName: "Khánh",
        email: user.email,
        password: "TripFlow!2026",
        confirmPassword: "TripFlow!2026",
      }),
    ).resolves.toEqual({ user, profile: { ...user, tripIds: [] } });

    expect(backend.register).toHaveBeenCalledOnce();
    expect(backend.saveProfile).toHaveBeenCalledOnce();
  });

  it("rejects invalid credentials before calling the backend", async () => {
    const backend = createBackend();

    await expect(
      authenticate(backend, "login", { email: "not-an-email", password: "" }),
    ).rejects.toMatchObject({ errors: expect.any(Object) });
    expect(backend.signIn).not.toHaveBeenCalled();
  });
});

describe("AuthFlow", () => {
  it("shows validation errors and does not submit an invalid registration", async () => {
    const backend = createBackend();
    const actor = userEvent.setup();
    render(<AuthFlow backend={backend} onAuthenticated={vi.fn()} />);

    await actor.click(screen.getByRole("button", { name: "Đăng ký" }));
    await actor.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(screen.getByText("Vui lòng nhập tên hiển thị.")).toBeTruthy();
    expect(backend.register).not.toHaveBeenCalled();
  });

  it("logs in and exposes the hydrated profile to App composition", async () => {
    const backend = createBackend();
    const onAuthenticated = vi.fn();
    const actor = userEvent.setup();
    render(<AuthFlow backend={backend} onAuthenticated={onAuthenticated} />);

    await actor.type(screen.getByLabelText("Email"), user.email);
    await actor.type(screen.getByLabelText("Mật khẩu"), "TripFlow!2026");
    await actor.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(await screen.findByText("Đã đăng nhập thành công.")).toBeTruthy();
    expect(onAuthenticated).toHaveBeenCalledWith({
      user,
      profile: { ...user, tripIds: [] },
    });
  });
});
