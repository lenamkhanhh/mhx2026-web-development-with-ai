import { describe, expect, it } from "vitest";
import {
  mapAuthError,
  validateLogin,
  validateRegistration,
} from "./auth";

describe("validateRegistration", () => {
  it("accepts a complete account with a strong password", () => {
    expect(
      validateRegistration({
        displayName: "Lê Nam Khánh",
        email: "khanh@example.com",
        password: "TripFlow!2026",
        confirmPassword: "TripFlow!2026",
      }),
    ).toEqual({});
  });

  it("rejects invalid email, weak password and mismatched confirmation", () => {
    expect(
      validateRegistration({
        displayName: "",
        email: "invalid",
        password: "password",
        confirmPassword: "different",
      }),
    ).toEqual({
      displayName: "Vui lòng nhập tên hiển thị.",
      email: "Email không đúng định dạng.",
      password:
        "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và ký tự đặc biệt.",
      confirmPassword: "Mật khẩu xác nhận không trùng khớp.",
    });
  });
});

describe("validateLogin", () => {
  it("requires a valid email and non-empty password", () => {
    expect(validateLogin({ email: "invalid", password: "" })).toEqual({
      email: "Email không đúng định dạng.",
      password: "Vui lòng nhập mật khẩu.",
    });
  });
});

describe("mapAuthError", () => {
  it("maps Firebase errors to safe Vietnamese messages", () => {
    expect(mapAuthError({ code: "auth/invalid-credential" })).toBe(
      "Email hoặc mật khẩu không chính xác.",
    );
    expect(mapAuthError(new Error("secret internal detail"))).toBe(
      "Không thể xác thực. Vui lòng thử lại.",
    );
  });
});
