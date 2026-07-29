import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarBlank,
  ChartDonut,
  Check,
  Clock,
  Compass,
  CurrencyCircleDollar,
  MapPin,
  PencilSimple,
  Plus,
  SignOut,
  Trash,
  UserCircle,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import {
  calculateBalances,
  canManageEvent,
  deriveEventStatus,
  type EventCategory,
  type EventStatus,
  type TripEvent,
} from "../domain";
import type {
  DashboardView,
  EventDraft,
  Trip,
  TripMember,
} from "../types";

interface TripDashboardProps {
  trip: Trip;
  members: TripMember[];
  events: TripEvent[];
  currentUserId: string;
  activeView: DashboardView;
  now: Date;
  onChangeView: (view: DashboardView) => void;
  onCreateEvent: (draft: EventDraft) => void | Promise<void>;
  onEditEvent: (
    eventId: string,
    draft: EventDraft,
  ) => void | Promise<void>;
  onDeleteEvent: (eventId: string) => void | Promise<void>;
  onApproveEvent: (eventId: string) => void | Promise<void>;
  onMoveEvent: (
    eventId: string,
    direction: "up" | "down",
  ) => void | Promise<void>;
  onUpdateMember: (
    memberId: string,
    patch: Pick<TripMember, "responsibility">,
  ) => void | Promise<void>;
  onDeleteMember: (memberId: string) => void | Promise<void>;
  onLogout: () => void | Promise<void>;
}

const VIEW_ITEMS: Array<{
  id: DashboardView;
  label: string;
  icon: typeof Compass;
}> = [
  { id: "overview", label: "Tổng quan", icon: Compass },
  { id: "schedule", label: "Lịch trình", icon: CalendarBlank },
  { id: "expenses", label: "Chi phí", icon: CurrencyCircleDollar },
  { id: "members", label: "Thành viên", icon: UsersThree },
];

const STATUS_LABELS: Record<EventStatus, string> = {
  pending: "Chờ duyệt",
  upcoming: "Sắp tới",
  ongoing: "Đang diễn ra",
  done: "Đã xong",
  cancelled: "Đã hủy",
  paused: "Tạm hoãn",
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  food: "Ăn uống",
  sightseeing: "Ngắm cảnh",
  bonding: "Bonding",
  transport: "Di chuyển",
  other: "Khác",
};

const EMPTY_DRAFT: EventDraft = {
  title: "",
  description: "",
  startAt: "",
  endAt: "",
  location: "",
  category: "sightseeing",
  status: "upcoming",
  participantIds: [],
  payerId: null,
  amount: 0,
};

