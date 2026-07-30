import { useEffect, useMemo, useState } from "react";
import { AuthFlow, type AuthenticatedSession } from "./features/auth/AuthFlow";
import { EventFeature } from "./features/events/events";
import { EventsWorkbench } from "./features/events/EventsWorkbench";
import { ExpenseFeature, ExpensesPanel } from "./features/expenses";
import { MembersFeature } from "./features/members/members";
import { MembersPanel } from "./features/members/MembersPanel";
import { WorkbenchShell, type WorkbenchView } from "./components/WorkbenchShell";
import { WorkbenchOverview } from "./components/WorkbenchOverview";
import { OnboardingFlow } from "./features/onboarding/OnboardingFlow";
import type {
  AuthenticatedUser,
  FirestoreEventCategory,
  FirestoreEventStatus,
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
  /** Makes the local, synthetic preview explicit without changing feature contracts. */
  demoMode?: boolean;
}

/**
 * Session and trip composition over the typed Firestore port. Every persisted
 * category/status is rendered directly from the approved vocabulary; this App
 * deliberately does not coerce records into the older dashboard domain.
 */
export function App({ backend, demoMode = false }: AppProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [profile, setProfile] = useState<UserRecord | null>(null);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TripSnapshot | null>(null);
  const [activeView, setActiveView] = useState<WorkbenchView>("overview");
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
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
    return backend.subscribeTrip(
      tripId,
      setSnapshot,
      (cause) => {
        // Membership and Rules are authoritative. If any protected trip
        // stream becomes unavailable, stop rendering the stale snapshot.
        setSnapshot(null);
        setTripId(null);
        setError(toMessage(cause, "Không thể đồng bộ chuyến đi."));
      },
    );
  }, [backend, tripId]);

  const selectedSnapshot =
    snapshot && snapshot.trip.id === tripId ? snapshot : null;
  const currentMember = selectedSnapshot?.members.find(
    (member) => member.uid === user?.uid,
  );
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
    if (!selectedSnapshot) return;
    eventFeature?.replaceEvents(selectedSnapshot.events);
    membersFeature?.replaceSnapshot({
      trip: selectedSnapshot.trip,
      members: selectedSnapshot.members,
    });
    expenseFeature?.replaceExpenses(selectedSnapshot.expenses);
  }, [eventFeature, expenseFeature, membersFeature, selectedSnapshot]);

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

  function handleTripReady(created: TripRecord) {
    setSnapshot(null);
    setTripId(created.id);
    setActiveView("overview");
    setError("");
    setNotice("Đã tạo chuyến đi. Đang đồng bộ dữ liệu nhóm.");
  }

  function handleTripChange(nextTripId: string) {
    if (nextTripId === tripId) return;
    setSnapshot(null);
    setTripId(nextTripId);
    setActiveView("overview");
    setError("");
    setNotice("");
  }

  function throwMutationFailure(cause: unknown, fallback: string): never {
    const message = toMessage(cause, fallback);
    setError(message);
    throw cause instanceof Error ? cause : new Error(message);
  }

  async function createEvent(input: Parameters<EventFeature["create"]>[0]) {
    if (!eventFeature) return;
    try {
      await eventFeature.create(input);
      setNotice("Đã gửi hoạt động để đồng bộ.");
    } catch (cause) {
      throwMutationFailure(cause, "Không thể tạo hoạt động.");
    }
  }

  async function updateEvent(eventId: string, patch: Parameters<EventFeature["update"]>[1]) {
    if (!eventFeature) return;
    try {
      await eventFeature.update(eventId, patch);
      setNotice("Đã gửi thay đổi hoạt động để đồng bộ.");
      setError("");
    } catch (cause) {
      throwMutationFailure(cause, "Không thể cập nhật hoạt động.");
    }
  }

  async function approveEvent(eventId: string) {
    if (!eventFeature) return;
    try {
      await eventFeature.approve(eventId);
      setNotice("Đã duyệt hoạt động.");
    } catch (cause) {
      throwMutationFailure(cause, "Không thể duyệt hoạt động.");
    }
  }

  async function cancelEvent(eventId: string) {
    if (!eventFeature) return;
    try {
      await eventFeature.cancel(eventId);
      setNotice("Đã huỷ hoạt động.");
    } catch (cause) {
      throwMutationFailure(cause, "Không thể huỷ hoạt động.");
    }
  }

  async function deleteEvent(eventId: string) {
    if (!eventFeature) return;
    try {
      await eventFeature.delete(eventId);
      setNotice("Đã xoá hoạt động.");
    } catch (cause) {
      throwMutationFailure(cause, "Không thể xoá hoạt động.");
    }
  }

  async function syncEventStatuses() {
    if (!eventFeature) return;
    try {
      await eventFeature.syncStatuses();
      setNotice("Đã yêu cầu đồng bộ trạng thái lịch trình.");
    } catch (cause) {
      throwMutationFailure(cause, "Không thể đồng bộ trạng thái.");
    }
  }

  async function reorderEvent(eventId: string, direction: "up" | "down") {
    if (!eventFeature) return;
    try {
      await eventFeature.reorder(eventId, direction);
      setNotice("Đã cập nhật thứ tự lịch trình.");
      setError("");
    } catch (cause) {
      throwMutationFailure(cause, "Không thể đổi thứ tự lịch trình.");
    }
  }

  async function createExpense(input: Parameters<ExpenseFeature["create"]>[0]) {
    if (!expenseFeature) return;
    try {
      await expenseFeature.create(input);
      setNotice("Đã thêm khoản chi.");
      setError("");
    } catch (cause) {
      throwMutationFailure(cause, "Không thể thêm khoản chi.");
    }
  }

  async function updateExpense(expenseId: string, patch: Parameters<ExpenseFeature["update"]>[1]) {
    if (!expenseFeature) return;
    try {
      await expenseFeature.update(expenseId, patch);
      setNotice("Đã gửi thay đổi khoản chi để đồng bộ.");
      setError("");
    } catch (cause) {
      throwMutationFailure(cause, "Không thể cập nhật khoản chi.");
    }
  }

  async function deleteExpense(expenseId: string) {
    if (!expenseFeature) return;
    try {
      await expenseFeature.delete(expenseId);
      setNotice("Đã xoá khoản chi.");
      setError("");
    } catch (cause) {
      throwMutationFailure(cause, "Không thể xoá khoản chi.");
    }
  }

  async function settleExpense(expenseId: string) {
    if (!expenseFeature) return;
    try {
      await expenseFeature.settle(expenseId);
      setNotice("Đã chốt khoản chi.");
      setError("");
    } catch (cause) {
      throwMutationFailure(cause, "Không thể chốt khoản chi.");
    }
  }

  if (loading) return <ScreenMessage title="Đang kiểm tra phiên đăng nhập…" />;
  if (!user || !profile) {
    return <AuthFlow backend={backend} onAuthenticated={(session) => void handleAuthenticated(session)} />;
  }
  if (!tripId) {
    return (
      <OnboardingFlow
        backend={backend}
        onTripReady={handleTripReady}
        profile={profile}
      />
    );
  }
  if (!selectedSnapshot || !currentMember || !role || !eventFeature || !membersFeature || !expenseFeature) {
    return <ScreenMessage title="Đang tải bảng điều khiển chuyến đi…" />;
  }
  const shareTrip = selectedSnapshot.trip;

  async function handleShareTrip() {
    const shareText = `${shareTrip.name} · Mã tham gia ${shareTrip.joinCode}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTrip.name,
          text: shareText,
          url: window.location.href,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      } else {
        throw new Error("Clipboard unavailable");
      }
      setNotice("Đã chuẩn bị thông tin chia sẻ chuyến đi.");
      setError("");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError("Không thể chia sẻ tự động. Bạn có thể sao chép mã trong màn Thành viên.");
    }
  }

  const pendingCount = selectedSnapshot.events.filter((event) => event.status === "pending").length;
  const openSchedule = (eventId?: string) => {
    setFocusedEventId(eventId ?? null);
    setActiveView("schedule");
  };
  const currentScreen = activeView === "overview" ? (
    <WorkbenchOverview
      currentUserId={user.uid}
      onOpenExpenses={() => setActiveView("expenses")}
      onOpenSchedule={openSchedule}
      snapshot={selectedSnapshot}
    />
  ) : activeView === "schedule" ? (
    <EventsWorkbench
      currentUserId={user.uid}
      events={selectedSnapshot.events}
      initialSelectedEventId={focusedEventId ?? undefined}
      members={selectedSnapshot.members}
      onApprove={approveEvent}
      onCancel={cancelEvent}
      onCreate={createEvent}
      onDelete={deleteEvent}
      onMove={reorderEvent}
      onSync={syncEventStatuses}
      onUpdate={updateEvent}
      role={role}
    />
  ) : activeView === "expenses" ? (
    <ExpensesPanel
      canSettle={role === "lead"}
      currentUserId={user.uid}
      expenses={selectedSnapshot.expenses}
      members={selectedSnapshot.members}
      onCreate={createExpense}
      onDelete={deleteExpense}
      onSettle={settleExpense}
      onUpdate={updateExpense}
    />
  ) : (
    <MembersPanel
      currentUserId={user.uid}
      expenses={selectedSnapshot.expenses}
      members={selectedSnapshot.members}
      onRemoveMember={(uid) => membersFeature.removeMember(uid)}
      onUpdateResponsibility={(uid, responsibility) => membersFeature.updateResponsibility(uid, responsibility)}
      trip={selectedSnapshot.trip}
    />
  );

  return (
    <WorkbenchShell
      activeView={activeView}
      displayName={currentMember.displayName}
      memberCount={selectedSnapshot.members.length}
      onChangeView={setActiveView}
      onInvite={() => setActiveView("members")}
      onLogout={handleLogout}
      onShare={handleShareTrip}
      pendingCount={pendingCount}
      role={role}
      topbarAction={
        <label className="workbench-trip-switcher">
          <span>Chuyến đi</span>
          <select aria-label="Chuyến đi đang mở" value={tripId} onChange={(event) => handleTripChange(event.target.value)}>
            {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
          </select>
        </label>
      }
      trip={selectedSnapshot.trip}
    >
      <div className="workbench-screen-stack">
        {demoMode ? (
          <p className="local-demo-notice" data-testid="local-demo-notice" role="status">
            <strong>Dữ liệu minh họa local</strong>
            <span> Chỉ dùng để trải nghiệm; mọi thay đổi sẽ reset khi tải lại.</span>
          </p>
        ) : null}
        {error ? <p className="app-alert error" role="alert">{error}</p> : null}
        {notice ? <p className="app-alert" role="status">{notice}</p> : null}
        {currentScreen}
      </div>
    </WorkbenchShell>
  );
}
function ScreenMessage({ title }: { title: string }) { return <main className="screen-message"><p role="status">{title}</p></main>; }
function toMessage(cause: unknown, fallback: string) { return cause instanceof Error && cause.message ? cause.message : fallback; }
