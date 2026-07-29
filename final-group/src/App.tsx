import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AuthFlow, type AuthenticatedSession } from "./features/auth/AuthFlow";
import { EventFeature } from "./features/events/events";
import { ExpenseFeature, ExpensesPanel } from "./features/expenses";
import { MembersFeature } from "./features/members/members";
import { MembersPanel } from "./features/members/MembersPanel";
import { WorkbenchShell, type WorkbenchView } from "./components/WorkbenchShell";
import { WorkbenchOverview } from "./components/WorkbenchOverview";
import { submitNewTrip, type TripDraft } from "./features/onboarding/OnboardingFlow";
import { StatisticsPanel } from "./features/statistics";
import type {
  AuthenticatedUser,
  EventRecord,
  FirestoreEventCategory,
  FirestoreEventStatus,
  MemberRecord,
  TripBackend,
  TripRecord,
  TripSnapshot,
  UserRecord,
} from "./firebase/contracts";

const CATEGORY_LABELS: Record<FirestoreEventCategory, string> = {
  transport: "Di chuyển",
  stay: "Lưu trú",
  food: "Ăn uống",
  activity: "Hoạt động",
  other: "Khác",
};

const STATUS_LABELS: Record<FirestoreEventStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  happening: "Đang diễn ra",
  completed: "Đã hoàn thành",
  cancelled: "Đã huỷ",
};

export function categoryLabel(category: FirestoreEventCategory): string {
  return CATEGORY_LABELS[category];
}

export function statusLabel(status: FirestoreEventStatus): string {
  return STATUS_LABELS[status];
}

export interface AppProps {
  backend: TripBackend;
}

/**
 * Session and trip composition over the typed Firestore port. Every persisted
 * category/status is rendered directly from the approved vocabulary; this App
 * deliberately does not coerce records into the older dashboard domain.
 */
