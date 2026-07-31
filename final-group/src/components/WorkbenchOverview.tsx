import {
  AirplaneTilt,
  ArrowDown,
  ArrowUp,
  ArrowsDownUp,
  Buildings,
  CaretDown,
  Check,
  DotsThree,
  Funnel,
  ForkKnife,
  ArrowCounterClockwise,
  CheckCircle,
  ListPlus,
  Minus,
  NotePencil,
  MapPinLine,
  Plus,
  SquaresFour,
} from "@phosphor-icons/react";
import { createElement, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { EventRecord, ExpenseCategory, FirestoreEventCategory, TripSnapshot } from "../firebase/contracts";
import { formatVnd } from "../features/expenses/expense-calculations";

interface WorkbenchOverviewProps {
  currentUserId: string;
  onOpenExpenses: () => void;
  onOpenSchedule: (eventId?: string) => void;
  snapshot: TripSnapshot;
}

type OverviewFilter = "all" | "open" | "pending" | "done";
type OverviewSort = "time-asc" | "time-desc" | "title";
type OverviewCategoryFilter = "all" | FirestoreEventCategory;
type CategoryVisual = "transport" | "stay" | "food" | "activity" | "other" | "uncategorized";

const CATEGORY_VISUALS: Record<CategoryVisual, { icon: ComponentType<{ "aria-hidden"?: boolean; size?: number }>; label: string }> = {
  transport: { icon: AirplaneTilt, label: "Transport" },
  stay: { icon: Buildings, label: "Stay" },
  food: { icon: ForkKnife, label: "Food & drinks" },
  activity: { icon: MapPinLine, label: "Activity" },
  other: { icon: SquaresFour, label: "Other" },
  uncategorized: { icon: SquaresFour, label: "Uncategorized" },
};

const CATEGORY_META: Record<FirestoreEventCategory, { label: string; visual: CategoryVisual }> = {
  transport: { label: "Transport", visual: "transport" },
  stay: { label: "Stay", visual: "stay" },
  food: { label: "Food & drinks", visual: "food" },
  activity: { label: "Activity", visual: "activity" },
  other: { label: "Other", visual: "other" },
};

const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transport: "Transport",
  accommodation: "Accommodation",
  food: "Food & drinks",
  activities: "Activities",
  other: "Other",
};

const EXPENSE_CATEGORY_VISUAL: Record<ExpenseCategory | "uncategorized", CategoryVisual> = {
  transport: "transport",
  accommodation: "stay",
  food: "food",
  activities: "activity",
  other: "other",
  uncategorized: "uncategorized",
};

const ACTIVITY_META = {
  note_added: { icon: NotePencil, tone: "note" },
  subitem_added: { icon: ListPlus, tone: "add" },
  subitem_completed: { icon: CheckCircle, tone: "done" },
  subitem_reopened: { icon: ArrowCounterClockwise, tone: "review" },
} as const;

