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
