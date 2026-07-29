import { useState, type FormEvent } from "react";
import "./ExpensesPanel.css";
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
  // eslint-disable-next-line no-unused-vars
  onCreate?: (input: CreateExpenseInput) => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  onSettle?: (expenseId: string) => Promise<void>;
  isLoading?: boolean;
  loadError?: string;
  onRetry?: () => void;
}

export function ExpensesPanel({
  members,
  expenses,
  currentUserId,
  isLoading = false,
  loadError,
  onRetry,
  canSettle = false,
  onCreate,
  onSettle,
}: ExpensesPanelProps) {
  const ledger = calculateExpenseLedger(members, expenses);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmingExpense, setConfirmingExpense] = useState<TripExpense | null>(null);
  const [settling, setSettling] = useState(false);
  const [settlementError, setSettlementError] = useState("");
  const [paidBy, setPaidBy] = useState(currentUserId ?? members[0]?.uid ?? "");
  const [splitAmong, setSplitAmong] = useState<string[]>(() =>
    members.map((member) => member.uid),
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const memberIds = new Set(members.map((member) => member.uid));
  const effectivePaidBy = memberIds.has(paidBy) ? paidBy : currentUserId && memberIds.has(currentUserId) ? currentUserId : members[0]?.uid ?? "";
  const effectiveSplitAmong = splitAmong.filter((uid) => memberIds.has(uid));



  async function submitExpense(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();
    if (!onCreate) return;
    const normalizedAmount = Number(amount);
    if (
      !title.trim() ||
      !Number.isSafeInteger(normalizedAmount) ||
      normalizedAmount <= 0 ||
      !effectivePaidBy ||
      effectiveSplitAmong.length === 0
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
        paidBy: effectivePaidBy,
        splitAmong: effectiveSplitAmong,
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

  async function confirmSettlement() {
    if (!confirmingExpense || !onSettle) return;
    setSettling(true);
    setSettlementError("");
    try {
      await onSettle(confirmingExpense.id);
      setConfirmingExpense(null);
    } catch {
      setSettlementError("Không thể chốt khoản chi này. Hãy thử lại.");
    } finally {
      setSettling(false);
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
    <>
    <section aria-labelledby="expenses-heading" className="view-stack expense-workbench">
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


      {isLoading ? <p className="expense-workbench__state" role="status">Đang tải sổ chi phí…</p> : null}
      {loadError ? (
        <div className="expense-workbench__state expense-workbench__state--error">
          <p role="alert">{loadError}</p>
          {onRetry ? <button onClick={onRetry} type="button">Thử lại</button> : null}
        </div>
      ) : null}

      {onCreate ? (
        <form className="panel-card expense-composer expense-workbench__composer" onSubmit={submitExpense}>
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
                aria-label="Số tiền (VND)"
                aria-describedby="expense-amount-help"
                inputMode="numeric"
                min="1"
                onChange={(event) => setAmount(event.target.value)}
                step="1"
                type="number"
                value={amount}
              />
              <small id="expense-amount-help">Chỉ nhập số VND nguyên dương, không dùng số thập phân.</small>
            </label>
            <label>
              Người đã trả
              <select
                onChange={(event) => setPaidBy(event.target.value)}
                value={effectivePaidBy}
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
                  checked={effectiveSplitAmong.includes(member.uid)}
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

      <div className="split-grid expense-grid expense-workbench__ledger">
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
                <li className="expense-item expense-workbench__item" key={expense.id}>
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
                        onClick={() => { setSettlementError(""); setConfirmingExpense(expense); }}
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

      {confirmingExpense ? (
        <div className="expense-workbench__dialog-backdrop" role="presentation">
          <div
            aria-label="Xác nhận chốt khoản chi"
            aria-modal="true"
            className="expense-workbench__dialog"
            role="dialog"
          >
            <span className="eyebrow">Thao tác của Lead</span>
            <h3>Chốt khoản chi</h3>
            <p>
              Đánh dấu <strong>{confirmingExpense.title}</strong> là đã chốt trong sổ chi phí
              với {formatVnd(confirmingExpense.amount)}?
            </p>
            <p>
              Đây là trạng thái đối soát nội bộ của nhóm, không phải bằng chứng chuyển tiền.
            </p>
            {settlementError ? <p role="alert">{settlementError}</p> : null}
            <div className="expense-workbench__dialog-actions">
              <button disabled={settling} onClick={() => setConfirmingExpense(null)} type="button">
                Hủy
              </button>
              <button className="primary-button" disabled={settling} onClick={() => void confirmSettlement()} type="button">
                {settling ? "Đang chốt…" : "Xác nhận chốt"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>

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
