import { useState, type FormEvent } from "react";
import type {
  TripBackend,
  TripRecord,
  UserRecord,
} from "../../firebase/contracts";
import styles from "./OnboardingFlow.module.css";

export interface TripDraft {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
}

export type OnboardingBackend = Pick<TripBackend, "createTrip" | "joinTrip">;

type OnboardingMode = "create" | "join";
type FieldErrors = Partial<Record<keyof TripDraft | "joinCode", string>>;

// Kept beside the form so its tested validation contract stays local.
// eslint-disable-next-line react-refresh/only-export-components
export class OnboardingInputError extends Error {
  constructor(readonly errors: FieldErrors) {
    super("Invalid onboarding input.");
    this.name = "OnboardingInputError";
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeJoinCode(value: string): string {
  return value.trim().toUpperCase();
}

export function validateTripDraft(draft: TripDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.name.trim()) errors.name = "Vui lòng nhập tên chuyến đi.";
  if (!draft.destination.trim()) errors.destination = "Vui lòng nhập điểm đến.";
  if (!DATE_PATTERN.test(draft.startDate)) {
    errors.startDate = "Vui lòng chọn ngày bắt đầu hợp lệ.";
  }
  if (!DATE_PATTERN.test(draft.endDate)) {
    errors.endDate = "Vui lòng chọn ngày kết thúc hợp lệ.";
  }
  if (
    DATE_PATTERN.test(draft.startDate) &&
    DATE_PATTERN.test(draft.endDate) &&
    draft.endDate < draft.startDate
  ) {
    errors.endDate = "Ngày kết thúc không được trước ngày bắt đầu.";
  }
  return errors;
}

export async function submitNewTrip(
  backend: OnboardingBackend,
  profile: UserRecord,
  draft: TripDraft,
): Promise<TripRecord> {
  const errors = validateTripDraft(draft);
  if (Object.keys(errors).length > 0) throw new OnboardingInputError(errors);

  return backend.createTrip(
    {
      name: draft.name.trim(),
      destination: draft.destination.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
    },
    profile,
  );
}

export async function joinTrip(
  backend: OnboardingBackend,
  profile: UserRecord,
  rawJoinCode: string,
): Promise<TripRecord> {
  const joinCode = normalizeJoinCode(rawJoinCode);
  if (!joinCode) {
    throw new OnboardingInputError({
      joinCode: "Vui lòng nhập mã tham gia.",
    });
  }

  return backend.joinTrip(joinCode, profile);
}

export function OnboardingFlow({
  backend,
  profile,
  onTripReady,
}: {
  backend: OnboardingBackend;
  profile: UserRecord;
  onTripReady: (trip: TripRecord) => void;
}) {
  const [mode, setMode] = useState<OnboardingMode>("create");
  const [draft, setDraft] = useState<TripDraft>({
    name: "",
    destination: "",
    startDate: "",
    endDate: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function switchMode(nextMode: OnboardingMode) {
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
    if (submitting || mode !== "create") return;
    setErrors({});
    setRequestError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const trip = await submitNewTrip(backend, profile, draft);
      setSuccess("Đã tạo chuyến đi.");
      onTripReady(trip);
    } catch (error) {
      if (error instanceof OnboardingInputError) {
        setErrors(error.errors);
      } else {
        setRequestError("Không thể lưu chuyến đi. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isCreate = mode === "create";
  return (
    <section aria-labelledby="onboarding-title" className={styles.workbench} data-motion="calm" data-testid="onboarding-workbench">
      <div aria-hidden="true" className={styles.grid} />
      <article className={styles.card}>
        <header className={styles.header}>
          <p className={styles.kicker}>TRIP SETUP / 01</p>
          <h1 id="onboarding-title">Bắt đầu một chuyến đi</h1>
          <p className={styles.intro}>Chào {profile.displayName}. Tạo không gian chung trước, rồi thêm lịch trình và thành viên sau.</p>
        </header>

        <div aria-label="Chọn thao tác chuyến đi" className={styles.tabs} role="tablist">
          <button aria-selected={isCreate} className={isCreate ? styles.activeTab : undefined} disabled={submitting} onClick={() => switchMode("create")} role="tab" type="button">Tạo chuyến đi</button>
          <button aria-selected={!isCreate} className={!isCreate ? styles.activeTab : undefined} disabled={submitting} onClick={() => switchMode("join")} role="tab" type="button">Tham gia chuyến đi</button>
        </div>

        {isCreate ? (
          <form aria-busy={submitting} className={styles.form} noValidate onSubmit={onSubmit}>
            <div className={styles.formHeading}><p>CHUYẾN ĐI MỚI</p><span>Thông tin này sẽ là điểm bắt đầu của workbench.</span></div>
            <label className={styles.field}>
              <span>Tên chuyến đi</span>
              <input aria-label="Tên chuyến đi" {...fieldProps(errors.name, "trip-name-error")} disabled={submitting} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} value={draft.name} />
              {errors.name ? <span className={styles.fieldError} id="trip-name-error" role="alert">{errors.name}</span> : null}
            </label>
            <label className={styles.field}>
              <span>Điểm đến</span>
              <input aria-label="Điểm đến" {...fieldProps(errors.destination, "destination-error")} disabled={submitting} onChange={(event) => setDraft((current) => ({ ...current, destination: event.target.value }))} value={draft.destination} />
              {errors.destination ? <span className={styles.fieldError} id="destination-error" role="alert">{errors.destination}</span> : null}
            </label>
            <div className={styles.dateGrid}>
              <label className={styles.field}>
                <span>Ngày bắt đầu</span>
                <input aria-label="Ngày bắt đầu" {...fieldProps(errors.startDate, "start-date-error")} disabled={submitting} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} type="date" value={draft.startDate} />
                {errors.startDate ? <span className={styles.fieldError} id="start-date-error" role="alert">{errors.startDate}</span> : null}
              </label>
              <label className={styles.field}>
                <span>Ngày kết thúc</span>
                <input aria-label="Ngày kết thúc" {...fieldProps(errors.endDate, "end-date-error")} disabled={submitting} onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))} type="date" value={draft.endDate} />
                {errors.endDate ? <span className={styles.fieldError} id="end-date-error" role="alert">{errors.endDate}</span> : null}
              </label>
            </div>
            {requestError ? <p className={styles.errorNotice} role="alert">{requestError}</p> : null}
            {success ? <p className={styles.successNotice} role="status">{success}</p> : null}
            <button className={styles.primaryAction} disabled={submitting} type="submit">{submitting ? "Đang tạo chuyến đi…" : "Tạo chuyến đi mới"}</button>
          </form>
        ) : (
          <section aria-label="Trạng thái tham gia bằng mã" className={styles.lockedJoin}>
            <p className={styles.lockedKicker}>JOIN BY CODE / LOCKED</p>
            <h2>Chưa mở đường đi tắt</h2>
            <p>Tham gia bằng mã chưa được mở vì chưa có cơ chế xác minh an toàn.</p>
            <label className={styles.field}><span>Mã tham gia</span><input disabled placeholder="Sẽ khả dụng sau khi server-proof được phê duyệt" /></label>
            <button className={styles.lockedAction} disabled type="button">Chưa thể tham gia bằng mã</button>
          </section>
        )}
      </article>
    </section>
  );
}