export function WorkbenchOverview({
  currentUserId,
  onOpenExpenses,
  onOpenSchedule,
  snapshot,
}: WorkbenchOverviewProps) {
  const [filter, setFilter] = useState<OverviewFilter>("all");
  const [sort, setSort] = useState<OverviewSort>("time-asc");
  const [categoryFilter, setCategoryFilter] = useState<OverviewCategoryFilter>("all");
  const [openToolbarMenu, setOpenToolbarMenu] = useState<"filter" | "sort" | null>(null);
  const toolbarActionsRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!openToolbarMenu) return;
    const closeOutside = (event: PointerEvent) => {
      if (!toolbarActionsRef.current?.contains(event.target as Node)) setOpenToolbarMenu(null);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const trigger = openToolbarMenu === "filter" ? filterButtonRef.current : sortButtonRef.current;
      setOpenToolbarMenu(null);
      trigger?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [openToolbarMenu]);
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
    if (categoryFilter !== "all" && event.category !== categoryFilter) return false;
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
  const budgetUsage = snapshot.trip.budgetVnd === undefined
    ? undefined
    : Math.min(100, Math.round((totalExpenses / snapshot.trip.budgetVnd) * 100));
  const expenseBreakdown = Object.entries(
    snapshot.expenses.reduce<Record<string, number>>((totals, expense) => {
      const key = expense.category ?? "uncategorized";
      totals[key] = (totals[key] ?? 0) + expense.amount;
      return totals;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);
  const currentMember = snapshot.members.find((member) => member.uid === currentUserId);
  const memberById = new Map(snapshot.members.map((member) => [member.uid, member]));
  const recentExpenses = [...snapshot.expenses]
    .filter((expense) => expense.createdAt)
    .sort((left, right) => Date.parse(right.createdAt!) - Date.parse(left.createdAt!))
    .slice(0, 3);
  const activityItems = (snapshot.activity ?? [])
    .map((activity) => ({
      actorId: activity.actorId,
      id: activity.id,
      kind: activity.kind,
      label: activity.label,
      meta: ACTIVITY_META[activity.kind],
      timestamp: activity.createdAt,
    }))
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
    .slice(0, 6);

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
          <div className="workbench-table-toolbar-actions" ref={toolbarActionsRef}>
            <ToolbarPopover icon={Funnel} label="Filter" open={openToolbarMenu === "filter"} onToggle={() => setOpenToolbarMenu(openToolbarMenu === "filter" ? null : "filter")} triggerRef={filterButtonRef}>
              <label>
                <span>Category</span>
                <select aria-label="Filter itinerary" onChange={(event) => { setCategoryFilter(event.target.value as OverviewCategoryFilter); setOpenToolbarMenu(null); }} value={categoryFilter}>
                  <option value="all">All items</option>
                  {Object.entries(CATEGORY_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                </select>
              </label>
            </ToolbarPopover>
            <ToolbarPopover icon={ArrowsDownUp} label="Sort" open={openToolbarMenu === "sort"} onToggle={() => setOpenToolbarMenu(openToolbarMenu === "sort" ? null : "sort")} triggerRef={sortButtonRef}>
              <label>
                <span>Order</span>
                <select aria-label="Sort itinerary" onChange={(event) => { setSort(event.target.value as OverviewSort); setOpenToolbarMenu(null); }} value={sort}>
                  <option value="time-asc">Time ascending</option>
                  <option value="time-desc">Newest first</option>
                  <option value="title">Title</option>
                </select>
              </label>
            </ToolbarPopover>
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
                <th>Location</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Priority</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visibleEvents.length ? visibleEvents.map((event, index) => {
                const category = CATEGORY_META[event.category];
                const assignee = event.assigneeUid ? memberById.get(event.assigneeUid) : undefined;
                return (
                  <tr key={event.id}>
                    <td className="workbench-row-index">{index + 1}</td>
                    <td>
                      <div className="workbench-event-cell">
                        <CategoryGlyph className="workbench-category-glyph" testId={`event-category-${event.id}`} visual={category.visual} />
                        <span>
                          <strong>{event.title}</strong>
                          <small>{category.label}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="workbench-date-cell">{formatEventDate(event.startAt)}</span>
                    </td>
                    <td><span className="workbench-location-cell">{event.location ?? "—"}</span></td>
                    <td>
                      {assignee ? (
                        <span className="workbench-assignee-name" title={assignee.displayName}>{assignee.displayName}</span>
                      ) : <span className="workbench-empty-cell">—</span>}
                    </td>
                    <td><EventStatus status={event.status} /></td>
                    <td><EventPriority priority={event.priority} /></td>
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
                  <td className="workbench-table-empty" colSpan={8}>
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

      <aside aria-label="Trip context" className="workbench-context-rail" data-current-member-role={currentMember?.role ?? "member"}>
        <ContextPanel action="View timeline" onAction={onOpenSchedule} title="Activity feed">
          {activityItems.length ? (
            <ul className="workbench-context-list">
              {activityItems.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <span className={`workbench-context-icon activity-${item.meta.tone}`}>{createElement(item.meta.icon, { "aria-hidden": true, size: 15 })}</span>
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
          <div className="workbench-expense-progress" aria-label={budgetUsage === undefined ? "Budget not set" : `${budgetUsage}% of budget used`}>
            <span style={{ width: `${budgetUsage ?? 0}%` }} />
          </div>
          <dl className="workbench-expense-breakdown">
            <div><dt>Budget</dt><dd>{snapshot.trip.budgetVnd === undefined ? "Not set" : formatVnd(snapshot.trip.budgetVnd)}</dd></div>
            <div><dt>Settled</dt><dd>{formatVnd(settledExpenses)}</dd></div>
            <div><dt>Pending</dt><dd>{formatVnd(pendingExpenses)}</dd></div>
            {expenseBreakdown.map(([category, amount]) => (
              <div key={category}>
                <dt>{category === "uncategorized" ? "Uncategorized" : EXPENSE_CATEGORY_LABELS[category as ExpenseCategory]}</dt>
                <dd>{formatVnd(amount)}</dd>
              </div>
            ))}
          </dl>
        </ContextPanel>

        <ContextPanel action="View all" onAction={onOpenExpenses} title="Recent expenses">
          {recentExpenses.length ? (
            <ul className="workbench-context-list expenses">
              {recentExpenses.map((expense) => (
                <li data-expense-category={expense.category ?? "uncategorized"} data-testid={`recent-expense-${expense.id}`} key={expense.id}>
                  {(() => {
                    const category = expense.category ?? "uncategorized";
                    return (
                      <CategoryGlyph className={`workbench-context-icon expense expense-${category} workbench-category-glyph`} visual={EXPENSE_CATEGORY_VISUAL[category]} />
                    );
                  })()}
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

function EventPriority({ priority }: { priority: EventRecord["priority"] }) {
  if (!priority) return <span className="workbench-empty-cell">—</span>;
  const Icon = priority === "high" ? ArrowUp : priority === "low" ? ArrowDown : Minus;
  const label = `${priority[0].toUpperCase()}${priority.slice(1)}`;
  return <span aria-label={`${label} priority`} className={`workbench-event-priority ${priority}`}><Icon aria-hidden="true" size={15} weight="bold" />{label}</span>;
}

function CategoryGlyph({ className, testId, visual }: { className: string; testId?: string; visual: CategoryVisual }) {
  const meta = CATEGORY_VISUALS[visual];
  const Icon = meta.icon;
  return <span aria-label={meta.label} className={className} data-category-visual={visual} data-testid={testId} role="img"><Icon aria-hidden={true} size={17} /></span>;
}

function ToolbarPopover({ children, icon: Icon, label, onToggle, open, triggerRef }: {
  children: React.ReactNode;
  icon: ComponentType<{ "aria-hidden"?: boolean; size?: number }>;
  label: string;
  onToggle: () => void;
  open: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return <div className="workbench-toolbar-menu">
    <button aria-expanded={open} aria-haspopup="dialog" className="workbench-toolbar-trigger" onClick={onToggle} ref={triggerRef} type="button">
      <span>{label}</span><Icon aria-hidden={true} size={16} /><CaretDown aria-hidden={true} className="workbench-toolbar-caret" size={12} />
    </button>
    {open ? <div aria-label={`${label} options`} className="workbench-toolbar-popover" role="dialog">{children}</div> : null}
  </div>;
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
