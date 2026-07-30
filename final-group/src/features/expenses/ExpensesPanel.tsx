import { useState, type FormEvent } from "react";
import "./ExpensesPanel.css";
import type { CreateExpenseInput } from "../../firebase/contracts";
import {
  calculateExpenseLedger,
  calculateSettlementSuggestions,
  expensesToCsv,
  formatVnd,
  type ExpenseMember,
  type ExpenseStatus,
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | ExpenseStatus>("all");
  const memberIds = new Set(members.map((member) => member.uid));
  const effectivePaidBy = memberIds.has(paidBy) ? paidBy : currentUserId && memberIds.has(currentUserId) ? currentUserId : members[0]?.uid ?? "";
  const effectiveSplitAmong = splitAmong.filter((uid) => memberIds.has(uid));
  const selectedExpense = ledger.includedExpenses.find((expense) => expense.id === selectedExpenseId) ?? null;
  const filteredExpenses = ledger.includedExpenses.filter(
    (expense) => statusFilter === "all" || expense.status === statusFilter,
  );
  const pendingCount = ledger.includedExpenses.filter(
    (expense) => expense.status === "pending",
  ).length;
  const settledCount = ledger.includedExpenses.length - pendingCount;
  const settlementSuggestions = calculateSettlementSuggestions(ledger.balances);

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
      setComposerOpen(false);
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

  function exportCsv() {
    const csv = expensesToCsv(members, filteredExpenses);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tripflow-expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
    <section aria-labelledby="expenses-heading" className="view-stack expense-workbench">
      <div className="section-heading page-heading expense-workbench__header">
        <div>
          <span className="eyebrow">Money ledger</span>
          <h2 id="expenses-heading">Chi phí & chia tiền</h2>
          <p>Đối soát khoản chi, công nợ và trạng thái bằng VND nguyên.</p>
        </div>
        <div className="expense-workbench__header-actions">
          <button className="secondary-button" onClick={exportCsv} type="button">
            Xuất CSV
          </button>
          {onCreate ? (
            <button
              className="primary-button"
              onClick={() => setComposerOpen(true)}
              type="button"
            >
              Thêm khoản chi
            </button>
          ) : null}
        </div>
      </div>


      {isLoading ? <p className="expense-workbench__state" role="status">Đang tải sổ chi phí…</p> : null}
      {loadError ? (
        <div className="expense-workbench__state expense-workbench__state--error">
          <p role="alert">{loadError}</p>
          {onRetry ? <button onClick={onRetry} type="button">Thử lại</button> : null}
        </div>
      ) : null}

      <section aria-label="Chỉ số chi phí" className="expense-workbench__metrics">
        <article>
          <span>Tổng chi</span>
          <strong>{formatVnd(ledger.totalAmount)}</strong>
          <small>{ledger.includedExpenses.length} khoản hợp lệ</small>
        </article>
        <article>
          <span>Chờ chốt</span>
          <strong>{pendingCount}</strong>
          <small>Cần Lead đối soát</small>
        </article>
        <article>
          <span>Đã chốt</span>
          <strong>{settledCount}</strong>
          <small>Trạng thái nội bộ</small>
        </article>
        <article>
          <span>Cần thanh toán</span>
          <strong>{settlementSuggestions.length}</strong>
          <small>Gợi ý từ sổ hiện tại</small>
        </article>
      </section>

      {onCreate && composerOpen ? (
        <form
          aria-label="Ghi khoản chi mới"
          className="panel-card expense-composer expense-workbench__composer"
          onSubmit={submitExpense}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Thêm giao dịch</span>
              <h3>Ghi khoản chi mới</h3>
            </div>
            <button
              aria-label="Đóng biểu mẫu khoản chi"
              className="secondary-button"
              disabled={saving}
              onClick={() => setComposerOpen(false)}
              type="button"
            >
              Đóng
            </button>
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
            {saving ? "Đang lưu…" : "Lưu khoản chi"}
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
              <span className="eyebrow">Expense register</span>
              <h3>{filteredExpenses.length} khoản đang hiển thị</h3>
            </div>
            <label className="expense-workbench__filter">
              <span>Lọc trạng thái</span>
              <select
                aria-label="Lọc trạng thái khoản chi"
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | ExpenseStatus)
                }
                value={statusFilter}
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chờ chốt</option>
                <option value="settled">Đã chốt</option>
              </select>
            </label>
          </div>
          {filteredExpenses.length > 0 ? (
            <div
              aria-label="Bảng khoản chi"
              className="expense-workbench__table"
              role="table"
            >
              <div className="expense-workbench__table-row expense-workbench__table-row--head" role="row">
                <span role="columnheader">Khoản chi</span>
                <span role="columnheader">Người trả</span>
                <span role="columnheader">Chia</span>
                <span role="columnheader">Số tiền</span>
                <span role="columnheader">Trạng thái</span>
                <span role="columnheader">Thao tác</span>
              </div>
              {filteredExpenses.map((expense) => (
                <div className="expense-workbench__table-row" key={expense.id} role="row">
                  <strong role="cell">{expense.title}</strong>
                  <span role="cell">
                    {members.find((member) => member.uid === expense.paidBy)?.displayName ??
                      expense.paidBy}
                  </span>
                  <span role="cell">{countKnownParticipants(expense, members)} người</span>
                  <strong role="cell">{formatVnd(expense.amount)}</strong>
                  <span role="cell">
                    <span className={`expense-workbench__status expense-workbench__status--${expense.status}`}>
                      {expense.status === "settled" ? "Đã chốt" : "Chờ chốt"}
                    </span>
                  </span>
                  <span className="expense-workbench__row-actions" role="cell">
                    <button
                      aria-label={`Open ${expense.title} details`}
                      className="expense-workbench__details-button"
                      onClick={() => setSelectedExpenseId(expense.id)}
                      type="button"
                    >
                      Chi tiết
                    </button>
                    {canSettle && onSettle && expense.status === "pending" ? (
                      <button
                        aria-label={`Chốt ${expense.title}`}
                        className="expense-workbench__settle-button"
                        onClick={() => {
                          setSettlementError("");
                          setConfirmingExpense(expense);
                        }}
                        type="button"
                      >
                        Chốt
                      </button>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>Không có khoản chi phù hợp bộ lọc.</p>
          )}
          {ledger.excludedExpenseIds.length > 0 ? (
            <p role="status">
              {ledger.excludedExpenseIds.length} khoản chưa thể tính vì thiếu người trả hoặc người được chia.
            </p>
          ) : null}
        </article>
        <aside
          aria-label="Gợi ý thanh toán"
          className="panel-card expense-workbench__settlement-rail"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Settlement suggestions</span>
              <h3>Gợi ý thanh toán</h3>
            </div>
          </div>
          <p className="expense-workbench__rail-note">
            Phép tính từ số dư hiện tại; chưa xác nhận giao dịch đã diễn ra.
          </p>
          {settlementSuggestions.length > 0 ? (
            <ol>
              {settlementSuggestions.map((suggestion) => (
                <li key={`${suggestion.fromId}-${suggestion.toId}`}>
                  <div>
                    <strong>{suggestion.fromName} trả {suggestion.toName}</strong>
                    <span>Cân bằng công nợ hiện tại</span>
                  </div>
                  <b>{formatVnd(suggestion.amount)}</b>
                </li>
              ))}
            </ol>
          ) : (
            <p>Sổ hiện tại đã cân bằng.</p>
          )}
        </aside>
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