export function TripDashboard({
  trip,
  members,
  events,
  currentUserId,
  activeView,
  now,
  onChangeView,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  onApproveEvent,
  onMoveEvent,
  onUpdateMember,
  onDeleteMember,
  onLogout,
}: TripDashboardProps) {
  const [eventEditor, setEventEditor] = useState<{
    eventId: string | null;
    draft: EventDraft;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const currentMember =
    members.find((member) => member.userId === currentUserId) ??
    members.find((member) => member.id === currentUserId);
  const role = currentMember?.role ?? "member";

  const displayedEvents = useMemo(
    () =>
      [...events]
        .map((event) => ({
          ...event,
          status: deriveEventStatus(event, now),
        }))
        .sort(
          (left, right) =>
            left.order - right.order ||
            Date.parse(left.startAt) - Date.parse(right.startAt),
        ),
    [events, now],
  );

  const balances = useMemo(
    () => calculateBalances(members, displayedEvents),
    [displayedEvents, members],
  );
  const totalCost = displayedEvents
    .filter(
      (event) =>
        event.status !== "pending" && event.status !== "cancelled",
    )
    .reduce((sum, event) => sum + event.amount, 0);
  const pendingCount = displayedEvents.filter(
    (event) => event.status === "pending",
  ).length;
  const currentEvent = displayedEvents.find(
    (event) => event.status === "ongoing",
  );

  function openCreateEvent() {
    setFormError("");
    setEventEditor({
      eventId: null,
      draft: {
        ...EMPTY_DRAFT,
        participantIds: currentMember ? [currentMember.userId] : [],
        payerId: currentMember?.userId ?? null,
      },
    });
  }

  function openEditEvent(event: TripEvent) {
    setFormError("");
    setEventEditor({
      eventId: event.id,
      draft: {
        title: event.title,
        description: event.description,
        startAt: toLocalDateTime(event.startAt),
        endAt: toLocalDateTime(event.endAt),
        location: event.location,
        category: event.category,
        status: event.status,
        participantIds: event.participantIds,
        payerId: event.payerId,
        amount: event.amount,
      },
    });
  }

  async function submitEvent() {
    if (!eventEditor) return;
    if (!eventEditor.draft.title.trim()) {
      setFormError("Vui lòng nhập tiêu đề hoạt động.");
      return;
    }
    if (
      !eventEditor.draft.startAt ||
      !eventEditor.draft.endAt ||
      Date.parse(eventEditor.draft.endAt) <=
        Date.parse(eventEditor.draft.startAt)
    ) {
      setFormError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    const normalizedDraft: EventDraft = {
      ...eventEditor.draft,
      title: eventEditor.draft.title.trim(),
      description: eventEditor.draft.description.trim(),
      location: eventEditor.draft.location.trim(),
      startAt: new Date(eventEditor.draft.startAt).toISOString(),
      endAt: new Date(eventEditor.draft.endAt).toISOString(),
      amount: Math.max(0, Number(eventEditor.draft.amount) || 0),
    };

    setSaving(true);
    setFormError("");
    try {
      if (eventEditor.eventId) {
        await onEditEvent(eventEditor.eventId, normalizedDraft);
      } else {
        await onCreateEvent(normalizedDraft);
      }
      setEventEditor(null);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Không thể lưu hoạt động. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Compass weight="fill" />
          </span>
          <span>
            <strong>TripFlow</strong>
            <small>Group itinerary OS</small>
          </span>
        </div>

        <div className="trip-mini-card">
          <span className="eyebrow">Chuyến đi đang mở</span>
          <strong>{trip.destination}</strong>
          <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
        </div>

        <nav aria-label="Điều hướng ứng dụng">
          {VIEW_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              className={activeView === id ? "nav-item active" : "nav-item"}
              key={id}
              onClick={() => onChangeView(id)}
              type="button"
            >
              <Icon />
              <span>{label}</span>
              {id === "schedule" && pendingCount > 0 ? (
                <span className="nav-badge">{pendingCount}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="member-avatar">
            {initials(currentMember?.displayName ?? "Thành viên")}
          </div>
          <div>
            <strong>{currentMember?.displayName ?? "Thành viên"}</strong>
            <span>{role === "lead" ? "Lead" : "Member"}</span>
          </div>
          <button
            aria-label="Đăng xuất"
            className="icon-button"
            onClick={() => void onLogout()}
            type="button"
          >
            <SignOut />
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)}
            </span>
            <h1>{trip.name}</h1>
          </div>
          <div className="topbar-actions">
            <span className={`role-pill ${role}`}>
              <UserCircle weight="fill" />
              {role === "lead" ? "Lead" : "Member"}
            </span>
            <button
              className="primary-button"
              onClick={openCreateEvent}
              type="button"
            >
              <Plus weight="bold" />
              Thêm hoạt động
            </button>
          </div>
        </header>

        {activeView === "overview" ? (
          <OverviewView
            currentEvent={currentEvent}
            events={displayedEvents}
            members={members}
            pendingCount={pendingCount}
            totalCost={totalCost}
          />
        ) : null}

        {activeView === "schedule" ? (
          <ScheduleView
            currentUserId={currentUserId}
            events={displayedEvents}
            members={members}
            role={role}
            onApproveEvent={onApproveEvent}
            onCreateEvent={openCreateEvent}
            onDeleteEvent={onDeleteEvent}
            onEditEvent={openEditEvent}
            onMoveEvent={onMoveEvent}
          />
        ) : null}

        {activeView === "expenses" ? (
          <ExpensesView
            balances={balances}
            events={displayedEvents}
            totalCost={totalCost}
          />
        ) : null}

        {activeView === "members" ? (
          <MembersView
            currentUserId={currentUserId}
            members={members}
            role={role}
            trip={trip}
            onDeleteMember={onDeleteMember}
            onUpdateMember={onUpdateMember}
          />
        ) : null}
      </main>

      {eventEditor ? (
        <EventEditor
          draft={eventEditor.draft}
          error={formError}
          isEditing={Boolean(eventEditor.eventId)}
          members={members}
          saving={saving}
          onCancel={() => setEventEditor(null)}
          onChange={(draft) =>
            setEventEditor((current) =>
              current ? { ...current, draft } : current,
            )
          }
          onSubmit={() => void submitEvent()}
        />
      ) : null}
    </div>
  );
}

function OverviewView({
  currentEvent,
  events,
  members,
  pendingCount,
  totalCost,
}: {
  currentEvent?: TripEvent;
  events: TripEvent[];
  members: TripMember[];
  pendingCount: number;
  totalCost: number;
}) {
  const doneCount = events.filter((event) => event.status === "done").length;
  const nextEvents = events
    .filter((event) => event.status === "upcoming")
    .slice(0, 3);

  return (
    <div className="view-stack">
      <section className="hero-band">
        <div>
          <span className="eyebrow">Live trip board</span>
          <h2>
            {currentEvent
              ? `Đang diễn ra: ${currentEvent.title}`
              : "Cả nhóm đã sẵn sàng cho hành trình."}
          </h2>
          <p>
            Lịch trình, thành viên và chi phí được cập nhật trong cùng một bảng
            điều khiển.
          </p>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <span>LIVE</span>
        </div>
      </section>

      <section className="metric-grid" aria-label="Thống kê nhanh">
        <MetricCard
          accent="blue"
          icon={<CalendarBlank />}
          label="Lịch trình"
          value={`${events.length} sự kiện`}
          note={`${doneCount} đã hoàn thành`}
        />
        <MetricCard
          accent="lime"
          icon={<CurrencyCircleDollar />}
          label="Tổng chi phí"
          value={formatCurrency(totalCost)}
          note="Không tính event chờ duyệt/hủy"
        />
        <MetricCard
          accent="pink"
          icon={<UsersThree />}
          label="Thành viên"
          value={`${members.length} người`}
          note="1 Lead · còn lại Member"
        />
        <MetricCard
          accent="orange"
          icon={<Clock />}
          label="Chờ duyệt"
          value={`${pendingCount} đề xuất`}
          note="Lead xử lý trước khi lên lịch"
        />
      </section>

      <section className="split-grid">
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Tiếp theo</span>
              <h3>Hoạt động sắp tới</h3>
            </div>
          </div>
          <div className="compact-event-list">
            {nextEvents.length > 0 ? (
              nextEvents.map((event) => (
                <div className="compact-event" key={event.id}>
                  <div className="time-block">
                    <strong>{formatTime(event.startAt)}</strong>
                    <span>{formatShortDate(event.startAt)}</span>
                  </div>
                  <div>
                    <strong>{event.title}</strong>
                    <span>
                      <MapPin /> {event.location || "Chưa có địa điểm"}
                    </span>
                  </div>
                  <span className={`status-chip ${event.status}`}>
                    {STATUS_LABELS[event.status]}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState message="Chưa có hoạt động sắp tới." />
            )}
          </div>
        </article>

        <article className="panel-card category-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Cơ cấu</span>
              <h3>Event theo loại</h3>
            </div>
            <ChartDonut size={30} />
          </div>
          <div className="category-bars">
            {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
              const count = events.filter(
                (event) => event.category === category,
              ).length;
              const width =
                events.length === 0 ? 0 : Math.max(8, (count / events.length) * 100);
              return (
                <div className="category-row" key={category}>
                  <span>{label}</span>
                  <div>
                    <i style={{ width: `${width}%` }} />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}

function MetricCard({
  accent,
  icon,
  label,
  note,
  value,
}: {
  accent: string;
  icon: ReactNode;
  label: string;
  note: string;
  value: string;
}) {
  return (
    <article className={`metric-card ${accent}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function ScheduleView({
  events,
  members,
  currentUserId,
  role,
  onApproveEvent,
  onCreateEvent,
  onDeleteEvent,
  onEditEvent,
  onMoveEvent,
}: {
  events: TripEvent[];
  members: TripMember[];
  currentUserId: string;
  role: "lead" | "member";
  onApproveEvent: (eventId: string) => void | Promise<void>;
  onCreateEvent: () => void;
  onDeleteEvent: (eventId: string) => void | Promise<void>;
  onEditEvent: (event: TripEvent) => void;
  onMoveEvent: (
    eventId: string,
    direction: "up" | "down",
  ) => void | Promise<void>;
}) {
  return (
    <section className="view-stack">
      <div className="section-heading page-heading">
        <div>
          <span className="eyebrow">Timeline</span>
          <h2>Lịch trình chuyến đi</h2>
          <p>
            Event hủy vẫn giữ khung giờ; event tạm hoãn không tự đổi trạng thái.
          </p>
        </div>
        <button className="primary-button" onClick={onCreateEvent} type="button">
          <Plus weight="bold" />
          Thêm hoạt động
        </button>
      </div>

      <div className="timeline-list">
        {events.length === 0 ? (
          <EmptyState message="Chưa có hoạt động. Hãy tạo event đầu tiên." />
        ) : (
          events.map((event, index) => {
            const permissions = canManageEvent(role, currentUserId, event);
            const participantNames = event.participantIds
              .map(
                (id) =>
                  members.find(
                    (member) => member.userId === id || member.id === id,
                  )?.displayName,
              )
              .filter(Boolean)
              .join(", ");
            return (
              <article
                className={`timeline-event ${event.status}`}
                key={event.id}
              >
                <div className="timeline-rail">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <i />
                </div>
                <div className="event-time">
                  <strong>{formatTime(event.startAt)}</strong>
                  <span>{formatTime(event.endAt)}</span>
                  <small>{formatShortDate(event.startAt)}</small>
                </div>
                <div className="event-body">
                  <div className="event-title-row">
                    <div>
                      <span className="event-category">
                        {CATEGORY_LABELS[event.category]}
                      </span>
                      <h3>{event.title}</h3>
                    </div>
                    <span className={`status-chip ${event.status}`}>
                      {STATUS_LABELS[event.status]}
                    </span>
                  </div>
                  <p>{event.description || "Chưa có mô tả."}</p>
                  <div className="event-meta">
                    <span>
                      <MapPin /> {event.location || "Chưa có địa điểm"}
                    </span>
                    <span>
                      <UsersThree /> {participantNames || "Chưa gán thành viên"}
                    </span>
                    <span>
                      <CurrencyCircleDollar />
                      {formatCurrency(event.amount)}
                    </span>
                  </div>
                </div>
                <div className="event-actions">
                  <button
                    aria-label={`Đưa ${event.title} lên`}
                    className="icon-button"
                    disabled={index === 0}
                    onClick={() => void onMoveEvent(event.id, "up")}
                    type="button"
                  >
                    <ArrowUp />
                  </button>
                  <button
                    aria-label={`Đưa ${event.title} xuống`}
                    className="icon-button"
                    disabled={index === events.length - 1}
                    onClick={() => void onMoveEvent(event.id, "down")}
                    type="button"
                  >
                    <ArrowDown />
                  </button>
                  {permissions.canApprove && event.status === "pending" ? (
                    <button
                      aria-label={`Duyệt ${event.title}`}
                      className="icon-button success"
                      onClick={() => void onApproveEvent(event.id)}
                      type="button"
                    >
                      <Check />
                    </button>
                  ) : null}
                  {permissions.canEdit ? (
                    <button
                      aria-label={`Sửa ${event.title}`}
                      className="icon-button"
                      onClick={() => onEditEvent(event)}
                      type="button"
                    >
                      <PencilSimple />
                    </button>
                  ) : null}
                  {permissions.canDelete ? (
                    <button
                      aria-label={`Xóa ${event.title}`}
                      className="icon-button danger"
                      onClick={() => void onDeleteEvent(event.id)}
                      type="button"
                    >
                      <Trash />
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function ExpensesView({
  balances,
  events,
  totalCost,
}: {
  balances: ReturnType<typeof calculateBalances>;
  events: TripEvent[];
  totalCost: number;
}) {
  const paidEvents = events.filter(
    (event) =>
      event.amount > 0 &&
      event.status !== "pending" &&
      event.status !== "cancelled",
  );

  return (
    <section className="view-stack">
      <div className="section-heading page-heading">
        <div>
          <span className="eyebrow">Money ledger</span>
          <h2>Chi phí & chia tiền</h2>
          <p>
            Chi phí được chia đều cho các thành viên được gán vào từng event.
          </p>
        </div>
        <div className="total-cost">
          <span>Tổng chuyến đi</span>
          <strong>{formatCurrency(totalCost)}</strong>
        </div>
      </div>

      <div className="split-grid expense-grid">
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Công nợ</span>
              <h3>Đã trả · Phải trả · Dư/nợ</h3>
            </div>
          </div>
          <div className="balance-table">
            <div className="balance-row table-head">
              <span>Thành viên</span>
              <span>Đã trả</span>
              <span>Phải trả</span>
              <span>Dư / nợ</span>
            </div>
            {balances.map((member) => (
              <div className="balance-row" key={member.memberId}>
                <strong>{member.displayName}</strong>
                <span>{formatCurrency(member.paid)}</span>
                <span>{formatCurrency(member.owed)}</span>
                <span
                  className={
                    member.balance >= 0 ? "balance-positive" : "balance-negative"
                  }
                >
                  {formatSignedCurrency(member.balance)}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Các khoản</span>
              <h3>Chi phí theo hoạt động</h3>
            </div>
          </div>
          <div className="expense-list">
            {paidEvents.length > 0 ? (
              paidEvents.map((event) => (
                <div className="expense-item" key={event.id}>
                  <span className="expense-icon">
                    <CurrencyCircleDollar />
                  </span>
                  <div>
                    <strong>{event.title}</strong>
                    <small>
                      {event.participantIds.length} người ·{" "}
                      {CATEGORY_LABELS[event.category]}
                    </small>
                  </div>
                  <strong>{formatCurrency(event.amount)}</strong>
                </div>
              ))
            ) : (
              <EmptyState message="Chưa có khoản chi được duyệt." />
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function MembersView({
  currentUserId,
  members,
  role,
  trip,
  onDeleteMember,
  onUpdateMember,
}: {
  currentUserId: string;
  members: TripMember[];
  role: "lead" | "member";
  trip: Trip;
  onDeleteMember: (memberId: string) => void | Promise<void>;
  onUpdateMember: (
    memberId: string,
    patch: Pick<TripMember, "responsibility">,
  ) => void | Promise<void>;
}) {
  return (
    <section className="view-stack">
      <div className="section-heading page-heading">
        <div>
          <span className="eyebrow">Crew board</span>
          <h2>Nhóm & thành viên</h2>
          <p>
            Thành viên tham gia bằng Trip ID và mã gia nhập; Lead quản lý vai
            trò trong chuyến.
          </p>
        </div>
        <div className="join-code-card">
          <span>Trip ID</span>
          <strong>{trip.id}</strong>
          <span>Mã gia nhập</span>
          <strong>{trip.joinCode}</strong>
        </div>
      </div>

      <div className="member-grid">
        {members.map((member) => (
          <article className="member-card" key={member.id}>
            <div className={`member-avatar large ${member.role}`}>
              {initials(member.displayName)}
            </div>
            <div className="member-card-copy">
              <div>
                <h3>{member.displayName}</h3>
                <span className={`role-pill ${member.role}`}>
                  {member.role === "lead" ? "Lead" : "Member"}
                </span>
              </div>
              <p>{member.email}</p>
              <label>
                Trách nhiệm
                <input
                  defaultValue={member.responsibility}
                  disabled={
                    role !== "lead" && member.userId !== currentUserId
                  }
                  onBlur={(event) =>
                    void onUpdateMember(member.id, {
                      responsibility: event.target.value.trim(),
                    })
                  }
                />
              </label>
            </div>
            {role === "lead" &&
            member.role !== "lead" &&
            member.userId !== currentUserId ? (
              <button
                aria-label={`Xóa ${member.displayName}`}
                className="icon-button danger"
                onClick={() => void onDeleteMember(member.id)}
                type="button"
              >
                <Trash />
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function EventEditor({
  draft,
  error,
  isEditing,
  members,
  saving,
  onCancel,
  onChange,
  onSubmit,
}: {
  draft: EventDraft;
  error: string;
  isEditing: boolean;
  members: TripMember[];
  saving: boolean;
  onCancel: () => void;
  onChange: (draft: EventDraft) => void;
  onSubmit: () => void;
}) {
  function toggleParticipant(userId: string) {
    const isSelected = draft.participantIds.includes(userId);
    const participantIds = isSelected
      ? draft.participantIds.filter((id) => id !== userId)
      : [...draft.participantIds, userId];
    const payerId = participantIds.includes(draft.payerId ?? "")
      ? draft.payerId
      : participantIds[0] ?? null;
    onChange({ ...draft, participantIds, payerId });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="event-editor-title"
        aria-modal="true"
        className="event-modal"
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Event editor</span>
            <h2 id="event-editor-title">
              {isEditing ? "Chỉnh sửa hoạt động" : "Thêm hoạt động"}
            </h2>
          </div>
          <button
            aria-label="Đóng"
            className="icon-button"
            onClick={onCancel}
            type="button"
          >
            <X />
          </button>
        </div>

        <div className="form-grid">
          <label className="field full">
            Tiêu đề *
            <input
              maxLength={120}
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              placeholder="Ví dụ: Săn mây đồi chè"
              value={draft.title}
            />
          </label>
          <label className="field full">
            Mô tả
            <textarea
              maxLength={600}
              onChange={(event) =>
                onChange({ ...draft, description: event.target.value })
              }
              placeholder="Mô tả ngắn về hoạt động"
              rows={3}
              value={draft.description}
            />
          </label>
          <label className="field">
            Bắt đầu *
            <input
              onChange={(event) =>
                onChange({ ...draft, startAt: event.target.value })
              }
              type="datetime-local"
              value={draft.startAt}
            />
          </label>
          <label className="field">
            Kết thúc *
            <input
              onChange={(event) =>
                onChange({ ...draft, endAt: event.target.value })
              }
              type="datetime-local"
              value={draft.endAt}
            />
          </label>
          <label className="field">
            Địa điểm
            <input
              maxLength={160}
              onChange={(event) =>
                onChange({ ...draft, location: event.target.value })
              }
              placeholder="Đồi chè Cầu Đất"
              value={draft.location}
            />
          </label>
          <label className="field">
            Loại hoạt động
            <select
              onChange={(event) =>
                onChange({
                  ...draft,
                  category: event.target.value as EventCategory,
                })
              }
              value={draft.category}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Trạng thái
            <select
              onChange={(event) =>
                onChange({
                  ...draft,
                  status: event.target.value as EventStatus,
                })
              }
              value={draft.status}
            >
              {Object.entries(STATUS_LABELS)
                .filter(([status]) => status !== "pending")
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            Chi phí
            <input
              min="0"
              onChange={(event) =>
                onChange({
                  ...draft,
                  amount: Number(event.target.value),
                })
              }
              step="1000"
              type="number"
              value={draft.amount}
            />
          </label>
          <fieldset className="participant-field full">
            <legend>Thành viên tham gia</legend>
            <div className="participant-options">
              {members.map((member) => (
                <label key={member.id}>
                  <input
                    checked={draft.participantIds.includes(member.userId)}
                    onChange={() => toggleParticipant(member.userId)}
                    type="checkbox"
                  />
                  <span>{member.displayName}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field full">
            Người đại diện trả
            <select
              disabled={draft.amount <= 0}
              onChange={(event) =>
                onChange({ ...draft, payerId: event.target.value || null })
              }
              value={draft.payerId ?? ""}
            >
              <option value="">Chọn người trả</option>
              {members
                .filter((member) =>
                  draft.participantIds.includes(member.userId),
                )
                .map((member) => (
                  <option key={member.id} value={member.userId}>
                    {member.displayName}
                  </option>
                ))}
            </select>
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        <div className="modal-actions">
          <button className="secondary-button" onClick={onCancel} type="button">
            Hủy
          </button>
          <button
            className="primary-button"
            disabled={saving}
            onClick={onSubmit}
            type="button"
          >
            {saving ? "Đang lưu…" : isEditing ? "Lưu thay đổi" : "Tạo event"}
          </button>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <Compass />
      <span>{message}</span>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedCurrency(value: number): string {
  if (value === 0) return formatCurrency(0);
  return `${value > 0 ? "+" : "−"}${formatCurrency(Math.abs(value))}`;
}

function formatDateRange(startDate: string, endDate: string): string {
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${formatter.format(new Date(`${startDate}T00:00:00`))} – ${formatter.format(
    new Date(`${endDate}T00:00:00`),
  )}`;
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function initials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
