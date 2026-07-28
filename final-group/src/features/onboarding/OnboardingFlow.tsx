import { useState, type FormEvent } from "react";
import type {
  TripBackend,
  TripRecord,
  UserRecord,
} from "../../firebase/contracts";

export interface TripDraft {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
}

export type OnboardingBackend = Pick<TripBackend, "createTrip" | "joinTrip">;

type OnboardingMode = "create" | "join";
type FieldErrors = Partial<Record<keyof TripDraft | "joinCode", string>>;

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
  const [joinCode, setJoinCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function switchMode(nextMode: OnboardingMode) {
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
      const trip =
        mode === "create"
          ? await submitNewTrip(backend, profile, draft)
          : await joinTrip(backend, profile, joinCode);
      setSuccess(mode === "create" ? "Đã tạo chuyến đi." : "Đã tham gia chuyến đi.");
      onTripReady(trip);
    } catch (error) {
      if (error instanceof OnboardingInputError) {
        setErrors(error.errors);
      } else {
        setRequestError(
          mode === "join"
            ? "Tham gia bằng mã chưa khả dụng vì chưa có cơ chế xác minh an toàn."
            : "Không thể lưu chuyến đi. Vui lòng thử lại.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="onboarding-title">
      <p>Chào {profile.displayName}</p>
      <h1 id="onboarding-title">Bắt đầu một chuyến đi</h1>
      <div aria-label="Chọn thao tác chuyến đi" role="tablist">
        <button
          aria-selected={mode === "create"}
          onClick={() => switchMode("create")}
          role="tab"
          type="button"
        >
          Tạo chuyến đi
        </button>
        <button
          aria-selected={mode === "join"}
          onClick={() => switchMode("join")}
          role="tab"
          type="button"
        >
          Tham gia chuyến đi
        </button>
      </div>

      <form onSubmit={onSubmit} noValidate>
        {mode === "create" ? (
          <>
            <label>
              Tên chuyến đi
              <input
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                value={draft.name}
              />
              {errors.name ? <span role="alert">{errors.name}</span> : null}
            </label>
            <label>
              Điểm đến
              <input
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    destination: event.target.value,
                  }))
                }
                value={draft.destination}
              />
              {errors.destination ? (
                <span role="alert">{errors.destination}</span>
              ) : null}
            </label>
            <label>
              Ngày bắt đầu
              <input
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                type="date"
                value={draft.startDate}
              />
              {errors.startDate ? (
                <span role="alert">{errors.startDate}</span>
              ) : null}
            </label>
            <label>
              Ngày kết thúc
              <input
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
                type="date"
                value={draft.endDate}
              />
              {errors.endDate ? <span role="alert">{errors.endDate}</span> : null}
            </label>
          </>
        ) : (
          <label>
            Mã tham gia
            <input
              onChange={(event) => setJoinCode(event.target.value)}
              value={joinCode}
            />
            {errors.joinCode ? <span role="alert">{errors.joinCode}</span> : null}
          </label>
        )}

        {requestError ? <p role="alert">{requestError}</p> : null}
        {success ? <p role="status">{success}</p> : null}
        <button disabled={submitting} type="submit">
          {submitting
            ? "Đang lưu…"
            : mode === "create"
              ? "Tạo chuyến đi"
              : "Tham gia bằng mã"}
        </button>
      </form>
    </section>
  );
}
