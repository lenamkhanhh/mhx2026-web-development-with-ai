import { useState, type ChangeEvent, type FormEvent } from "react";
import type { TripBackend, TripRecord, UserRecord } from "../../firebase/contracts";
import styles from "./OnboardingFlow.module.css";

export interface TripDraft { name: string; destination: string; startDate: string; endDate: string; }
export type OnboardingBackend = Pick<TripBackend, "createTrip" | "joinTrip">;
type FieldErrors = Partial<Record<keyof TripDraft | "joinCode", string>>;
export class OnboardingInputError extends Error { constructor(readonly errors: FieldErrors) { super("Invalid onboarding input."); this.name = "OnboardingInputError"; } }
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export function normalizeJoinCode(value: string): string { return value.trim().toUpperCase(); }
export function validateTripDraft(draft: TripDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.name.trim()) errors.name = "Enter a trip name.";
  if (!draft.destination.trim()) errors.destination = "Enter a destination.";
  if (!DATE_PATTERN.test(draft.startDate)) errors.startDate = "Choose a valid start date.";
  if (!DATE_PATTERN.test(draft.endDate)) errors.endDate = "Choose a valid end date.";
  if (DATE_PATTERN.test(draft.startDate) && DATE_PATTERN.test(draft.endDate) && draft.endDate < draft.startDate) errors.endDate = "End date cannot be before start date.";
  return errors;
}
export async function submitNewTrip(backend: OnboardingBackend, profile: UserRecord, draft: TripDraft): Promise<TripRecord> {
  const errors = validateTripDraft(draft); if (Object.keys(errors).length > 0) throw new OnboardingInputError(errors);
  return backend.createTrip({ name: draft.name.trim(), destination: draft.destination.trim(), startDate: draft.startDate, endDate: draft.endDate }, profile);
}
export async function joinTrip(backend: OnboardingBackend, profile: UserRecord, rawJoinCode: string): Promise<TripRecord> {
  const joinCode = normalizeJoinCode(rawJoinCode); if (!joinCode) throw new OnboardingInputError({ joinCode: "Enter a join code." }); return backend.joinTrip(joinCode, profile);
}
export function OnboardingFlow({ backend, profile, onTripReady }: { backend: OnboardingBackend; profile: UserRecord; onTripReady: (trip: TripRecord) => void }) {
  const [draft, setDraft] = useState<TripDraft>({ name: "", destination: "", startDate: "", endDate: "" });
  const [errors, setErrors] = useState<FieldErrors>({}); const [requestError, setRequestError] = useState(""); const [success, setSuccess] = useState(""); const [submitting, setSubmitting] = useState(false);
  const fieldProps = (error: string | undefined, errorId: string) => ({ "aria-describedby": error ? errorId : undefined, "aria-invalid": Boolean(error) });
  const update = (key: keyof TripDraft) => (event: ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (submitting) return; setErrors({}); setRequestError(""); setSuccess(""); setSubmitting(true); try { const trip = await submitNewTrip(backend, profile, draft); setSuccess("Trip created."); onTripReady(trip); } catch (error) { if (error instanceof OnboardingInputError) setErrors(error.errors); else setRequestError("Could not save this trip. Try again."); } finally { setSubmitting(false); } }
  return <section aria-labelledby="onboarding-title" className={styles.workbench} data-motion="calm" data-testid="onboarding-workbench" data-ui-system="light-workbench"><div aria-hidden="true" className={styles.grid} /><article className={styles.card}>
    <header className={styles.header}><p className={styles.kicker}>TRIP SETUP / 01</p><h1 id="onboarding-title">Start a new trip</h1><p className={styles.intro}>Welcome, {profile.displayName}. Create the shared workspace first, then add the timeline and members.</p></header>
    <div className={styles.pathGrid}><section aria-label="Create a new workspace" className={styles.createPath}><form aria-busy={submitting} className={styles.form} noValidate onSubmit={onSubmit}>
      <div className={styles.formHeading}><p>NEW TRIP</p><span>This information becomes the starting point for the workbench.</span></div>
      <label className={styles.field}><span>Trip name</span><input aria-label="Trip name" {...fieldProps(errors.name, "trip-name-error")} disabled={submitting} onChange={update("name")} value={draft.name} />{errors.name ? <span className={styles.fieldError} id="trip-name-error" role="alert">{errors.name}</span> : null}</label>
      <label className={styles.field}><span>Destination</span><input aria-label="Destination" {...fieldProps(errors.destination, "destination-error")} disabled={submitting} onChange={update("destination")} value={draft.destination} />{errors.destination ? <span className={styles.fieldError} id="destination-error" role="alert">{errors.destination}</span> : null}</label>
      <div className={styles.dateGrid}><label className={styles.field}><span>Start date</span><input aria-label="Start date" {...fieldProps(errors.startDate, "start-date-error")} disabled={submitting} onChange={update("startDate")} type="date" value={draft.startDate} />{errors.startDate ? <span className={styles.fieldError} id="start-date-error" role="alert">{errors.startDate}</span> : null}</label><label className={styles.field}><span>End date</span><input aria-label="End date" {...fieldProps(errors.endDate, "end-date-error")} disabled={submitting} onChange={update("endDate")} type="date" value={draft.endDate} />{errors.endDate ? <span className={styles.fieldError} id="end-date-error" role="alert">{errors.endDate}</span> : null}</label></div>
      {requestError ? <p className={styles.errorNotice} role="alert">{requestError}</p> : null}{success ? <p className={styles.successNotice} role="status">{success}</p> : null}<button className={styles.primaryAction} disabled={submitting} type="submit">{submitting ? "Creating trip…" : "Create new trip"}</button>
    </form></section><section aria-label="Join by code" className={styles.lockedJoin}><p className={styles.lockedKicker}>JOIN BY CODE / LOCKED</p><h2>No shortcut is open</h2><p>Joining by code remains unavailable until a secure server-verification path is approved.</p><label className={styles.field}><span>Join code</span><input disabled placeholder="Available after server proof is approved" /></label><button className={styles.lockedAction} disabled type="button">Join by code is not available yet</button></section></div>
    <ol aria-label="Getting started steps" className={styles.processStrip}><li><strong>01</strong><span><b>Create / Join</b><small>Create a new trip or join by code.</small></span></li><li><strong>02</strong><span><b>Add members</b><small>Invite members and assign roles.</small></span></li><li><strong>03</strong><span><b>Build timeline</b><small>Plan items, expenses, and work.</small></span></li></ol>
  </article></section>;
}