export function App({ backend }: AppProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [profile, setProfile] = useState<UserRecord | null>(null);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TripSnapshot | null>(null);
  const [activeView, setActiveView] = useState<WorkbenchView>("overview");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function hydrate(nextUser: AuthenticatedUser) {
      try {
        const existing = await backend.getProfile(nextUser.uid);
        if (!active) return;
        if (existing) {
          setProfile(existing);
          return;
        }
        await backend.upsertProfile(nextUser);
        if (!active) return;
        setProfile({
          uid: nextUser.uid,
          email: nextUser.email ?? "",
          displayName: nextUser.displayName ?? nextUser.email ?? "Người dùng",
          tripIds: [],
        });
      } catch (cause) {
        if (active) setError(toMessage(cause, "Không thể tải hồ sơ người dùng."));
      }
    }

    const unsubscribe = backend.observeSession((nextUser) => {
      if (!active) return;
      setUser(nextUser);
      setProfile(null);
      setTrips([]);
      setTripId(null);
      setSnapshot(null);
      setError("");
      setLoading(false);
      if (nextUser) void hydrate(nextUser);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [backend]);

  useEffect(() => {
    if (!user) return;
    return backend.subscribeTrips(user.uid, (nextTrips) => {
      setTrips(nextTrips);
      setTripId((current) =>
        current && nextTrips.some((trip) => trip.id === current)
          ? current
          : nextTrips[0]?.id ?? null,
      );
    });
  }, [backend, user]);

  useEffect(() => {
    if (!tripId) return;
    setSnapshot(null);
    return backend.subscribeTrip(
      tripId,
      setSnapshot,
      (cause) => setError(toMessage(cause, "Không thể đồng bộ chuyến đi.")),
    );
  }, [backend, tripId]);

  const currentMember = snapshot?.members.find((member) => member.uid === user?.uid);
  const role = currentMember?.role;

  const eventFeature = useMemo(
    () =>
      user && tripId && role
        ? new EventFeature({ backend, tripId, actor: user, role })
        : null,
    [backend, role, tripId, user],
  );
  const membersFeature = useMemo(
    () =>
      user && tripId && role
        ? new MembersFeature({ backend, tripId, actor: user, role })
        : null,
    [backend, role, tripId, user],
  );
  const expenseFeature = useMemo(
    () =>
      user && tripId && role
        ? new ExpenseFeature({ backend, tripId, actor: user, role })
        : null,
    [backend, role, tripId, user],
  );

  useEffect(() => {
    if (!eventFeature) return;
    eventFeature.start();
    return () => eventFeature.stop();
  }, [eventFeature]);

  useEffect(() => {
    if (!membersFeature) return;
    membersFeature.start();
    return () => membersFeature.stop();
  }, [membersFeature]);

  useEffect(() => {
    if (!expenseFeature || !snapshot) return;
    expenseFeature.replaceExpenses(snapshot.expenses);
  }, [expenseFeature, snapshot]);

  async function handleAuthenticated(session: AuthenticatedSession) {
    setUser(session.user);
    setProfile(session.profile);
    setError("");
  }

  async function handleLogout() {
    try {
      await backend.logout();
    } catch (cause) {
      setError(toMessage(cause, "Không thể đăng xuất."));
    }
  }

  async function createTrip(draft: TripDraft) {
    if (!profile) return;
    try {
      const created = await submitNewTrip(backend, profile, draft);
      setTripId(created.id);
      setNotice("Đã tạo chuyến đi. Đang đồng bộ dữ liệu nhóm.");
    } catch (cause) {
      setError(toMessage(cause, "Không thể tạo chuyến đi."));
    }
  }

  async function createEvent(input: Parameters<EventFeature["create"]>[0]) {
    if (!eventFeature) return;
    try {
      await eventFeature.create(input);
      setNotice("Đã gửi hoạt động để đồng bộ.");
    } catch (cause) {
      setError(toMessage(cause, "Không thể tạo hoạt động."));
    }
  }

  async function approveEvent(eventId: string) {
    if (!eventFeature) return;
    try {
      await eventFeature.approve(eventId);
      setNotice("Đã duyệt hoạt động.");
    } catch (cause) {
      setError(toMessage(cause, "Không thể duyệt hoạt động."));
    }
  }

  async function cancelEvent(eventId: string) {
    if (!eventFeature) return;
    try {
      await eventFeature.cancel(eventId);
      setNotice("Đã huỷ hoạt động.");
    } catch (cause) {
      setError(toMessage(cause, "Không thể huỷ hoạt động."));
    }
  }

  async function deleteEvent(eventId: string) {
    if (!eventFeature) return;
    try {
      await eventFeature.delete(eventId);
      setNotice("Đã xoá hoạt động.");
    } catch (cause) {
      setError(toMessage(cause, "Không thể xoá hoạt động."));
    }
  }

  async function syncEventStatuses() {
    if (!eventFeature) return;
    try {
      await eventFeature.syncStatuses();
      setNotice("Đã yêu cầu đồng bộ trạng thái lịch trình.");
    } catch (cause) {
      setError(toMessage(cause, "Không thể đồng bộ trạng thái."));
    }
  }

  async function reorderEvent(eventId: string, direction: "up" | "down") {
    if (!eventFeature) return;
    try {
      await eventFeature.reorder(eventId, direction);
      setNotice("Đã cập nhật thứ tự lịch trình.");
      setError("");
    } catch (cause) {
      setError(toMessage(cause, "Không thể đổi thứ tự lịch trình."));
    }
  }

  async function createExpense(input: Parameters<ExpenseFeature["create"]>[0]) {
    if (!expenseFeature) return;
    try {
      await expenseFeature.create(input);
      setNotice("Đã thêm khoản chi.");
      setError("");
    } catch (cause) {
      setError(toMessage(cause, "Không thể thêm khoản chi."));
    }
  }

  async function settleExpense(expenseId: string) {
    if (!expenseFeature) return;
    try {
      await expenseFeature.settle(expenseId);
      setNotice("Đã chốt khoản chi.");
      setError("");
    } catch (cause) {
      setError(toMessage(cause, "Không thể chốt khoản chi."));
    }
  }

  if (loading) return <ScreenMessage title="Đang kiểm tra phiên đăng nhập…" />;
  if (!user || !profile) {
    return <AuthFlow backend={backend} onAuthenticated={(session) => void handleAuthenticated(session)} />;
  }
  if (!tripId) {
    return <OnboardingGate email={profile.email} onCreate={(draft) => void createTrip(draft)} />;
  }
  if (!snapshot || !currentMember || !role || !eventFeature || !membersFeature || !expenseFeature) {
    return <ScreenMessage title="Đang tải bảng điều khiển chuyến đi…" />;
  }

  const pendingCount = snapshot.events.filter((event) => event.status === "pending").length;
  const currentScreen = activeView === "overview" ? (
    <WorkbenchOverview
      currentUserId={user.uid}
      onOpenExpenses={() => setActiveView("expenses")}
      onOpenSchedule={() => setActiveView("schedule")}
      snapshot={snapshot}
    />
  ) : activeView === "schedule" ? (
    <div className="workbench-feature-stack">
      <EventComposer members={snapshot.members} onCreate={createEvent} />
      <EventsPanel
        events={snapshot.events}
        isLead={role === "lead"}
        onApprove={approveEvent}
        onCancel={cancelEvent}
        onDelete={deleteEvent}
        onMove={reorderEvent}
        onSync={syncEventStatuses}
      />
    </div>
  ) : activeView === "expenses" ? (
    <div className="workbench-feature-stack">
      <ExpensesPanel
        canSettle={role === "lead"}
        currentUserId={user.uid}
        expenses={snapshot.expenses}
        members={snapshot.members}
        onCreate={createExpense}
        onSettle={settleExpense}
      />
      <StatisticsPanel members={snapshot.members} expenses={snapshot.expenses} />
    </div>
  ) : (
    <MembersPanel
      currentUserId={user.uid}
      members={snapshot.members}
      onRemoveMember={(uid) => membersFeature.removeMember(uid)}
      onUpdateResponsibility={(uid, responsibility) => membersFeature.updateResponsibility(uid, responsibility)}
      trip={snapshot.trip}
    />
  );

  return (
    <WorkbenchShell
      activeView={activeView}
      displayName={currentMember.displayName}
      onChangeView={setActiveView}
      onLogout={handleLogout}
      pendingCount={pendingCount}
      role={role}
      trip={snapshot.trip}
    >
      <div className="workbench-screen-stack">
        <label className="workbench-trip-switcher">
          <span>Chuyến đi đang mở</span>
          <select value={tripId} onChange={(event) => setTripId(event.target.value)}>
            {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
          </select>
        </label>
        {error ? <p className="app-alert error" role="alert">{error}</p> : null}
        {notice ? <p className="app-alert" role="status">{notice}</p> : null}
        {currentScreen}
      </div>
    </WorkbenchShell>
  );
}
function OnboardingGate({ email, onCreate }: { email: string; onCreate: (draft: TripDraft) => void }) {
  const [draft, setDraft] = useState<TripDraft>({ name: "", destination: "", startDate: "", endDate: "" });
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try { await onCreate(draft); } finally { setSubmitting(false); }
  }

  return (
    <main className="onboarding-shell">
      <section aria-labelledby="onboarding-title" className="onboarding-card">
        <p className="eyebrow">TripFlow</p>
        <h1 id="onboarding-title">Tạo chuyến đi đầu tiên</h1>
        <p>{email || "Tài khoản này"} chưa có chuyến đi khả dụng.</p>
        <form onSubmit={(event) => void submit(event)}>
          <label>Tên chuyến đi<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>Điểm đến<input required value={draft.destination} onChange={(event) => setDraft({ ...draft, destination: event.target.value })} /></label>
          <label>Ngày bắt đầu<input required type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label>
          <label>Ngày kết thúc<input required type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label>
          <button className="primary-button" disabled={submitting} type="submit">{submitting ? "Đang tạo…" : "Tạo chuyến đi"}</button>
        </form>
        <div className="fail-closed-card compact" role="note">
          <strong>Tham gia bằng mã đang tắt</strong>
          <span>Chưa có join-proof/callable function được Rules xác minh trên server.</span>
          <button disabled type="button">Nhập mã tham gia (chưa hỗ trợ an toàn)</button>
        </div>
      </section>
    </main>
  );
}

function EventComposer({ members, onCreate }: { members: MemberRecord[]; onCreate: (input: Parameters<EventFeature["create"]>[0]) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<FirestoreEventCategory>("activity");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onCreate({ title: title.trim(), category, startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), participantIds });
      setTitle(""); setStartAt(""); setEndAt(""); setParticipantIds([]);
    } finally { setSubmitting(false); }
  }

  function toggleParticipant(uid: string) {
    setParticipantIds((current) => current.includes(uid) ? current.filter((value) => value !== uid) : [...current, uid]);
  }

  return (
    <section aria-labelledby="event-create-heading" className="event-composer panel-card">
      <div><p className="eyebrow">Lịch trình</p><h2 id="event-create-heading">Thêm hoạt động</h2><p>Lead tạo hoạt động đã duyệt; Member gửi hoạt động chờ duyệt.</p></div>
      <form onSubmit={(event) => void submit(event)}>
        <label>Tiêu đề<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Loại<select value={category} onChange={(event) => setCategory(event.target.value as FirestoreEventCategory)}>{Object.keys(CATEGORY_LABELS).map((value) => <option key={value} value={value}>{categoryLabel(value as FirestoreEventCategory)}</option>)}</select></label>
        <label>Bắt đầu<input required type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>
        <label>Kết thúc<input required type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label>
        <fieldset><legend>Thành viên tham gia</legend>{members.map((member) => <label key={member.uid}><input checked={participantIds.includes(member.uid)} type="checkbox" onChange={() => toggleParticipant(member.uid)} />{member.displayName}</label>)}</fieldset>
        <button className="primary-button" disabled={submitting || participantIds.length === 0} type="submit">{submitting ? "Đang gửi…" : "Tạo hoạt động"}</button>
      </form>
    </section>
  );
}

