import { useState, type FormEvent } from "react";
import {
  mapAuthError,
  validateLogin,
  validateRegistration,
  type LoginInput,
  type RegistrationInput,
} from "../../auth";
import type {
  AuthenticatedUser,
  TripBackend,
  UserRecord,
} from "../../firebase/contracts";
import styles from "./AuthFlow.module.css";

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

// Kept beside the form so its tested validation contract stays local.
// eslint-disable-next-line react-refresh/only-export-components
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
    if (submitting) return;
    setMode(nextMode);
    setErrors({});
    setRequestError("");
    setSuccess("");
  }

  function fieldProps(error: string | undefined, errorId: string) {
    return {
      "aria-describedby": error ? errorId : undefined,
      "aria-invalid": Boolean(error),
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

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

  const isLogin = mode === "login";
  const submitLabel = submitting
    ? isLogin
      ? "Đang đăng nhập…"
      : "Đang tạo tài khoản…"
    : isLogin
      ? "Đăng nhập"
      : "Tạo tài khoản";

  return (
    <section
      aria-labelledby="auth-title"
      className={styles.workbench}
      data-motion="calm"
      data-testid="auth-workbench"
    >
      <div aria-hidden="true" className={styles.grid} />
      <article className={styles.card}>
        <header className={styles.header}>
          <p className={styles.kicker}>TRIPFLOW WORKBENCH</p>
          <h1 id="auth-title">
            {isLogin ? "Chào mừng trở lại" : "Tạo không gian chuyến đi"}
          </h1>
          <p className={styles.intro}>
            Một nhịp làm việc bình tĩnh để cả nhóm lên lịch, phân công và theo dõi chi phí.
          </p>
        </header>

        <div aria-label="Chọn hình thức xác thực" className={styles.tabs} role="tablist">
          <button
            aria-selected={isLogin}
            className={isLogin ? styles.activeTab : undefined}
            disabled={submitting}
            onClick={() => switchMode("login")}
            role="tab"
            type="button"
          >
            Đăng nhập
          </button>
          <button
            aria-selected={!isLogin}
            className={!isLogin ? styles.activeTab : undefined}
            disabled={submitting}
            onClick={() => switchMode("register")}
            role="tab"
            type="button"
          >
            Đăng ký
          </button>
        </div>

        <form aria-busy={submitting} className={styles.form} noValidate onSubmit={onSubmit}>
          {!isLogin ? (
            <label className={styles.field}>
              <span>Tên hiển thị</span>
              <input
                {...fieldProps(errors.displayName, "display-name-error")}
                aria-label="Tên hiển thị" autoComplete="name"
                disabled={submitting}
                onChange={(event) =>
                  setInput((current) => ({ ...current, displayName: event.target.value }))
                }
                value={input.displayName}
              />
              {errors.displayName ? (
                <span className={styles.fieldError} id="display-name-error" role="alert">
                  {errors.displayName}
                </span>
              ) : null}
            </label>
          ) : null}

          <label className={styles.field}>
            <span>Email</span>
            <input
              {...fieldProps(errors.email, "email-error")}
              autoComplete="email"
              disabled={submitting}
              onChange={(event) =>
                setInput((current) => ({ ...current, email: event.target.value }))
              }
              type="email"
              value={input.email}
            />
            {errors.email ? (
              <span className={styles.fieldError} id="email-error" role="alert">
                {errors.email}
              </span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span>Mật khẩu</span>
            <input
              {...fieldProps(errors.password, "password-error")}
              autoComplete={isLogin ? "current-password" : "new-password"}
              disabled={submitting}
              onChange={(event) =>
                setInput((current) => ({ ...current, password: event.target.value }))
              }
              type="password"
              value={input.password}
            />
            {errors.password ? (
              <span className={styles.fieldError} id="password-error" role="alert">
                {errors.password}
              </span>
            ) : null}
          </label>

          {!isLogin ? (
            <label className={styles.field}>
              <span>Xác nhận mật khẩu</span>
              <input
                {...fieldProps(errors.confirmPassword, "confirm-password-error")}
                autoComplete="new-password"
                disabled={submitting}
                onChange={(event) =>
                  setInput((current) => ({ ...current, confirmPassword: event.target.value }))
                }
                type="password"
                value={input.confirmPassword}
              />
              {errors.confirmPassword ? (
                <span className={styles.fieldError} id="confirm-password-error" role="alert">
                  {errors.confirmPassword}
                </span>
              ) : null}
            </label>
          ) : null}

          {requestError ? <p className={styles.errorNotice} role="alert">{requestError}</p> : null}
          {success ? <p className={styles.successNotice} role="status">{success}</p> : null}
          <button className={styles.primaryAction} disabled={submitting} type="submit">
            {submitLabel}
          </button>
        </form>
      </article>
    </section>
  );
}
