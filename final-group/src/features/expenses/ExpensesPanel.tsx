import { useEffect, useState, type FormEvent } from "react";
import type { CreateExpenseInput } from "../../firebase/contracts";
import {
  calculateExpenseLedger,
  formatVnd,
  type ExpenseMember,
  type TripExpense,
} from "./expense-calculations";

interface ExpensesPanelProps {
  members: ExpenseMember[];
  expenses: TripExpense[];
  currentUserId?: string;
  canSettle?: boolean;
  onCreate?: (input: CreateExpenseInput) => Promise<void>;
  onSettle?: (expenseId: string) => Promise<void>;
}

export function ExpensesPanel({
  members,
  expenses,
  currentUserId,
  canSettle = false,
  onCreate,
  onSettle,
}: ExpensesPanelProps) {
  const ledger = calculateExpenseLedger(members, expenses);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(currentUserId ?? members[0]?.uid ?? "");
  const [splitAmong, setSplitAmong] = useState<string[]>(() =>
    members.map((member) => member.uid),
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const memberIds = new Set(members.map((member) => member.uid));
    setPaidBy((current) =>
      memberIds.has(current)
        ? current
        : currentUserId && memberIds.has(currentUserId)
          ? currentUserId
          : members[0]?.uid ?? "",
    );
    setSplitAmong((current) => {
      const retained = current.filter((uid) => memberIds.has(uid));
      return retained.length > 0 ? retained : [...memberIds];
    });
  }, [currentUserId, members]);

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onCreate) return;
    const normalizedAmount = Number(amount);
    if (
      !title.trim() ||
      !Number.isSafeInteger(normalizedAmount) ||
      normalizedAmount <= 0 ||
      !paidBy ||
      splitAmong.length === 0
    ) {
      setFormError("Nhập tên, số tiền VND nguyên dương, người trả và người được chia.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await onCreate({
        title: title.trim(),
        amount: normalizedAmount,
        paidBy,
        splitAmong,
      });
      setTitle("");
      setAmount("");
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : "Không thể thêm khoản chi.",
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleParticipant(uid: string) {
    setSplitAmong((current) =>
      current.includes(uid)
        ? current.filter((candidate) => candidate !== uid)
        : [...current, uid],
    );
  }

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

      {onCreate ? (
        <form className="panel-card expense-composer" onSubmit={submitExpense}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Thêm giao dịch</span>
              <h3>Ghi khoản chi mới</h3>
            </div>
          </div>
          <div className="expense-form-grid">
            <label>
              Tên khoản chi
              <input
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>
            <label>
              Số tiền (VND)
              <input
                inputMode="numeric"
                min="1"
                onChange={(event) => setAmount(event.target.value)}
                step="1"
                type="number"
                value={amount}
              />
            </label>
            <label>
              Người đã trả
              <select
                onChange={(event) => setPaidBy(event.target.value)}
                value={paidBy}
              >
                {members.map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="participant-picker">
            <legend>Chia cho</legend>
            {members.map((member) => (
              <label key={member.uid}>
                <input
                  checked={splitAmong.includes(member.uid)}
                  onChange={() => toggleParticipant(member.uid)}
                  type="checkbox"
                />
                {member.displayName}
              </label>
            ))}
          </fieldset>
          {formError ? <p role="alert">{formError}</p> : null}
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Đang lưu…" : "Thêm khoản chi"}
          </button>
        </form>
      ) : null}

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
                  <div className="expense-item-actions">
                    <strong>{formatVnd(expense.amount)}</strong>
                    {canSettle && onSettle && expense.status === "pending" ? (
                      <button
                        className="secondary-button"
                        onClick={() => void onSettle(expense.id)}
                        type="button"
                      >
                        Chốt {expense.title}
                      </button>
                    ) : null}
                  </div>
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
