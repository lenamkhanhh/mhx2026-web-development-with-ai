import { useState, type FormEvent } from "react";
import {
  mapAuthError,
  validateLogin,
  validateRegistration,
  type FormErrors,
  type LoginInput,
  type RegistrationInput,
} from "../../auth";
import type {
  AuthenticatedUser,
  TripBackend,
  UserRecord,
} from "../../firebase/contracts";

export type { AuthenticatedUser } from "../../firebase/contracts";

export interface AuthenticatedSession {
  user: AuthenticatedUser;
  profile: UserRecord;
}

export type AuthBackend = Pick<
  TripBackend,
  "login" | "register" | "logout" | "upsertProfile" | "getProfile"
>;

type AuthMode = "login" | "register";
type AuthInput = LoginInput | RegistrationInput;
type AuthFieldErrors = Partial<Record<keyof RegistrationInput, string>>;

export class AuthInputError extends Error {
  constructor(readonly errors: AuthFieldErrors) {
    super("Invalid authentication form input.");
    this.name = "AuthInputError";
  }
}

export async function hydrateProfile(
  backend: AuthBackend,
  user: AuthenticatedUser,
): Promise<UserRecord> {
  const existingProfile = await backend.getProfile(user.uid);
  if (existingProfile) return existingProfile;

  await backend.upsertProfile(user);
  return {
    uid: user.uid,
    email: user.email?.trim() ?? "",
    displayName:
      user.displayName?.trim() || user.email?.trim() || "Người dùng",
    tripIds: [],
  };
}

export async function authenticate(
  backend: AuthBackend,
  mode: AuthMode,
  input: AuthInput,
): Promise<AuthenticatedSession> {
  const errors =
    mode === "login"
      ? validateLogin(input as LoginInput)
      : validateRegistration(input as RegistrationInput);
  if (Object.keys(errors).length > 0) {
    throw new AuthInputError(errors);
  }

  const user =
    mode === "login"
      ? await backend.login(input.email.trim(), input.password)
      : await backend.register(
          input.email.trim(),
          input.password,
          (input as RegistrationInput).displayName.trim(),
        );
  const profile = await hydrateProfile(backend, user);
  return { user, profile };
}

export function logout(backend: Pick<TripBackend, "logout">): Promise<void> {
  return backend.logout();
}

export function AuthFlow({
  backend,
  onAuthenticated,
}: {
  backend: AuthBackend;
  onAuthenticated: (session: AuthenticatedSession) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [input, setInput] = useState<RegistrationInput>({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [requestError, setRequestError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrors({});
    setRequestError("");
    setSuccess("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setRequestError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const session = await authenticate(backend, mode, input);
      setSuccess("Đã đăng nhập thành công.");
      onAuthenticated(session);
    } catch (error) {
      if (error instanceof AuthInputError) {
        setErrors(error.errors);
      } else {
        setRequestError(mapAuthError(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="auth-title" className="auth-card">
      <p className="eyebrow">TripFlow · Group itinerary</p>
      <h1 id="auth-title">
        {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản"}
      </h1>
      <p className="auth-intro">
        Lịch trình, thành viên và chi phí của cả nhóm trong một nơi.
      </p>
      <div
        aria-label="Chọn hình thức xác thực"
        className="auth-tabs"
        role="tablist"
      >
        <button
          aria-selected={mode === "login"}
          onClick={() => switchMode("login")}
          role="tab"
          type="button"
        >
          Đăng nhập
        </button>
        <button
          aria-selected={mode === "register"}
          onClick={() => switchMode("register")}
          role="tab"
          type="button"
        >
          Đăng ký
        </button>
      </div>

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {mode === "register" ? (
          <label>
            Tên hiển thị
            <input
              aria-describedby={errors.displayName ? "display-name-error" : undefined}
              autoComplete="name"
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              value={input.displayName}
            />
            {errors.displayName ? (
              <span className="field-error" id="display-name-error" role="alert">
                {errors.displayName}
              </span>
            ) : null}
          </label>
        ) : null}

        <label>
          Email
          <input
            aria-describedby={errors.email ? "email-error" : undefined}
            autoComplete="email"
            onChange={(event) =>
              setInput((current) => ({ ...current, email: event.target.value }))
            }
            type="email"
            value={input.email}
          />
          {errors.email ? (
            <span className="field-error" id="email-error" role="alert">
              {errors.email}
            </span>
          ) : null}
        </label>

        <label>
          Mật khẩu
          <input
            aria-describedby={errors.password ? "password-error" : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            type="password"
            value={input.password}
          />
          {errors.password ? (
            <span className="field-error" id="password-error" role="alert">
              {errors.password}
            </span>
          ) : null}
        </label>

        {mode === "register" ? (
          <label>
            Xác nhận mật khẩu
            <input
              aria-describedby={
                errors.confirmPassword ? "confirm-password-error" : undefined
              }
              autoComplete="new-password"
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              type="password"
              value={input.confirmPassword}
            />
            {errors.confirmPassword ? (
              <span className="field-error" id="confirm-password-error" role="alert">
                {errors.confirmPassword}
              </span>
            ) : null}
          </label>
        ) : null}

        {requestError ? <p className="auth-message error" role="alert">{requestError}</p> : null}
        {success ? <p className="auth-message success" role="status">{success}</p> : null}
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting
            ? "Đang xử lý…"
            : mode === "login"
              ? "Đăng nhập"
              : "Tạo tài khoản"}
        </button>
      </form>
    </section>
  );
}
