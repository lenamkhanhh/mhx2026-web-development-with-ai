import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  CalendarBlank,
  ChartBar,
  Compass,
  CurrencyCircleDollar,
  HashStraight,
  MagnifyingGlass,
  SignOut,
  UsersThree,
} from "@phosphor-icons/react";
import "./workbench.css";

export type WorkbenchView = "overview" | "schedule" | "expenses" | "members";
export type WorkbenchRole = "lead" | "member";

export interface WorkbenchTripSummary {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
}

export interface WorkbenchShellProps {
  activeView: WorkbenchView;
  children: ReactNode;
  displayName: string;
  memberCount: number;
  onChangeView: (view: WorkbenchView) => void;
  onLogout: () => void | Promise<void>;
  pendingCount: number;
  role: WorkbenchRole;
  trip: WorkbenchTripSummary;
}

const NAV_ITEMS: Array<{
  id: WorkbenchView;
  label: string;
  pageLabel: string;
  icon: typeof Compass;
  searchTerms: string;
}> = [
  { id: "overview", label: "Tổng quan", pageLabel: "TỔNG QUAN", icon: Compass, searchTerms: "tong quan overview" },
  { id: "schedule", label: "Lịch trình", pageLabel: "LỊCH TRÌNH", icon: CalendarBlank, searchTerms: "lich trinh timeline su kien hoat dong" },
  { id: "expenses", label: "Chi phí", pageLabel: "CHI PHÍ", icon: CurrencyCircleDollar, searchTerms: "chi phi expenses khoan chi" },
  { id: "members", label: "Thành viên", pageLabel: "THÀNH VIÊN", icon: UsersThree, searchTerms: "thanh vien members nhom" },
];

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("vi-VN");
}

export function WorkbenchShell({
  activeView,
  children,
  displayName,
  memberCount,
  onChangeView,
  onLogout,
  pendingCount,
  role,
  trip,
}: WorkbenchShellProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const activeItem = NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0];
  const searchResults = useMemo(() => {
    const query = normalized(searchQuery.trim());
    if (!query) return [];
    return NAV_ITEMS.filter((item) => normalized(`${item.label} ${item.searchTerms}`).includes(query));
  }, [searchQuery]);

  const changeView = (view: WorkbenchView) => {
    onChangeView(view);
    setSearchQuery("");
  };

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
            <strong>{trip.name}</strong>
            <span className="workbench-trip-state">
              <span aria-hidden="true" className="workbench-online-dot" />
              Đồng bộ
            </span>
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
                    changeView(id);
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

          <div className="workbench-sidebar-shortcuts">
            <span className="workbench-sidebar-label">PHÍM TẮT</span>
            <button onClick={() => changeView("schedule")} type="button">
              Hoạt động mới <kbd>N</kbd>
            </button>
            <button onClick={() => changeView("expenses")} type="button">
              Khoản chi mới <kbd>E</kbd>
            </button>
          </div>

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
            <div className="workbench-search">
              <MagnifyingGlass aria-hidden="true" size={18} />
              <input
                aria-label="Tìm nhanh trong TripFlow"
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchQuery("");
                }}
                placeholder="Tìm chuyến đi, lịch trình, chi phí, thành viên..."
                type="search"
                value={searchQuery}
              />
              <kbd>⌘ K</kbd>
              {searchQuery ? (
                <div className="workbench-search-results">
                  {searchResults.length ? searchResults.map((item) => (
                    <button
                      aria-label={`Mở ${item.label}`}
                      key={item.id}
                      onClick={() => changeView(item.id)}
                      type="button"
                    >
                      <item.icon aria-hidden="true" size={17} />
                      <span>{item.label}</span>
                    </button>
                  )) : <span>Không tìm thấy màn hình phù hợp.</span>}
                </div>
              ) : null}
            </div>

            <div aria-label="Trạng thái hệ thống" className="workbench-system-status" role="status">
              <span aria-hidden="true" className="workbench-online-dot" />
              <span>Firebase: ready</span>
              <span className="workbench-status-separator">·</span>
              <span className={`workbench-role-pill ${role}`}>{role === "lead" ? "LEAD" : "MEMBER"}</span>
            </div>
          </header>

          <header className="workbench-page-header">
            <div className="workbench-title-row">
              <div>
                <h1>{trip.name.toLocaleUpperCase("vi-VN")} / {activeItem.pageLabel}</h1>
                <div className="workbench-page-meta">
                  <span><CalendarBlank aria-hidden="true" size={16} /> {formatDate(trip.startDate)} — {formatDate(trip.endDate)}</span>
                  <span><UsersThree aria-hidden="true" size={16} /> {memberCount} thành viên</span>
                  <span><HashStraight aria-hidden="true" size={16} /> # {trip.id.toLocaleUpperCase("vi-VN")}</span>
                </div>
              </div>
              <span className={`workbench-role-label ${role}`}>
                {role === "lead" ? "Lead chuyến đi" : "Thành viên"}
              </span>
            </div>

            <nav aria-label="Màn hình chuyến đi" className="workbench-page-tabs">
              {NAV_ITEMS.map((item) => (
                <a
                  aria-current={activeView === item.id ? "page" : undefined}
                  className={activeView === item.id ? "active" : undefined}
                  href={`#${item.id}`}
                  key={item.id}
                  onClick={(event) => {
                    event.preventDefault();
                    changeView(item.id);
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
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
