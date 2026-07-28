import {
  calculateExpenseLedger,
  isVndAmount,
  type ExpenseMember,
  type TripExpense,
} from "../expenses/expense-calculations";

export interface ExpenseStatistics {
  expenseCount: number;
  totalRecorded: number;
  averageExpense: number;
  pendingCount: number;
  pendingAmount: number;
  settledCount: number;
  settledAmount: number;
  largestExpense: Pick<TripExpense, "id" | "title" | "amount"> | null;
  totalPaid: number;
  totalOwed: number;
  totalToReceive: number;
  totalToPay: number;
  netBalance: number;
}

export function calculateExpenseStatistics(
  members: ExpenseMember[],
  expenses: TripExpense[],
): ExpenseStatistics {
  const validExpenses = expenses.filter((expense) => isVndAmount(expense.amount));
  const ledger = calculateExpenseLedger(members, expenses);
  const pendingExpenses = validExpenses.filter(
    (expense) => expense.status === "pending",
  );
  const settledExpenses = validExpenses.filter(
    (expense) => expense.status === "settled",
  );
  const totalRecorded = sumAmounts(validExpenses);
  const totalPaid = ledger.balances.reduce(
    (total, member) => total + member.paid,
    0,
  );
  const totalOwed = ledger.balances.reduce(
    (total, member) => total + member.owed,
    0,
  );

  return {
    expenseCount: validExpenses.length,
    totalRecorded,
    averageExpense:
      validExpenses.length === 0
        ? 0
        : Math.round(totalRecorded / validExpenses.length),
    pendingCount: pendingExpenses.length,
    pendingAmount: sumAmounts(pendingExpenses),
    settledCount: settledExpenses.length,
    settledAmount: sumAmounts(settledExpenses),
    largestExpense: findLargestExpense(validExpenses),
    totalPaid,
    totalOwed,
    totalToReceive: ledger.balances.reduce(
      (total, member) => total + Math.max(member.balance, 0),
      0,
    ),
    totalToPay: ledger.balances.reduce(
      (total, member) => total + Math.abs(Math.min(member.balance, 0)),
      0,
    ),
    netBalance: ledger.balances.reduce(
      (total, member) => total + member.balance,
      0,
    ),
  };
}

function sumAmounts(expenses: TripExpense[]): number {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

function findLargestExpense(
  expenses: TripExpense[],
): Pick<TripExpense, "id" | "title" | "amount"> | null {
  return expenses.reduce<Pick<TripExpense, "id" | "title" | "amount"> | null>(
    (largest, expense) =>
      !largest || expense.amount > largest.amount
        ? { id: expense.id, title: expense.title, amount: expense.amount }
        : largest,
    null,
  );
}
