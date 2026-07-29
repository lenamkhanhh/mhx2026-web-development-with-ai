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
  onCreate?: (input: CreateExpenseInput) => Promise<void>;
  onSettle?: (expenseId: string) => Promise<void>;
  onUpdate?: (expenseId: string, patch: Partial<CreateExpenseInput>) => Promise<void>;
  onDelete?: (expenseId: string) => Promise<void>;
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
  onUpdate,
  onDelete,
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
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<TripExpense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const memberIds = new Set(members.map((member) => member.uid));
  const effectivePaidBy = memberIds.has(paidBy) ? paidBy : currentUserId && memberIds.has(currentUserId) ? currentUserId : members[0]?.uid ?? "";
  const effectiveSplitAmong = splitAmong.filter((uid) => memberIds.has(uid));
  const selectedExpense = ledger.includedExpenses.find((expense) => expense.id === selectedExpenseId) ?? null;



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

  async function confirmDelete() {
    if (!deletingExpense || !onDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete(deletingExpense.id);
      setDeletingExpense(null);
      setSelectedExpenseId(null);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "Không thể xoá khoản chi này. Hãy thử lại.");
    } finally {
      setDeleting(false);
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
                    <button aria-label={`Open ${expense.title} details`} className="expense-workbench__details-button" onClick={() => setSelectedExpenseId(expense.id)} type="button">Chi tiết</button>
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
        {selectedExpense ? <ExpenseDetailPanel
          canManage={canSettle || Boolean(currentUserId && selectedExpense.createdBy === currentUserId)}
          expense={selectedExpense}
          members={members}
          onDelete={onDelete ? () => { setDeleteError(""); setDeletingExpense(selectedExpense); } : undefined}
          onUpdate={onUpdate}
        /> : <aside aria-label="Expense details" className="panel-card expense-workbench__detail expense-workbench__detail--empty"><strong>Chọn một khoản chi</strong><p>Chi tiết và thao tác theo quyền sẽ xuất hiện tại đây.</p></aside>}
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
      {deletingExpense ? (
        <div className="expense-workbench__dialog-backdrop" role="presentation">
          <div aria-label="Confirm delete expense" aria-modal="true" className="expense-workbench__dialog" role="dialog">
            <span className="eyebrow">Xác nhận thay đổi dữ liệu</span>
            <h3>Xoá khoản chi</h3>
            <p>Khoản <strong>{deletingExpense.title}</strong> sẽ bị xoá khỏi sổ chi phí và số dư sẽ được tính lại từ dữ liệu còn lại.</p>
            <p>Thao tác này được kiểm tra lại bằng Firebase Security Rules trước khi ghi dữ liệu.</p>
            {deleteError ? <p role="alert">{deleteError}</p> : null}
            <div className="expense-workbench__dialog-actions">
              <button aria-label="Cancel delete" disabled={deleting} onClick={() => setDeletingExpense(null)} type="button">Huỷ</button>
              <button aria-label="Confirm delete" className="expense-workbench__delete-button" disabled={deleting} onClick={() => void confirmDelete()} type="button">{deleting ? "Đang xoá…" : "Xác nhận xoá"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>

  );
}

interface ExpenseDetailPanelProps {
  canManage: boolean;
  expense: TripExpense;
  members: ExpenseMember[];
  onUpdate?: (expenseId: string, patch: Partial<CreateExpenseInput>) => Promise<void>;
  onDelete?: () => void;
}

function ExpenseDetailPanel({ canManage, expense, members, onDelete, onUpdate }: ExpenseDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(String(expense.amount));
  const [paidBy, setPaidBy] = useState(expense.paidBy);
  const [splitAmong, setSplitAmong] = useState<string[]>(expense.splitAmong);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const participantNames = expense.splitAmong
    .map((uid) => members.find((member) => member.uid === uid)?.displayName ?? uid)
    .join(", ") || "Chưa chỉ định";
  const payerName = members.find((member) => member.uid === expense.paidBy)?.displayName ?? expense.paidBy;

  function beginEdit() {
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setPaidBy(expense.paidBy);
    setSplitAmong(expense.splitAmong);
    setError("");
    setEditing(true);
  }

  function toggleParticipant(uid: string) {
    setSplitAmong((current) => current.includes(uid) ? current.filter((candidate) => candidate !== uid) : [...current, uid]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onUpdate) return;
    const normalizedAmount = Number(amount);
    if (!title.trim() || !Number.isSafeInteger(normalizedAmount) || normalizedAmount <= 0 || !paidBy || splitAmong.length === 0) {
      setError("Nhập tên, số VND nguyên dương, người trả và ít nhất một người được chia.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onUpdate(expense.id, { title: title.trim(), amount: normalizedAmount, paidBy, splitAmong });
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật khoản chi.");
    } finally {
      setSaving(false);
    }
  }

  return <aside aria-label="Expense details" className="panel-card expense-workbench__detail">
    <div className="section-heading expense-workbench__detail-heading">
      <div><span className="eyebrow">Chi tiết khoản chi</span><h3>{expense.title}</h3></div>
      <span className={`expense-workbench__status expense-workbench__status--${expense.status}`}>{expense.status === "settled" ? "Đã chốt" : "Chờ chốt"}</span>
    </div>
    <dl className="expense-workbench__detail-list">
      <div><dt>Số tiền</dt><dd>{formatVnd(expense.amount)}</dd></div>
      <div><dt>Người đã trả</dt><dd>{payerName}</dd></div>
      <div><dt>Chia cho</dt><dd>{participantNames}</dd></div>
      <div><dt>Quyền thao tác</dt><dd>{canManage ? "Bạn có thể chỉnh sửa hoặc xoá khoản chi này." : "Chỉ Lead hoặc người tạo khoản chi mới có quyền chỉnh sửa."}</dd></div>
    </dl>
    {error ? <p className="expense-workbench__detail-error" role="alert">{error}</p> : null}
    {canManage && onUpdate ? editing ? <form className="expense-workbench__edit-form" onSubmit={(event) => void save(event)}>
      <label>Tên khoản chi<input aria-label="Expense title" disabled={saving} maxLength={120} onChange={(event) => setTitle(event.target.value)} required value={title} /></label>
      <label>Số tiền (VND)<input aria-label="Expense amount" disabled={saving} inputMode="numeric" min="1" onChange={(event) => setAmount(event.target.value)} required step="1" type="number" value={amount} /></label>
      <label>Người đã trả<select disabled={saving} onChange={(event) => setPaidBy(event.target.value)} value={paidBy}>{members.map((member) => <option key={member.uid} value={member.uid}>{member.displayName}</option>)}</select></label>
      <fieldset disabled={saving}><legend>Chia cho</legend>{members.map((member) => <label key={member.uid}><input checked={splitAmong.includes(member.uid)} onChange={() => toggleParticipant(member.uid)} type="checkbox" />{member.displayName}</label>)}</fieldset>
      <div className="expense-workbench__detail-actions"><button className="primary-button" disabled={saving} type="submit">{saving ? "Đang lưu…" : "Save expense changes"}</button><button disabled={saving} onClick={() => { setEditing(false); setError(""); }} type="button">Cancel expense edit</button></div>
    </form> : <button className="secondary-button" onClick={beginEdit} type="button">Edit expense</button> : null}
    {canManage && onDelete ? <button className="expense-workbench__delete-button" disabled={saving} onClick={onDelete} type="button">Delete expense</button> : null}
    <p className="expense-workbench__detail-audit">Số dư được tính lại từ snapshot mới. Firestore Security Rules vẫn là lớp kiểm soát quyền cuối cùng.</p>
  </aside>;
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
