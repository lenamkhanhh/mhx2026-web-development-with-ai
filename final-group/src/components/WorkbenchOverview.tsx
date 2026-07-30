import {
  AirplaneTilt,
  ArrowsDownUp,
  Bed,
  CalendarBlank,
  Check,
  Clock,
  CurrencyCircleDollar,
  DotsThree,
  ForkKnife,
  MapPinLine,
  Plus,
  SquaresFour,
  UsersThree,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import type { EventRecord, FirestoreEventCategory, TripSnapshot } from "../firebase/contracts";
import { formatVnd } from "../features/expenses/expense-calculations";

interface WorkbenchOverviewProps {
  currentUserId: string;
  onOpenExpenses: () => void;
  onOpenSchedule: (eventId?: string) => void;
  snapshot: TripSnapshot;
}

type OverviewFilter = "all" | "open" | "pending" | "done";
type OverviewSort = "time-asc" | "time-desc" | "title";

const CATEGORY_META: Record<
  FirestoreEventCategory,
  { icon: ComponentType<{ "aria-hidden"?: boolean; size?: number }>; label: string }
> = {
  transport: { icon: AirplaneTilt, label: "Di chuyển" },
  stay: { icon: Bed, label: "Lưu trú" },
  food: { icon: ForkKnife, label: "Ăn uống" },
  activity: { icon: MapPinLine, label: "Hoạt động" },
  other: { icon: SquaresFour, label: "Khác" },
};

export function WorkbenchOverview({
  currentUserId,
  onOpenExpenses,
  onOpenSchedule,
  snapshot,
}: WorkbenchOverviewProps) {
  const [filter, setFilter] = useState<OverviewFilter>("all");
  const [sort, setSort] = useState<OverviewSort>("time-asc");
  const orderedEvents = useMemo(
    () => [...snapshot.events].sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title, "vi");
      const byTime = Date.parse(left.startAt) - Date.parse(right.startAt);
      return sort === "time-desc" ? -byTime : (left.order - right.order || byTime);
    }),
    [snapshot.events, sort],
  );
  const counts = {
    open: orderedEvents.filter((event) => event.status === "approved" || event.status === "happening").length,
    pending: orderedEvents.filter((event) => event.status === "pending").length,
    done: orderedEvents.filter((event) => event.status === "completed").length,
  };
  const visibleEvents = orderedEvents.filter((event) => {
    if (filter === "all") return true;
    if (filter === "open") return event.status === "approved" || event.status === "happening";
    if (filter === "pending") return event.status === "pending";
    return event.status === "completed";
  });
  const pendingEvents = orderedEvents.filter((event) => event.status === "pending");
  const totalExpenses = snapshot.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const settledExpenses = snapshot.expenses
    .filter((expense) => expense.status === "settled")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const pendingExpenses = totalExpenses - settledExpenses;
  const recentExpenses = [...snapshot.expenses].slice(-3).reverse();
  const currentMember = snapshot.members.find((member) => member.uid === currentUserId);
  const memberById = new Map(snapshot.members.map((member) => [member.uid, member]));

  return (
    <div className="workbench-overview">
      <section className="workbench-overview-main" aria-label="Trung tâm điều hành chuyến đi">
        <div className="workbench-overview-toolbar">
          <div className="workbench-status-counters" aria-label="Bộ lọc trạng thái">
            <StatusFilter
              active={filter === "open"}
              count={counts.open}
              label="Đang mở"
              onClick={() => setFilter(filter === "open" ? "all" : "open")}
              tone="open"
            />
            <StatusFilter
              active={filter === "pending"}
              count={counts.pending}
              label="Chờ duyệt"
              onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
              tone="pending"
            />
            <StatusFilter
              active={filter === "done"}
              count={counts.done}
              label="Hoàn tất"
              onClick={() => setFilter(filter === "done" ? "all" : "done")}
              tone="done"
            />
          </div>
          <div className="workbench-table-toolbar-actions">
            <label className="workbench-sort-control">
              <span>Sắp xếp</span>
              <select aria-label="Sắp xếp hoạt động" onChange={(event) => setSort(event.target.value as OverviewSort)} value={sort}>
                <option value="time-asc">Theo thời gian</option>
                <option value="time-desc">Mới nhất trước</option>
                <option value="title">Theo tên</option>
              </select>
            </label>
            <button className="workbench-table-add" onClick={() => onOpenSchedule()} type="button">
              <Plus aria-hidden="true" size={16} /> Thêm hoạt động
            </button>
          </div>
        </div>

        <div className="workbench-table-frame">
          <table aria-label="Danh sách hoạt động" className="workbench-table">
            <thead>
              <tr>
                <th aria-label="Số thứ tự">#</th>
                <th>Hoạt động</th>
                <th>Ngày &amp; giờ</th>
                <th>Người tham gia</th>
                <th>Trạng thái</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {visibleEvents.length ? visibleEvents.map((event, index) => {
                const category = CATEGORY_META[event.category];
                const Icon = category.icon;
                const participants = event.participantIds
                  .map((uid) => memberById.get(uid))
                  .filter((member) => member !== undefined);
                return (
                  <tr key={event.id}>
                    <td className="workbench-row-index">{index + 1}</td>
                    <td>
                      <div className="workbench-event-cell">
                        <Icon aria-hidden={true} size={17} />
                        <span>
                          <strong>{event.title}</strong>
                          <small>{category.label}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="workbench-date-cell">{formatEventDate(event.startAt)}</span>
                    </td>
                    <td>
                      <div className="workbench-participants" aria-label={`${participants.length} người tham gia`}>
                        {participants.slice(0, 3).map((member) => (
                          <span aria-label={member.displayName} className="workbench-mini-avatar" key={member.uid}>
                            {initials(member.displayName)}
                          </span>
                        ))}
                        {participants.length > 3 ? <small>+{participants.length - 3}</small> : null}
                      </div>
                    </td>
                    <td><EventStatus status={event.status} /></td>
                    <td>
                      <button
                        aria-label={`Mở ${event.title} trong lịch trình`}
                        className="workbench-row-action"
                        onClick={() => onOpenSchedule(event.id)}
                        type="button"
                      >
                        <DotsThree aria-hidden="true" size={19} weight="bold" />
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td className="workbench-table-empty" colSpan={6}>
                    Không có hoạt động ở trạng thái này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="workbench-table-footer">
            <button onClick={() => onOpenSchedule()} type="button"><Plus aria-hidden="true" size={15} /> Thêm hoạt động</button>
            <span>{visibleEvents.length} mục</span>
            <button className="workbench-table-reorder-link" onClick={() => onOpenSchedule()} type="button">
              <ArrowsDownUp aria-hidden="true" size={14} /> Sắp xếp lại ở Lịch trình
            </button>
          </div>
        </div>
      </section>

      <aside aria-label="Ngữ cảnh chuyến đi" className="workbench-context-rail">
        <ContextPanel
          action={pendingEvents.length ? "Mở lịch trình" : undefined}
          onAction={pendingEvents.length ? onOpenSchedule : undefined}
          title="Hàng chờ duyệt"
        >
          {pendingEvents.length ? (
            <ul className="workbench-context-list">
              {pendingEvents.slice(0, 4).map((event) => (
                <li key={event.id}>
                  <span className="workbench-context-icon pending"><Clock aria-hidden="true" size={15} /></span>
                  <span><strong>{event.title}</strong><small>{formatEventDate(event.startAt)}</small></span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="workbench-context-empty">
              <Check aria-hidden="true" size={17} />
              <span>Mọi đề xuất đã được xử lý.</span>
            </div>
          )}
        </ContextPanel>

        <ContextPanel action="Xem chi phí" onAction={onOpenExpenses} title="Tổng chi">
          <div className="workbench-expense-total">
            <strong>{formatVnd(totalExpenses)}</strong>
            <small>{snapshot.expenses.length} khoản chi</small>
          </div>
          <div className="workbench-expense-progress" aria-label={`${settledExpenses} đồng đã đối soát`}>
            <span style={{ width: `${totalExpenses ? Math.round((settledExpenses / totalExpenses) * 100) : 0}%` }} />
          </div>
          <dl className="workbench-expense-breakdown">
            <div><dt>Đã đối soát</dt><dd>{formatVnd(settledExpenses)}</dd></div>
            <div><dt>Đang chờ</dt><dd>{formatVnd(pendingExpenses)}</dd></div>
          </dl>
        </ContextPanel>

        <ContextPanel action="Xem tất cả" onAction={onOpenExpenses} title="Chi gần đây">
          {recentExpenses.length ? (
            <ul className="workbench-context-list expenses">
              {recentExpenses.map((expense) => (
                <li key={expense.id}>
                  <span className="workbench-context-icon expense">
                    <CurrencyCircleDollar aria-hidden="true" size={15} />
                  </span>
                  <span>
                    <strong>{expense.title}</strong>
                    <small>{memberById.get(expense.paidBy)?.displayName ?? "Thành viên"}</small>
                  </span>
                  <b>{formatVnd(expense.amount)}</b>
                </li>
              ))}
            </ul>
          ) : <p className="workbench-context-note">Chưa có khoản chi nào.</p>}
          <button className="workbench-context-create" onClick={onOpenExpenses} type="button">
            <Plus aria-hidden="true" size={15} /> Thêm khoản chi
          </button>
        </ContextPanel>

        <div className="workbench-current-role">
          <UsersThree aria-hidden="true" size={16} />
          <span>{currentMember?.role === "lead" ? "Bạn đang điều hành chuyến đi" : "Bạn là thành viên chuyến đi"}</span>
        </div>
      </aside>
    </div>
  );
}

function StatusFilter({
  active,
  count,
  label,
  onClick,
  tone,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
  tone: "open" | "pending" | "done";
}) {
  return (
    <button
      aria-label={`${label} ${count}`}
      aria-pressed={active}
      className={`workbench-status-filter ${tone}${active ? " active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <strong>{count}</strong>
    </button>
  );
}

function ContextPanel({
  action,
  children,
  onAction,
  title,
}: {
  action?: string;
  children: React.ReactNode;
  onAction?: () => void;
  title: string;
}) {
  return (
    <section className="workbench-context-panel">
      <header>
        <h2>{title}</h2>
        {action && onAction ? <button onClick={onAction} type="button">{action}</button> : null}
      </header>
      {children}
    </section>
  );
}

function EventStatus({ status }: { status: EventRecord["status"] }) {
  return <span className={`workbench-event-status ${status}`}>{statusLabel(status)}</span>;
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function statusLabel(status: EventRecord["status"]): string {
  switch (status) {
    case "pending":
      return "Chờ duyệt";
    case "approved":
      return "Đang mở";
    case "happening":
      return "Đang diễn ra";
    case "completed":
      return "Hoàn tất";
    case "cancelled":
      return "Đã huỷ";
  }
}
