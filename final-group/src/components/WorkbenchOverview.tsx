import { ArrowRight, CalendarBlank, Clock, CurrencyCircleDollar, Plus, UsersThree } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { TripSnapshot } from "../firebase/contracts";
import { formatVnd } from "../features/expenses/expense-calculations";

interface WorkbenchOverviewProps {
  currentUserId: string;
  onOpenExpenses: () => void;
  onOpenSchedule: () => void;
  snapshot: TripSnapshot;
}

export function WorkbenchOverview({
  currentUserId,
  onOpenExpenses,
  onOpenSchedule,
  snapshot,
}: WorkbenchOverviewProps) {
  const nextEvent = [...snapshot.events]
    .filter((event) => event.status !== "cancelled")
    .sort((left, right) => left.order - right.order || Date.parse(left.startAt) - Date.parse(right.startAt))[0];
  const pendingEvents = snapshot.events.filter((event) => event.status === "pending").length;
  const totalExpenses = snapshot.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const currentMember = snapshot.members.find((member) => member.uid === currentUserId);

  return (
    <div className="workbench-overview">
      <header className="workbench-page-heading">
        <div>
          <span className="workbench-eyebrow">LIVE TRIP BOARD</span>
          <h1>{snapshot.trip.name}</h1>
          <p>{snapshot.trip.destination} · {formatDateRange(snapshot.trip.startDate, snapshot.trip.endDate)}</p>
        </div>
        <span className={`workbench-status-chip ${currentMember?.role ?? "member"}`}>
          {currentMember?.role === "lead" ? "Lead chuyến đi" : "Thành viên"}
        </span>
      </header>

      <section aria-label="Tóm tắt chuyến đi" className="workbench-metric-grid">
        <Metric icon={<CalendarBlank aria-hidden="true" size={19} />} label="Hoạt động" value={`${snapshot.events.length} hoạt động`} />
        <Metric icon={<UsersThree aria-hidden="true" size={19} />} label="Nhóm" value={`${snapshot.members.length} thành viên`} />
        <Metric icon={<CurrencyCircleDollar aria-hidden="true" size={19} />} label="Đã ghi" value={formatVnd(totalExpenses)} />
      </section>

      <section className="workbench-overview-grid">
        <motion.article className="workbench-overview-card workbench-next-card" layout>
          <div className="workbench-card-heading">
            <div>
              <span className="workbench-eyebrow">TIẾP THEO</span>
              <h2>{nextEvent ? nextEvent.title : "Chưa có hoạt động"}</h2>
            </div>
            <Clock aria-hidden="true" className="workbench-card-icon" size={22} />
          </div>
          {nextEvent ? (
            <>
              <p>{formatDateTime(nextEvent.startAt)} — {formatDateTime(nextEvent.endAt)}</p>
              <span className={`workbench-status-chip ${nextEvent.status}`}>{statusLabel(nextEvent.status)}</span>
            </>
          ) : (
            <p>Thêm hoạt động đầu tiên để nhóm bắt đầu xây lịch trình.</p>
          )}
          <button className="workbench-text-action" onClick={onOpenSchedule} type="button">
            Mở lịch trình <ArrowRight aria-hidden="true" size={16} />
          </button>
        </motion.article>

        <motion.article className="workbench-overview-card" layout>
          <div className="workbench-card-heading">
            <div>
              <span className="workbench-eyebrow">CẦN XỬ LÝ</span>
              <h2>{pendingEvents ? `${pendingEvents} hoạt động chờ duyệt` : "Không có việc chờ"}</h2>
            </div>
            <span aria-hidden="true" className={`workbench-pulse-dot${pendingEvents ? " pending" : ""}`} />
          </div>
          <p>
            {pendingEvents
              ? "Lead có thể duyệt các đề xuất từ thành viên trong màn Lịch trình."
              : "Mọi đề xuất của nhóm đã được xử lý."}
          </p>
          <button className="workbench-text-action" onClick={onOpenSchedule} type="button">
            Kiểm tra hàng đợi <ArrowRight aria-hidden="true" size={16} />
          </button>
        </motion.article>
      </section>

      <section className="workbench-quick-actions" aria-label="Thao tác nhanh">
        <div>
          <span className="workbench-eyebrow">QUICK ACTIONS</span>
          <h2>Giữ chuyến đi luôn cập nhật</h2>
        </div>
        <div className="workbench-action-row">
          <button className="workbench-primary-action" onClick={onOpenSchedule} type="button">
            <Plus aria-hidden="true" size={17} /> Thêm hoạt động
          </button>
          <button className="workbench-secondary-action" onClick={onOpenExpenses} type="button">
            <CurrencyCircleDollar aria-hidden="true" size={17} /> Thêm khoản chi
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <motion.article className="workbench-metric-card" layout>
      <span className="workbench-metric-icon">{icon}</span>
      <span className="workbench-eyebrow">{label}</span>
      <strong>{value}</strong>
    </motion.article>
  );
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} — ${formatDate(end)}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: TripSnapshot["events"][number]["status"]): string {
  switch (status) {
    case "pending":
      return "Chờ duyệt";
    case "approved":
      return "Đã duyệt";
    case "happening":
      return "Đang diễn ra";
    case "completed":
      return "Đã hoàn thành";
    case "cancelled":
      return "Đã huỷ";
    default:
      return status;
  }
}
