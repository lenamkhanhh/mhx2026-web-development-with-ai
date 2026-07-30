import { useState, type ChangeEvent, type FormEvent } from "react";
import { mapAuthError, validateLogin, validateRegistration, type LoginInput, type RegistrationInput } from "../../auth";
import type { AuthenticatedUser, TripBackend, UserRecord } from "../../firebase/contracts";
import styles from "./AuthFlow.module.css";

export type { AuthenticatedUser } from "../../firebase/contracts";
export interface AuthenticatedSession { user: AuthenticatedUser; profile: UserRecord; }
export type AuthBackend = Pick<TripBackend, "login" | "register" | "logout" | "upsertProfile" | "getProfile">;
type AuthMode = "login" | "register";
type AuthInput = LoginInput | RegistrationInput;
type AuthFieldErrors = Partial<Record<keyof RegistrationInput, string>>;

export class AuthInputError extends Error {
  constructor(readonly errors: AuthFieldErrors) { super("Invalid authentication form input."); this.name = "AuthInputError"; }
}

export async function hydrateProfile(backend: AuthBackend, user: AuthenticatedUser): Promise<UserRecord> {
  const existingProfile = await backend.getProfile(user.uid);
  if (existingProfile) return existingProfile;
  await backend.upsertProfile(user);
  return { uid: user.uid, email: user.email?.trim() ?? "", displayName: user.displayName?.trim() || user.email?.trim() || "User", tripIds: [] };
}

export async function authenticate(backend: AuthBackend, mode: AuthMode, input: AuthInput): Promise<AuthenticatedSession> {
  const errors = mode === "login" ? validateLogin(input as LoginInput) : validateRegistration(input as RegistrationInput);
  if (Object.keys(errors).length > 0) throw new AuthInputError(errors);
  const user = mode === "login"
    ? await backend.login(input.email.trim(), input.password)
    : await backend.register(input.email.trim(), input.password, (input as RegistrationInput).displayName.trim());
  return { user, profile: await hydrateProfile(backend, user) };
}

export function logout(backend: Pick<TripBackend, "logout">): Promise<void> { return backend.logout(); }

