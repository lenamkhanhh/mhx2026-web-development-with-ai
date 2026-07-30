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
  transport: { icon: AirplaneTilt, label: "Transport" },
  stay: { icon: Bed, label: "Stay" },
  food: { icon: ForkKnife, label: "Food & drinks" },
  activity: { icon: MapPinLine, label: "Activity" },
  other: { icon: SquaresFour, label: "Other" },
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
  const totalExpenses = snapshot.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const settledExpenses = snapshot.expenses
    .filter((expense) => expense.status === "settled")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const pendingExpenses = totalExpenses - settledExpenses;
  const currentMember = snapshot.members.find((member) => member.uid === currentUserId);
  const memberById = new Map(snapshot.members.map((member) => [member.uid, member]));
  const recentExpenses = [...snapshot.expenses]
    .filter((expense) => expense.createdAt)
    .sort((left, right) => Date.parse(right.createdAt!) - Date.parse(left.createdAt!))
    .slice(0, 3);
  const activityItems = [
    ...orderedEvents.flatMap((event) => event.createdAt ? [{
      actorId: event.createdBy,
      id: `event-${event.id}`,
      label: `Added item “${event.title}”`,
      timestamp: event.createdAt,
    }] : []),
    ...snapshot.expenses.flatMap((expense) => expense.createdAt ? [{
      actorId: expense.createdBy,
      id: `expense-${expense.id}`,
      label: `Added expense “${expense.title}”`,
      timestamp: expense.createdAt,
    }] : []),
  ].sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp)).slice(0, 6);

  return (
    <div className="workbench-overview">
      <section className="workbench-overview-main" aria-label="Trip operations center">
        <div className="workbench-overview-toolbar">
          <div className="workbench-status-counters" aria-label="Status filters">
            <StatusFilter
              active={filter === "open"}
              count={counts.open}
              label="Open"
              onClick={() => setFilter(filter === "open" ? "all" : "open")}
              tone="open"
            />
            <StatusFilter
              active={filter === "pending"}
              count={counts.pending}
              label="In review"
              onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
              tone="pending"
            />
            <StatusFilter
              active={filter === "done"}
              count={counts.done}
              label="Done"
              onClick={() => setFilter(filter === "done" ? "all" : "done")}
              tone="done"
            />
          </div>
          <div className="workbench-table-toolbar-actions">
            <label className="workbench-sort-control">
              <span>Sort</span>
              <select aria-label="Sort itinerary" onChange={(event) => setSort(event.target.value as OverviewSort)} value={sort}>
                <option value="time-asc">Time ascending</option>
                <option value="time-desc">Newest first</option>
                <option value="title">Title</option>
              </select>
            </label>
            <button className="workbench-table-add" onClick={() => onOpenSchedule()} type="button">
              <Plus aria-hidden="true" size={16} /> Add item
            </button>
          </div>
        </div>

        <div className="workbench-table-frame">
          <table aria-label="Trip itinerary" className="workbench-table">
            <thead>
              <tr>
                <th aria-label="Row number">#</th>
                <th>Item</th>
                <th>Date &amp; time</th>
                <th>Participants</th>
                <th>Status</th>
                <th aria-label="Actions" />
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
                      <div className="workbench-participants" aria-label={`${participants.length} participants`}>
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
                        aria-label={`Open ${event.title} in Timeline`}
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
                    No items match this status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="workbench-table-footer">
            <button onClick={() => onOpenSchedule()} type="button"><Plus aria-hidden="true" size={15} /> Add item</button>
            <span>{visibleEvents.length} items</span>
            <button className="workbench-table-reorder-link" onClick={() => onOpenSchedule()} type="button">
              <ArrowsDownUp aria-hidden="true" size={14} /> Reorder in Timeline
            </button>
          </div>
        </div>
      </section>

      <aside aria-label="Trip context" className="workbench-context-rail">
        <ContextPanel action="View timeline" onAction={onOpenSchedule} title="Activity feed">
          {activityItems.length ? (
            <ul className="workbench-context-list">
              {activityItems.map((item) => (
                <li key={item.id}>
                  <span className="workbench-context-icon pending"><Clock aria-hidden="true" size={15} /></span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>by {memberById.get(item.actorId)?.displayName ?? "Trip member"} · {formatActivityTime(item.timestamp)}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="workbench-context-empty">
              <Check aria-hidden="true" size={17} />
              <span>No persisted activity yet.</span>
            </div>
          )}
        </ContextPanel>

        <ContextPanel action="View expenses" onAction={onOpenExpenses} title="Expense summary">
          <div className="workbench-expense-total">
            <strong>{formatVnd(totalExpenses)}</strong>
            <small>{snapshot.expenses.length} {snapshot.expenses.length === 1 ? "expense" : "expenses"}</small>
          </div>
          <div className="workbench-expense-progress" aria-label={`${formatVnd(settledExpenses)} settled`}>
            <span style={{ width: `${totalExpenses ? Math.round((settledExpenses / totalExpenses) * 100) : 0}%` }} />
          </div>
          <dl className="workbench-expense-breakdown">
            <div><dt>Settled</dt><dd>{formatVnd(settledExpenses)}</dd></div>
            <div><dt>Pending</dt><dd>{formatVnd(pendingExpenses)}</dd></div>
          </dl>
        </ContextPanel>

        <ContextPanel action="View all" onAction={onOpenExpenses} title="Recent expenses">
          {recentExpenses.length ? (
            <ul className="workbench-context-list expenses">
              {recentExpenses.map((expense) => (
                <li key={expense.id}>
                  <span className="workbench-context-icon expense">
                    <CurrencyCircleDollar aria-hidden="true" size={15} />
                  </span>
                  <span>
                    <strong>{expense.title}</strong>
                    <small>{formatExpenseMeta(expense.createdAt!, memberById.get(expense.paidBy)?.displayName ?? "Member")}</small>
                  </span>
                  <b>{formatVnd(expense.amount)}</b>
                </li>
              ))}
            </ul>
          ) : <p className="workbench-context-note">No persisted expenses yet.</p>}
          <button className="workbench-context-create" onClick={onOpenExpenses} type="button">
            <Plus aria-hidden="true" size={15} /> Add expense
          </button>
        </ContextPanel>

        <div className="workbench-current-role">
          <UsersThree aria-hidden="true" size={16} />
          <span>{currentMember?.role === "lead" ? "You lead this trip" : "You are a trip member"}</span>
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
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatActivityTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatExpenseMeta(createdAt: string, payer: string): string {
  return `${new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(new Date(createdAt))} · ${payer}`;
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function statusLabel(status: EventRecord["status"]): string {
  switch (status) {
    case "pending":
      return "In review";
    case "approved":
      return "Open";
    case "happening":
      return "In progress";
    case "completed":
      return "Done";
    case "cancelled":
      return "Cancelled";
  }
}
