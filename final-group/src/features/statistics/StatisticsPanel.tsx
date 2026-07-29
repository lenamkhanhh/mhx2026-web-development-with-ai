import type { ExpenseMember, TripExpense } from "../expenses/expense-calculations";
import "./StatisticsPanel.css";
import { formatVnd } from "../expenses/expense-calculations";
import { calculateExpenseStatistics } from "./expense-statistics";

interface StatisticsPanelProps {
  members: ExpenseMember[];
  expenses: TripExpense[];
}

export function StatisticsPanel({ members, expenses }: StatisticsPanelProps) {
  const statistics = calculateExpenseStatistics(members, expenses);

  return (
    <section aria-labelledby="statistics-heading" className="view-stack statistics-workbench">
      <div className="section-heading page-heading">
        <div>
          <span className="eyebrow">Trip statistics</span>
          <h2 id="statistics-heading">Tổng quan chi phí</h2>
          <p>Các chỉ số lấy từ mọi khoản chi VND hợp lệ trong chuyến đi.</p>
        </div>
      </div>

      <aside className="statistics-workbench__ledger-note" aria-label="Current ledger">
        Current ledger: pending and settled are record states; neither one erases a member balance.
      </aside>

      <dl className="metric-grid" aria-label="Thống kê chi phí">
        <Metric label="Đã ghi" value={formatVnd(statistics.totalRecorded)} />
        <Metric label="Bình quân / khoản" value={formatVnd(statistics.averageExpense)} />
        <Metric label="Chờ chốt" value={formatVnd(statistics.pendingAmount)} detail={`${statistics.pendingCount} khoản`} />
        <Metric label="Đã chốt" value={formatVnd(statistics.settledAmount)} detail={`${statistics.settledCount} khoản`} />
        <Metric label="Cần thanh toán" value={formatVnd(statistics.totalToPay)} />
        <Metric label="Cần nhận lại" value={formatVnd(statistics.totalToReceive)} />
      </dl>

      <article className="panel-card">
        <span className="eyebrow">Khoản lớn nhất</span>
        {statistics.largestExpense ? (
          <p>
            <strong>{statistics.largestExpense.title}</strong> · {formatVnd(statistics.largestExpense.amount)}
          </p>
        ) : (
          <p>Chưa có khoản chi hợp lệ để tổng hợp.</p>
        )}
      </article>
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="metric-card">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}
