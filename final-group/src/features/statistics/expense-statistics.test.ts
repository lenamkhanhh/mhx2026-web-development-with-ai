import { describe, expect, it } from "vitest";
import type { TripExpense } from "../expenses/expense-calculations";
import { calculateExpenseStatistics } from "./expense-statistics";

const members = [
  { uid: "lead-1", displayName: "Khánh" },
  { uid: "member-1", displayName: "Minh" },
  { uid: "member-2", displayName: "An" },
];

const expenses: TripExpense[] = [
  {
    id: "expense-1",
    title: "Khách sạn",
    amount: 1_200_000,
    paidBy: "lead-1",
    splitAmong: ["lead-1", "member-1", "member-2"],
    status: "settled",
    createdBy: "lead-1",
  },
  {
    id: "expense-2",
    title: "Ăn tối",
    amount: 300_000,
    paidBy: "member-1",
    splitAmong: ["lead-1", "member-1"],
    status: "pending",
    createdBy: "member-1",
  },
];

describe("expense statistics", () => {
  it("summarizes recorded VND, status totals, largest expense, and outstanding balances", () => {
    expect(calculateExpenseStatistics(members, expenses)).toEqual({
      expenseCount: 2,
      totalRecorded: 1_500_000,
      averageExpense: 750_000,
      pendingCount: 1,
      pendingAmount: 300_000,
      settledCount: 1,
      settledAmount: 1_200_000,
      largestExpense: {
        id: "expense-1",
        title: "Khách sạn",
        amount: 1_200_000,
      },
      totalPaid: 1_500_000,
      totalOwed: 1_500_000,
      totalToReceive: 650_000,
      totalToPay: 650_000,
      netBalance: 0,
    });
  });

  it("keeps settled entries in the ledger because the schema has no settlement-transfer record", () => {
    const statistics = calculateExpenseStatistics(members, expenses);

    expect(statistics.totalPaid).toBe(1_500_000);
    expect(statistics.totalToPay).toBe(650_000);
  });

  it("returns zero-safe statistics for an empty ledger", () => {
    expect(calculateExpenseStatistics(members, [])).toMatchObject({
      expenseCount: 0,
      totalRecorded: 0,
      averageExpense: 0,
      pendingCount: 0,
      settledCount: 0,
      largestExpense: null,
      totalPaid: 0,
      totalOwed: 0,
      totalToReceive: 0,
      totalToPay: 0,
      netBalance: 0,
    });
  });
});
