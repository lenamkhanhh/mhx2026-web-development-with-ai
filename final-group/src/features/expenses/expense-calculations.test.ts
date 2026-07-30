import { describe, expect, it } from "vitest";
import {
  calculateExpenseBalances,
  calculateSettlementSuggestions,
  expensesToCsv,
  formatVnd,
  validateExpenseInput,
  type TripExpense,
} from "./expense-calculations";

const members = [
  { uid: "lead-1", displayName: "Khánh" },
  { uid: "member-1", displayName: "Minh" },
  { uid: "member-2", displayName: "An" },
];

const expense: TripExpense = {
  id: "expense-1",
  title: "Ăn tối",
  amount: 100_001,
  paidBy: "lead-1",
  splitAmong: ["lead-1", "member-1", "member-2"],
  status: "pending",
  createdBy: "lead-1",
};

describe("expense VND calculations", () => {
  it("keeps every allocation in integer VND and conserves the total", () => {
    const balances = calculateExpenseBalances(members, [expense]);

    expect(balances).toEqual([
      {
        memberId: "lead-1",
        displayName: "Khánh",
        paid: 100_001,
        owed: 33_334,
        balance: 66_667,
      },
      {
        memberId: "member-1",
        displayName: "Minh",
        paid: 0,
        owed: 33_334,
        balance: -33_334,
      },
      {
        memberId: "member-2",
        displayName: "An",
        paid: 0,
        owed: 33_333,
        balance: -33_333,
      },
    ]);
    expect(balances.reduce((total, member) => total + member.balance, 0)).toBe(0);
  });

  it("does not double-charge duplicate split members", () => {
    const balances = calculateExpenseBalances(members, [
      { ...expense, amount: 90_000, splitAmong: ["lead-1", "member-1", "member-1"] },
    ]);

    expect(balances.map(({ memberId, owed }) => ({ memberId, owed }))).toEqual([
      { memberId: "lead-1", owed: 45_000 },
      { memberId: "member-1", owed: 45_000 },
      { memberId: "member-2", owed: 0 },
    ]);
  });

  it("rejects fractional, negative, and incomplete VND expense input", () => {
    expect(
      validateExpenseInput({
        ...expense,
        title: " ",
        amount: 1.5,
        paidBy: "",
        splitAmong: [],
      }),
    ).toEqual([
      "Tiêu đề là bắt buộc.",
      "Số tiền phải là số nguyên VND không âm.",
      "Cần chọn người đã thanh toán.",
      "Cần chọn ít nhất một người để chia tiền.",
    ]);
  });

  it("formats VND without decimal fractions", () => {
    expect(formatVnd(1_250_000)).toBe("1.250.000 ₫");
  });

  it("derives deterministic integer-VND settlement suggestions", () => {
    const suggestions = calculateSettlementSuggestions(
      calculateExpenseBalances(members, [expense]),
    );

    expect(suggestions).toEqual([
      {
        amount: 33_334,
        fromId: "member-1",
        fromName: "Minh",
        toId: "lead-1",
        toName: "Khánh",
      },
      {
        amount: 33_333,
        fromId: "member-2",
        fromName: "An",
        toId: "lead-1",
        toName: "Khánh",
      },
    ]);
  });

  it("exports only truthful expense fields as escaped CSV", () => {
    expect(expensesToCsv(members, [
      { ...expense, title: "Ăn tối, nhóm" },
    ])).toContain(
      '"Ăn tối, nhóm",100001,Khánh,"Khánh; Minh; An",pending',
    );
  });
});