export function AuthFlow({ backend, onAuthenticated }: { backend: AuthBackend; onAuthenticated: (session: AuthenticatedSession) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [input, setInput] = useState<RegistrationInput>({ displayName: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [requestError, setRequestError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isLogin = mode === "login";
  const fieldProps = (error: string | undefined, errorId: string) => ({ "aria-describedby": error ? errorId : undefined, "aria-invalid": Boolean(error) });
  const switchMode = (nextMode: AuthMode) => { if (submitting) return; setMode(nextMode); setErrors({}); setRequestError(""); setSuccess(""); setPasswordVisible(false); };
  const update = (key: keyof RegistrationInput) => (event: ChangeEvent<HTMLInputElement>) => setInput((current) => ({ ...current, [key]: event.target.value }));
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting) return;
    setErrors({}); setRequestError(""); setSuccess(""); setSubmitting(true);
    try { const session = await authenticate(backend, mode, input); setSuccess("Signed in successfully."); onAuthenticated(session); }
    catch (error) { if (error instanceof AuthInputError) setErrors(error.errors); else setRequestError(mapAuthError(error)); }
    finally { setSubmitting(false); }
  }
  const submitLabel = submitting ? (isLogin ? "Logging in…" : "Creating account…") : (isLogin ? "Log in" : "Create account");
  const passwordLabel = passwordVisible ? "Hide password" : "Show password";
  return <section aria-labelledby="auth-title" className={styles.workbench} data-motion="calm" data-ui-system="light-workbench" data-testid="auth-workbench">
    <div aria-hidden="true" className={styles.grid} />
    <div className={styles.story}>
      <p className={styles.storyKicker}>TRIPFLOW / WORKBENCH</p>
      <h2>Plan and operate trips with clarity</h2>
      <p className={styles.storyIntro}>TripFlow Workbench gives every trip group one calm place to plan, assign work, follow progress, and control shared spending.</p>
      <p className={styles.storyLabel}>TRIP WORKFLOW</p>
      <ol className={styles.process}>
        <li><strong>01</strong><span><b>Plan</b><small>Build the detailed itinerary</small></span></li>
        <li><strong>02</strong><span><b>Assign</b><small>Give members work and context</small></span></li>
        <li><strong>03</strong><span><b>Track</b><small>Follow confirmed progress in real time</small></span></li>
        <li><strong>04</strong><span><b>Settle</b><small>Review shared costs and close out</small></span></li>
      </ol>
      <ul className={styles.features}>
        <li><b>One shared workspace</b><span>Trips, tasks, members, and expenses in one place.</span></li>
        <li><b>Clear ownership</b><span>Every proposal and responsibility has visible status.</span></li>
        <li><b>Live snapshots</b><span>Fresh data shows the team what is confirmed.</span></li>
      </ul>
    </div>
    <article className={styles.card}>
      <header className={styles.header}><p className={styles.kicker}>TRIPFLOW WORKBENCH</p><h1 id="auth-title">{isLogin ? "Welcome back" : "Create your trip workspace"}</h1><p className={styles.intro}>A calm operating rhythm for planning, assigning, and tracking shared travel.</p></header>
      <div aria-label="Choose authentication method" className={styles.tabs} role="tablist">
        <button aria-selected={isLogin} className={isLogin ? styles.activeTab : undefined} disabled={submitting} onClick={() => switchMode("login")} role="tab" type="button">Log in</button>
        <button aria-selected={!isLogin} className={!isLogin ? styles.activeTab : undefined} disabled={submitting} onClick={() => switchMode("register")} role="tab" type="button">Create account</button>
      </div>
      <form aria-busy={submitting} className={styles.form} noValidate onSubmit={onSubmit}>
        {!isLogin ? <label className={styles.field}><span>Display name</span><input {...fieldProps(errors.displayName, "display-name-error")} aria-label="Display name" autoComplete="name" disabled={submitting} onChange={update("displayName")} value={input.displayName} />{errors.displayName ? <span className={styles.fieldError} id="display-name-error" role="alert">{errors.displayName}</span> : null}</label> : null}
        <label className={styles.field}><span>Email</span><input {...fieldProps(errors.email, "email-error")} autoComplete="email" disabled={submitting} onChange={update("email")} type="email" value={input.email} />{errors.email ? <span className={styles.fieldError} id="email-error" role="alert">{errors.email}</span> : null}</label>
        <label className={styles.field}><span>Password</span><div className={styles.passwordControl}><input {...fieldProps(errors.password, "password-error")} aria-label="Password" autoComplete={isLogin ? "current-password" : "new-password"} disabled={submitting} onChange={update("password")} type={passwordVisible ? "text" : "password"} value={input.password} /><button aria-label={passwordLabel} disabled={submitting} onClick={() => setPasswordVisible((current) => !current)} type="button">{passwordVisible ? "Hide" : "Show"}</button></div>{errors.password ? <span className={styles.fieldError} id="password-error" role="alert">{errors.password}</span> : null}</label>
        {!isLogin ? <label className={styles.field}><span>Confirm password</span><div className={styles.passwordControl}><input {...fieldProps(errors.confirmPassword, "confirm-password-error")} aria-label="Confirm password" autoComplete="new-password" disabled={submitting} onChange={update("confirmPassword")} type={passwordVisible ? "text" : "password"} value={input.confirmPassword} /><button aria-label={passwordLabel} disabled={submitting} onClick={() => setPasswordVisible((current) => !current)} type="button">{passwordVisible ? "Hide" : "Show"}</button></div>{errors.confirmPassword ? <span className={styles.fieldError} id="confirm-password-error" role="alert">{errors.confirmPassword}</span> : null}</label> : null}
        {requestError ? <p className={styles.errorNotice} role="alert">{requestError}</p> : null}{success ? <p className={styles.successNotice} role="status">{success}</p> : null}
        <button className={styles.primaryAction} disabled={submitting} type="submit">{submitLabel}</button>
      </form>
    </article>
  </section>;
}
