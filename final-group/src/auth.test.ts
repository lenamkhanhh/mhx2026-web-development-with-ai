import { describe, expect, it } from "vitest";
import { mapAuthError, validateLogin, validateRegistration } from "./auth";

describe("validateRegistration", () => {
  it("accepts a complete account with a strong password", () => {
    expect(validateRegistration({ displayName: "Khanh", email: "khanh@example.com", password: "TripFlow!2026", confirmPassword: "TripFlow!2026" })).toEqual({});
  });

  it("returns concise English inline validation messages", () => {
    expect(validateRegistration({ displayName: "", email: "invalid", password: "password", confirmPassword: "different" })).toEqual({
      displayName: "Enter a display name.",
      email: "Enter a valid email address.",
      password: "Use at least 8 characters with upper- and lower-case letters plus a special character.",
      confirmPassword: "Passwords do not match.",
    });
  });
});

describe("validateLogin", () => {
  it("requires a valid email and non-empty password", () => {
    expect(validateLogin({ email: "invalid", password: "" })).toEqual({
      email: "Enter a valid email address.",
      password: "Enter your password.",
    });
  });
});

describe("mapAuthError", () => {
  it("maps Firebase errors to safe English messages", () => {
    expect(mapAuthError({ code: "auth/invalid-credential" })).toBe("Email or password is incorrect.");
    expect(mapAuthError(new Error("secret internal detail"))).toBe("Authentication failed. Try again.");
  });
});
