import {
  calculateExpenseLedger,
  formatVnd,
  type ExpenseMember,
  type TripExpense,
} from "./expense-calculations";

interface ExpensesPanelProps {
  members: ExpenseMember[];
  expenses: TripExpense[];
}

export function ExpensesPanel({ members, expenses }: ExpensesPanelProps) {
  const ledger = calculateExpenseLedger(members, expenses);

  return (
    <section aria-labelledby="expenses-heading" className="view-stack">
      <div className="section-heading page-heading">
        <div>
          <span className="eyebrow">Money ledger</span>
          <h2 id="expenses-heading">Chi phí & chia tiền</h2>
          <p>Khoản chi được chia đều theo thành viên đã chọn, bằng VND nguyên.</p>
        </div>
        <div className="total-cost">
          <span>Tổng khoản hợp lệ</span>
          <strong>{formatVnd(ledger.totalAmount)}</strong>
        </div>
      </div>

      <div className="split-grid expense-grid">
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Công nợ</span>
              <h3>Đã trả · Phải trả · Dư / nợ</h3>
            </div>
          </div>
          <div className="balance-table" role="region" aria-label="Bảng công nợ">
            <div className="balance-row table-head" role="row">
              <span role="columnheader">Thành viên</span>
              <span role="columnheader">Đã trả</span>
              <span role="columnheader">Phải trả</span>
              <span role="columnheader">Dư / nợ</span>
            </div>
            {ledger.balances.map((member) => (
              <div className="balance-row" key={member.memberId} role="row">
                <strong role="cell">{member.displayName}</strong>
                <span role="cell">{formatVnd(member.paid)}</span>
                <span role="cell">{formatVnd(member.owed)}</span>
                <span
                  className={
                    member.balance >= 0 ? "balance-positive" : "balance-negative"
                  }
                  role="cell"
                >
                  {formatSignedVnd(member.balance)}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Các khoản</span>
              <h3>Chi tiết chi phí</h3>
            </div>
          </div>
          {ledger.includedExpenses.length > 0 ? (
            <ul className="expense-list" aria-label="Danh sách chi phí">
              {ledger.includedExpenses.map((expense) => (
                <li className="expense-item" key={expense.id}>
                  <div>
                    <strong>{expense.title}</strong>
                    <small>
                      {countKnownParticipants(expense, members)} người · {expense.status === "settled" ? "Đã chốt" : "Chờ chốt"}
                    </small>
                  </div>
                  <strong>{formatVnd(expense.amount)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>Chưa có khoản chi hợp lệ.</p>
          )}
          {ledger.excludedExpenseIds.length > 0 ? (
            <p role="status">
              {ledger.excludedExpenseIds.length} khoản chưa thể tính vì thiếu người trả hoặc người được chia.
            </p>
          ) : null}
        </article>
      </div>
    </section>
  );
}

function formatSignedVnd(amount: number): string {
  if (amount === 0) return "Đã cân bằng";
  return `${amount > 0 ? "+" : "−"}${formatVnd(Math.abs(amount))}`;
}

function countKnownParticipants(
  expense: TripExpense,
  members: ExpenseMember[],
): number {
  const knownMemberIds = new Set(members.map((member) => member.uid));
  return new Set(expense.splitAmong.filter((memberId) => knownMemberIds.has(memberId))).size;
}
