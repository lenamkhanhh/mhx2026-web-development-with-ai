import { AirplaneTilt, Bed, ForkKnife, MapPinLine, SquaresFour } from "@phosphor-icons/react";
import { useState, type ComponentType, type FormEvent } from "react";
import "./ExpensesPanel.css";
import type { CreateExpenseInput, ExpenseCategory } from "../../firebase/contracts";
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

const EXPENSE_CATEGORY_META: Record<
  ExpenseCategory | "uncategorized",
  { icon: ComponentType<{ "aria-hidden"?: boolean; size?: number }>; label: string }
> = {
  transport: { icon: AirplaneTilt, label: "Transport" },
  accommodation: { icon: Bed, label: "Accommodation" },
  food: { icon: ForkKnife, label: "Food & drinks" },
  activities: { icon: MapPinLine, label: "Activities" },
  other: { icon: SquaresFour, label: "Other" },
  uncategorized: { icon: SquaresFour, label: "Uncategorized" },
};

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
  const [category, setCategory] = useState<ExpenseCategory | "">("");
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
  const pendingAmount = ledger.includedExpenses
    .filter((expense) => expense.status === "pending")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const settledAmount = ledger.includedExpenses
    .filter((expense) => expense.status === "settled")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const currentBalance = ledger.balances.find((member) => member.memberId === currentUserId)?.balance ?? 0;
  const settlementSuggestions = calculateSettlementSuggestions(ledger.balances);
  const categoryTotals = (Object.keys(EXPENSE_CATEGORY_META) as Array<ExpenseCategory | "uncategorized">)
    .filter((value) => value !== "uncategorized")
    .map((value) => ({
      category: value,
      ...EXPENSE_CATEGORY_META[value],
      amount: ledger.includedExpenses
        .filter((expense) => (expense.category ?? "uncategorized") === value)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((entry) => entry.amount > 0);
  const uncategorizedTotal = ledger.includedExpenses
    .filter((expense) => !expense.category)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const summaryCategories = uncategorizedTotal > 0
    ? [...categoryTotals, { category: "uncategorized" as const, ...EXPENSE_CATEGORY_META.uncategorized, amount: uncategorizedTotal }]
    : categoryTotals;
  const recentExpenses = [...ledger.includedExpenses].reverse().slice(0, 3);

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
      setFormError("Enter a title, positive whole-VND amount, payer, and recipients.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const input: CreateExpenseInput = {
        title: title.trim(),
        amount: normalizedAmount,
        paidBy: effectivePaidBy,
        splitAmong: effectiveSplitAmong,
      };
      if (category) input.category = category;
      await onCreate(input);
      setTitle("");
      setAmount("");
      setCategory("");
      setComposerOpen(false);
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : "Unable to add the expense.",
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
      setSettlementError("Unable to settle this expense. Try again.");
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
      setDeleteError(cause instanceof Error ? cause.message : "Unable to delete this expense. Try again.");
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
          <h2 id="expenses-heading">Expenses & settlement</h2>
          <p>Review expenses, balances, and statuses using whole-VND amounts.</p>
        </div>
        <div className="expense-workbench__header-actions">
          <button className="secondary-button" onClick={exportCsv} type="button">
            Export CSV
          </button>
          {onCreate ? (
            <button
              className="primary-button"
              onClick={() => setComposerOpen(true)}
              type="button"
            >
              Add expense
            </button>
          ) : null}
        </div>
      </div>


      {isLoading ? <p className="expense-workbench__state" role="status">Loading the expense ledger…</p> : null}
      {loadError ? (
        <div className="expense-workbench__state expense-workbench__state--error">
          <p role="alert">{loadError}</p>
          {onRetry ? <button onClick={onRetry} type="button">Retry</button> : null}
        </div>
      ) : null}

      <section aria-label="Expense metrics" className="expense-workbench__metrics">
        <article>
          <span>Total spent</span>
          <strong>{formatVnd(ledger.totalAmount)}</strong>
          <small>{ledger.includedExpenses.length} valid expenses</small>
        </article>
        <article>
          <span>Pending amount</span>
          <strong>{formatVnd(pendingAmount)}</strong>
          <small>{pendingCount} {pendingCount === 1 ? "expense" : "expenses"} needs lead review</small>
        </article>
        <article>
          <span>Settled amount</span>
          <strong>{formatVnd(settledAmount)}</strong>
          <small>{settledCount} {settledCount === 1 ? "expense" : "expenses"} marked settled</small>
        </article>
        <article>
          <span>Balance</span>
          <strong className={currentBalance >= 0 ? "balance-positive" : "balance-negative"}>{formatSignedVnd(currentBalance)}</strong>
          <small>{currentBalance >= 0 ? "Owed to you" : "You owe"}</small>
        </article>
      </section>

      {onCreate && composerOpen ? (
        <form
          aria-label="Create a new expense"
          className="panel-card expense-composer expense-workbench__composer"
          onSubmit={submitExpense}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Add transaction</span>
              <h3>Create a new expense</h3>
            </div>
            <button
              aria-label="Close expense form"
              className="secondary-button"
              disabled={saving}
              onClick={() => setComposerOpen(false)}
              type="button"
            >
              Close
            </button>
          </div>
          <div className="expense-form-grid">
            <label>
              Expense title
              <input
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>
            <label>
              Amount (VND)
              <input
                aria-label="Amount (VND)"
                aria-describedby="expense-amount-help"
                inputMode="numeric"
                min="1"
                onChange={(event) => setAmount(event.target.value)}
                step="1"
                type="number"
                value={amount}
              />
              <small id="expense-amount-help">Enter a positive whole-VND number; decimals are not supported.</small>
            </label>
            <label>
              Paid by
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
            <label>
              Category
              <select
                aria-label="Expense category"
                onChange={(event) => setCategory(event.target.value as ExpenseCategory | "")}
                value={category}
              >
                <option value="">Uncategorized</option>
                <option value="transport">Transport</option>
                <option value="accommodation">Accommodation</option>
                <option value="food">Food &amp; drinks</option>
                <option value="activities">Activities</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <fieldset className="participant-picker">
            <legend>Split among</legend>
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
            {saving ? "Saving…" : "Save expense"}
          </button>
        </form>
      ) : null}

      <div className="split-grid expense-grid expense-workbench__ledger">
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Balances</span>
              <h3>Paid · Owed · Balance</h3>
            </div>
          </div>
          <div className="balance-table" role="region" aria-label="Balance table">
            <div className="balance-row table-head" role="row">
              <span role="columnheader">Member</span>
              <span role="columnheader">Paid</span>
              <span role="columnheader">Owed</span>
              <span role="columnheader">Balance</span>
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
              <h3>{filteredExpenses.length} expenses shown</h3>
            </div>
            <label className="expense-workbench__filter">
              <span>Filter status</span>
              <select
                aria-label="Filter expense status"
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | ExpenseStatus)
                }
                value={statusFilter}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="settled">Settled</option>
              </select>
            </label>
          </div>
          {filteredExpenses.length > 0 ? (
            <div
              aria-label="Expense table"
              className="expense-workbench__table"
              role="table"
            >
              <div className="expense-workbench__table-row expense-workbench__table-row--head" role="row">
                <span role="columnheader">Expense</span>
                <span role="columnheader">Category</span>
                <span role="columnheader">Payer</span>
                <span role="columnheader">Split</span>
                <span role="columnheader">Amount</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Actions</span>
              </div>
              {filteredExpenses.map((expense) => (
                <div className="expense-workbench__table-row" key={expense.id} role="row">
                  <strong className="expense-workbench__expense-cell" role="cell">
                    {(() => {
                      const category = expense.category ?? "uncategorized";
                      const meta = EXPENSE_CATEGORY_META[category];
                      const Icon = meta.icon;
                      return (
                        <span
                          aria-label={meta.label}
                          className={`expense-workbench__category-icon expense-workbench__category-icon--${category}`}
                          data-expense-category={category}
                          data-testid={`expense-category-${expense.id}`}
                          role="img"
                        >
                          <Icon aria-hidden={true} size={15} />
                        </span>
                      );
                    })()}
                    <span>{expense.title}</span>
                  </strong>
                  <span role="cell">{EXPENSE_CATEGORY_META[expense.category ?? "uncategorized"].label}</span>
                  <span role="cell">
                    {members.find((member) => member.uid === expense.paidBy)?.displayName ??
                      expense.paidBy}
                  </span>
                  <span role="cell">{countKnownParticipants(expense, members)} people</span>
                  <strong role="cell">{formatVnd(expense.amount)}</strong>
                  <span role="cell">
                    <span className={`expense-workbench__status expense-workbench__status--${expense.status}`}>
                      {expense.status === "settled" ? "Settled" : "Pending"}
                    </span>
                  </span>
                  <span className="expense-workbench__row-actions" role="cell">
                    <button
                      aria-label={`Open ${expense.title} details`}
                      className="expense-workbench__details-button"
                      onClick={() => setSelectedExpenseId(expense.id)}
                      type="button"
                    >
                      Details
                    </button>
                    {canSettle && onSettle && expense.status === "pending" ? (
                      <button
                        aria-label={`Settle ${expense.title}`}
                        className="expense-workbench__settle-button"
                        onClick={() => {
                          setSettlementError("");
                          setConfirmingExpense(expense);
                        }}
                        type="button"
                      >
                        Settle
                      </button>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>No expenses match this filter.</p>
          )}
          {ledger.excludedExpenseIds.length > 0 ? (
            <p role="status">
              {ledger.excludedExpenseIds.length} expenses cannot be calculated because the payer or split recipients are missing.
            </p>
          ) : null}
        </article>
        <aside
          aria-label="Settlement suggestions"
          className="panel-card expense-workbench__settlement-rail"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Settlement suggestions</span>
              <h3>Settlement suggestions</h3>
            </div>
          </div>
          <p className="expense-workbench__rail-note">
            Derived from current balances; this does not confirm that a transfer occurred.
          </p>
          {settlementSuggestions.length > 0 ? (
            <ol>
              {settlementSuggestions.map((suggestion) => (
                <li key={`${suggestion.fromId}-${suggestion.toId}`}>
                  <div>
                    <strong>{suggestion.fromName} pays {suggestion.toName}</strong>
                    <span>Balances the current ledger</span>
                  </div>
                  <b>{formatVnd(suggestion.amount)}</b>
                </li>
              ))}
            </ol>
          ) : (
            <p>The current ledger is balanced.</p>
          )}
        </aside>
        <aside aria-label="Expense summary" className="panel-card expense-workbench__summary-rail">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Expense summary</span>
              <h3>By category</h3>
            </div>
          </div>
          {summaryCategories.length > 0 ? (
            <ul className="expense-workbench__summary-list">
              {summaryCategories.map(({ category, icon: Icon, label, amount }) => (
                <li key={category}>
                  <span className={`expense-workbench__category-icon expense-workbench__category-icon--${category}`} aria-hidden="true">
                    <Icon size={14} />
                  </span>
                  <span>{label}</span>
                  <strong>{formatVnd(amount)}</strong>
                </li>
              ))}
            </ul>
          ) : <p className="expense-workbench__rail-note">No categorized expenses yet.</p>}
        </aside>
        <aside aria-label="Recent expenses" className="panel-card expense-workbench__recent-rail">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Recent expenses</span>
              <h3>Latest activity</h3>
            </div>
          </div>
          {recentExpenses.length > 0 ? (
            <ul className="expense-workbench__recent-list">
              {recentExpenses.map((expense) => {
                const category = expense.category ?? "uncategorized";
                const Icon = EXPENSE_CATEGORY_META[category].icon;
                return (
                  <li key={expense.id}>
                    <span className={`expense-workbench__category-icon expense-workbench__category-icon--${category}`} aria-hidden="true">
                      <Icon size={14} />
                    </span>
                    <span className="expense-workbench__recent-copy">
                      <strong>{expense.title}</strong>
                      <small>{expense.status === "settled" ? "Settled" : "Pending"} · {members.find((member) => member.uid === expense.paidBy)?.displayName ?? expense.paidBy}</small>
                    </span>
                    <b>{formatVnd(expense.amount)}</b>
                  </li>
                );
              })}
            </ul>
          ) : <p className="expense-workbench__rail-note">No expenses recorded yet.</p>}
        </aside>
        {selectedExpense ? <ExpenseDetailPanel
          canManage={canSettle || Boolean(currentUserId && selectedExpense.createdBy === currentUserId)}
          expense={selectedExpense}
          members={members}
          onDelete={onDelete ? () => { setDeleteError(""); setDeletingExpense(selectedExpense); } : undefined}
          onUpdate={onUpdate}
        /> : <aside aria-label="Expense details" className="panel-card expense-workbench__detail expense-workbench__detail--empty"><strong>Select an expense</strong><p>Details and authorized actions appear here.</p></aside>}
      </div>
    </section>

      {confirmingExpense ? (
        <div className="expense-workbench__dialog-backdrop" role="presentation">
          <div
            aria-label="Confirm expense settlement"
            aria-modal="true"
            className="expense-workbench__dialog"
            role="dialog"
          >
            <span className="eyebrow">Lead action</span>
            <h3>Settle expense</h3>
            <p>
              Mark <strong>{confirmingExpense.title}</strong> as settled in the expense ledger
              for {formatVnd(confirmingExpense.amount)}?
            </p>
            <p>
              This is an internal reconciliation marker, not proof of a money transfer.
            </p>
            {settlementError ? <p role="alert">{settlementError}</p> : null}
            <div className="expense-workbench__dialog-actions">
              <button disabled={settling} onClick={() => setConfirmingExpense(null)} type="button">
                Cancel
              </button>
              <button className="primary-button" disabled={settling} onClick={() => void confirmSettlement()} type="button">
                {settling ? "Settling…" : "Confirm settlement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {deletingExpense ? (
        <div className="expense-workbench__dialog-backdrop" role="presentation">
          <div aria-label="Confirm delete expense" aria-modal="true" className="expense-workbench__dialog" role="dialog">
            <span className="eyebrow">Confirm data change</span>
            <h3>Delete expense</h3>
            <p><strong>{deletingExpense.title}</strong> will be removed from the expense ledger and balances will be recalculated from the remaining data.</p>
            <p>Firebase Security Rules re-authorize this action before data is written.</p>
            {deleteError ? <p role="alert">{deleteError}</p> : null}
            <div className="expense-workbench__dialog-actions">
              <button aria-label="Cancel delete" disabled={deleting} onClick={() => setDeletingExpense(null)} type="button">Cancel</button>
              <button aria-label="Confirm delete" className="expense-workbench__delete-button" disabled={deleting} onClick={() => void confirmDelete()} type="button">{deleting ? "Deleting…" : "Confirm delete"}</button>
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
    .join(", ") || "Unassigned";
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
      setError("Enter a title, positive whole-VND amount, payer, and at least one recipient.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onUpdate(expense.id, { title: title.trim(), amount: normalizedAmount, paidBy, splitAmong });
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the expense.");
    } finally {
      setSaving(false);
    }
  }

  return <aside aria-label="Expense details" className="panel-card expense-workbench__detail">
    <div className="section-heading expense-workbench__detail-heading">
      <div><span className="eyebrow">Expense details</span><h3>{expense.title}</h3></div>
      <span className={`expense-workbench__status expense-workbench__status--${expense.status}`}>{expense.status === "settled" ? "Settled" : "Pending"}</span>
    </div>
    <dl className="expense-workbench__detail-list">
      <div><dt>Amount</dt><dd>{formatVnd(expense.amount)}</dd></div>
      <div><dt>Paid by</dt><dd>{payerName}</dd></div>
      <div><dt>Split among</dt><dd>{participantNames}</dd></div>
      <div><dt>Access</dt><dd>{canManage ? "You can edit or delete this expense." : "Only the lead or expense author may edit it."}</dd></div>
    </dl>
    {error ? <p className="expense-workbench__detail-error" role="alert">{error}</p> : null}
    {canManage && onUpdate ? editing ? <form className="expense-workbench__edit-form" onSubmit={(event) => void save(event)}>
      <label>Expense title<input aria-label="Expense title" disabled={saving} maxLength={120} onChange={(event) => setTitle(event.target.value)} required value={title} /></label>
      <label>Amount (VND)<input aria-label="Expense amount" disabled={saving} inputMode="numeric" min="1" onChange={(event) => setAmount(event.target.value)} required step="1" type="number" value={amount} /></label>
      <label>Paid by<select disabled={saving} onChange={(event) => setPaidBy(event.target.value)} value={paidBy}>{members.map((member) => <option key={member.uid} value={member.uid}>{member.displayName}</option>)}</select></label>
      <fieldset disabled={saving}><legend>Split among</legend>{members.map((member) => <label key={member.uid}><input checked={splitAmong.includes(member.uid)} onChange={() => toggleParticipant(member.uid)} type="checkbox" />{member.displayName}</label>)}</fieldset>
      <div className="expense-workbench__detail-actions"><button className="primary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Save expense changes"}</button><button disabled={saving} onClick={() => { setEditing(false); setError(""); }} type="button">Cancel expense edit</button></div>
    </form> : <button className="secondary-button" onClick={beginEdit} type="button">Edit expense</button> : null}
    {canManage && onDelete ? <button className="expense-workbench__delete-button" disabled={saving} onClick={onDelete} type="button">Delete expense</button> : null}
    <p className="expense-workbench__detail-audit">Balances are recalculated from the new snapshot. Firebase Security Rules remain the final authorization layer.</p>
  </aside>;
}

function formatSignedVnd(amount: number): string {
  if (amount === 0) return "Balanced";
  return `${amount > 0 ? "+" : "−"}${formatVnd(Math.abs(amount))}`;
}

function countKnownParticipants(
  expense: TripExpense,
  members: ExpenseMember[],
): number {
  const knownMemberIds = new Set(members.map((member) => member.uid));
  return new Set(expense.splitAmong.filter((memberId) => knownMemberIds.has(memberId))).size;
}