function EventsPanel({ events, isLead, onApprove, onCancel, onDelete, onMove, onSync }: { events: EventRecord[]; isLead: boolean; onApprove: (id: string) => Promise<void>; onCancel: (id: string) => Promise<void>; onDelete: (id: string) => Promise<void>; onMove: (id: string, direction: "up" | "down") => Promise<void>; onSync: () => Promise<void> }) {
  return <section aria-labelledby="events-heading" className="events-panel panel-card"><div className="section-heading"><div><p className="eyebrow">Đồng bộ thời gian thực</p><h2 id="events-heading">Hoạt động</h2></div>{isLead ? <button className="secondary-button" onClick={() => void onSync()} type="button">Đồng bộ trạng thái</button> : null}</div>{events.length ? <ul>{events.map((event, index) => <li key={event.id}><article><div><span className={`status status-${event.status}`}>{statusLabel(event.status)}</span><h3>{event.title}</h3><p>{categoryLabel(event.category)} · {formatDateTime(event.startAt)} — {formatDateTime(event.endAt)}</p></div><div className="event-actions">{isLead ? <><button aria-label={`Chuyển ${event.title} lên`} disabled={index === 0} onClick={() => void onMove(event.id, "up")} type="button">↑</button><button aria-label={`Chuyển ${event.title} xuống`} disabled={index === events.length - 1} onClick={() => void onMove(event.id, "down")} type="button">↓</button></> : null}{isLead && event.status === "pending" ? <button onClick={() => void onApprove(event.id)} type="button">Duyệt</button> : null}{isLead && event.status !== "cancelled" ? <button onClick={() => void onCancel(event.id)} type="button">Huỷ</button> : null}{(isLead || event.status === "pending") ? <button onClick={() => void onDelete(event.id)} type="button">Xoá</button> : null}</div></article></li>)}</ul> : <p>Chưa có hoạt động nào.</p>}</section>;
}

function ScreenMessage({ title }: { title: string }) { return <main className="screen-message"><p role="status">{title}</p></main>; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function toMessage(cause: unknown, fallback: string) { return cause instanceof Error && cause.message ? cause.message : fallback; }
