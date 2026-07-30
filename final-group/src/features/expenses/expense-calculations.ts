import type {
  CreateExpenseInput,
  ExpenseRecord,
  ExpenseStatus,
  MemberRecord,
} from "../../firebase/contracts";

export type ExpenseMember = Pick<MemberRecord, "uid" | "displayName">;
export type TripExpense = ExpenseRecord;
export type { ExpenseStatus };

export interface ExpenseBalance {
  memberId: string;
  displayName: string;
  paid: number;
  owed: number;
  balance: number;
}

export interface ExpenseLedger {
  balances: ExpenseBalance[];
  includedExpenses: TripExpense[];
  excludedExpenseIds: string[];
  totalAmount: number;
}

export interface SettlementSuggestion {
  amount: number;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
}

export function isVndAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount >= 0;
}

export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Math.trunc(amount))} ₫`;
}

export function validateExpenseInput(
  expense: CreateExpenseInput,
): string[] {
  const errors: string[] = [];

  if (!expense.title.trim()) {
    errors.push("Tiêu đề là bắt buộc.");
  }

  if (!isVndAmount(expense.amount)) {
    errors.push("Số tiền phải là số nguyên VND không âm.");
  }

  if (!expense.paidBy) {
    errors.push("Cần chọn người đã thanh toán.");
  }

  if (new Set(expense.splitAmong.filter(Boolean)).size === 0) {
    errors.push("Cần chọn ít nhất một người để chia tiền.");
  }

  return errors;
}

/**
 * Creates a deterministic current ledger. Both pending and settled expense
 * entries are included: the approved schema has no transfer/allocation field
 * that could safely prove an individual balance has been paid off.
 */
export function calculateExpenseLedger(
  members: ExpenseMember[],
  expenses: TripExpense[],
): ExpenseLedger {
  const balances = new Map(
    members.map((member) => [
        member.uid,
        {
        memberId: member.uid,
        displayName: member.displayName,
        paid: 0,
        owed: 0,
        balance: 0,
      },
    ]),
  );
  const includedExpenses: TripExpense[] = [];
  const excludedExpenseIds: string[] = [];
  let totalAmount = 0;

  for (const expense of expenses) {
    const participantIds = members
      .map((member) => member.uid)
      .filter((memberId) => new Set(expense.splitAmong).has(memberId));
    const payer = balances.get(expense.paidBy);

    if (!isVndAmount(expense.amount) || !payer || participantIds.length === 0) {
      excludedExpenseIds.push(expense.id);
      continue;
    }

    includedExpenses.push(expense);
    totalAmount += expense.amount;
    payer.paid += expense.amount;

    const share = Math.floor(expense.amount / participantIds.length);
    let remainder = expense.amount % participantIds.length;
    for (const participantId of participantIds) {
      const participant = balances.get(participantId);
      if (!participant) continue;
      const receivesExtraVnd = remainder > 0;
      participant.owed += share + (receivesExtraVnd ? 1 : 0);
      if (receivesExtraVnd) remainder -= 1;
    }
  }

  const result = [...balances.values()].map((member) => ({
    ...member,
    balance: member.paid - member.owed,
  }));

  return { balances: result, includedExpenses, excludedExpenseIds, totalAmount };
}

export function calculateExpenseBalances(
  members: ExpenseMember[],
  expenses: TripExpense[],
): ExpenseBalance[] {
  return calculateExpenseLedger(members, expenses).balances;
}

/**
 * Derives a deterministic minimum-pass settlement plan from the current
 * ledger. These are suggestions only: the approved schema does not contain
 * transfer records, so this function never claims that money moved.
 */
export function calculateSettlementSuggestions(
  balances: ExpenseBalance[],
): SettlementSuggestion[] {
  const debtors = balances
    .filter((member) => member.balance < 0)
    .map((member) => ({ ...member, remaining: -member.balance }));
  const creditors = balances
    .filter((member) => member.balance > 0)
    .map((member) => ({ ...member, remaining: member.balance }));
  const suggestions: SettlementSuggestion[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0) {
      suggestions.push({
        amount,
        fromId: debtor.memberId,
        fromName: debtor.displayName,
        toId: creditor.memberId,
        toName: creditor.displayName,
      });
      debtor.remaining -= amount;
      creditor.remaining -= amount;
    }

    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return suggestions;
}

function csvCell(value: string | number): string {
  let normalized = String(value);
  if (/^[=+\-@\t\r]/.test(normalized)) {
    normalized = `'${normalized}`;
  }
  const escaped = normalized.replace(/"/g, '""');
  return /[",;\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function expensesToCsv(
  members: ExpenseMember[],
  expenses: TripExpense[],
): string {
  const names = new Map(members.map((member) => [member.uid, member.displayName]));
  const rows = expenses.map((expense) => [
    expense.title,
    expense.amount,
    names.get(expense.paidBy) ?? expense.paidBy,
    expense.splitAmong
      .map((memberId) => names.get(memberId) ?? memberId)
      .join("; "),
    expense.status,
  ]);

  return [
    ["title", "amount", "paidBy", "splitAmong", "status"],
    ...rows,
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
