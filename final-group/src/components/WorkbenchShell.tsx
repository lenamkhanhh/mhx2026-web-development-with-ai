import type { ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  CalendarBlank,
  ChartBar,
  Compass,
  CurrencyCircleDollar,
  SignOut,
  UsersThree,
} from "@phosphor-icons/react";
import "./workbench.css";

export type WorkbenchView = "overview" | "schedule" | "expenses" | "members";
export type WorkbenchRole = "lead" | "member";

export interface WorkbenchTripSummary {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
}

export interface WorkbenchShellProps {
  activeView: WorkbenchView;
  children: ReactNode;
  displayName: string;
  // eslint-disable-next-line no-unused-vars
  onChangeView: (view: WorkbenchView) => void;
  onLogout: () => void | Promise<void>;
  pendingCount: number;
  role: WorkbenchRole;
  trip: WorkbenchTripSummary;
}

const NAV_ITEMS: Array<{
  id: WorkbenchView;
  label: string;
  icon: typeof Compass;
}> = [
  { id: "overview", label: "Tổng quan", icon: Compass },
  { id: "schedule", label: "Lịch trình", icon: CalendarBlank },
  { id: "expenses", label: "Chi phí", icon: CurrencyCircleDollar },
  { id: "members", label: "Thành viên", icon: UsersThree },
];

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

export function WorkbenchShell({
  activeView,
  children,
  displayName,
  onChangeView,
  onLogout,
  pendingCount,
  role,
  trip,
}: WorkbenchShellProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="workbench-shell">
        <aside className="workbench-sidebar">
          <div className="workbench-brand">
            <span aria-hidden="true" className="workbench-brand-mark">↗</span>
            <span>
              <strong>TripFlow</strong>
              <small>Workbench</small>
            </span>
          </div>

          <div className="workbench-sidebar-label">WORKSPACE</div>
          <div className="workbench-trip-card">
            <span className="workbench-trip-state">
              <span aria-hidden="true" className="workbench-online-dot" />
              Đang hoạt động
            </span>
            <strong>{trip.name}</strong>
            <small>{trip.destination} · {formatDate(trip.startDate)} — {formatDate(trip.endDate)}</small>
          </div>

          <nav aria-label="Điều hướng TripFlow" className="workbench-nav">
            {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
              const isActive = activeView === id;
              return (
                <a
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                  className={`workbench-nav-item${isActive ? " active" : ""}`}
                  href={`#${id}`}
                  key={id}
                  onClick={(event) => {
                    event.preventDefault();
                    onChangeView(id);
                  }}
                >
                  {isActive ? <motion.span className="workbench-nav-active-rail" layoutId="workbench-active-rail" /> : null}
                  <Icon aria-hidden="true" size={18} weight={isActive ? "fill" : "regular"} />
                  <span>{label}</span>
                  {id === "schedule" && pendingCount > 0 ? (
                    <span className="workbench-nav-badge">{pendingCount}</span>
                  ) : null}
                </a>
              );
            })}
          </nav>

          <div className="workbench-sidebar-footer">
            <div className="workbench-user">
              <span aria-hidden="true" className="workbench-avatar">{initials(displayName)}</span>
              <span>
                <strong>{displayName}</strong>
                <small>{role === "lead" ? "Lead chuyến đi" : "Thành viên"}</small>
              </span>
            </div>
            <button aria-label="Đăng xuất" className="workbench-logout" onClick={() => void onLogout()} type="button">
              <SignOut aria-hidden="true" size={17} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>

        <section className="workbench-main">
          <header className="workbench-topbar">
            <div className="workbench-breadcrumb">
              <span>TRIPFLOW</span>
              <span aria-hidden="true">/</span>
              <strong>{NAV_ITEMS.find((item) => item.id === activeView)?.label}</strong>
            </div>
            <div aria-label="Trạng thái hệ thống" className="workbench-system-status" role="status">
              <span aria-hidden="true" className="workbench-online-dot" />
              <span>Firebase</span>
              <span className="workbench-status-separator">·</span>
              <span>Đồng bộ</span>
              <span className={`workbench-role-pill ${role}`}>{role === "lead" ? "LEAD" : "MEMBER"}</span>
            </div>
          </header>

          <main className="workbench-content">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="workbench-view"
                exit={{ opacity: 0, y: -4 }}
                initial={{ opacity: 0, y: 6 }}
                key={activeView}
                transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          <footer className="workbench-footer">
            <ChartBar aria-hidden="true" size={14} />
            <span>Trip workspace · dữ liệu cập nhật theo thời gian thực</span>
          </footer>
        </section>
      </div>
    </MotionConfig>
  );
}
