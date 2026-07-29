// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExpensesPanel } from "./ExpensesPanel";

afterEach(cleanup);

describe("ExpensesPanel", () => {
  it("renders paid, owed, and balance views in VND", () => {
    render(
      <ExpensesPanel
        members={[
          { uid: "lead-1", displayName: "Khánh" },
          { uid: "member-1", displayName: "Minh" },
        ]}
        expenses={[
          {
            id: "expense-1",
            title: "Xe di chuyển",
            amount: 200_000,
            paidBy: "lead-1",
            splitAmong: ["lead-1", "member-1"],
            status: "pending",
            createdBy: "lead-1",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Chi phí & chia tiền" })).toBeTruthy();
    expect(screen.getByLabelText("Bảng công nợ")).toBeTruthy();
    expect(screen.getByText("+100.000 ₫")).toBeTruthy();
    expect(screen.getByText("−100.000 ₫")).toBeTruthy();
    expect(screen.getByText("Xe di chuyển")).toBeTruthy();
  });

  it("creates an expense and exposes lead-only settlement", async () => {
    const actor = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onSettle = vi.fn().mockResolvedValue(undefined);

    render(
      <ExpensesPanel
        canSettle
        currentUserId="lead-1"
        members={[
          { uid: "lead-1", displayName: "Khánh" },
          { uid: "member-1", displayName: "Minh" },
        ]}
        expenses={[
          {
            id: "expense-1",
            title: "Xe di chuyển",
            amount: 200_000,
            paidBy: "lead-1",
            splitAmong: ["lead-1", "member-1"],
            status: "pending",
            createdBy: "lead-1",
          },
        ]}
        onCreate={onCreate}
        onSettle={onSettle}
      />,
    );

    await actor.type(screen.getByLabelText("Tên khoản chi"), "Ăn tối");
    await actor.type(screen.getByLabelText("Số tiền (VND)"), "300000");
    await actor.click(screen.getByRole("button", { name: "Thêm khoản chi" }));

    expect(onCreate).toHaveBeenCalledWith({
      title: "Ăn tối",
      amount: 300_000,
      paidBy: "lead-1",
      splitAmong: ["lead-1", "member-1"],
    });

    await actor.click(screen.getByRole("button", { name: "Chốt Xe di chuyển" }));
    expect(screen.getByRole("dialog", { name: "Xác nhận chốt khoản chi" })).toBeTruthy();
    expect(screen.getByText(/không phải bằng chứng chuyển tiền/i)).toBeTruthy();
    expect(onSettle).not.toHaveBeenCalled();
    await actor.click(screen.getByRole("button", { name: "Xác nhận chốt" }));
    expect(onSettle).toHaveBeenCalledWith("expense-1");
  });

  it("shows loading and retry states without changing the ledger", async () => {
    const actor = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <ExpensesPanel
        isLoading
        loadError="Unable to refresh the expense ledger."
        members={[{ uid: "lead-1", displayName: "Lead" }]}
        expenses={[]}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("status").textContent).toContain("Đang tải sổ chi phí");
    expect(screen.getByRole("alert").textContent).toContain("Unable to refresh the expense ledger.");

    await actor.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
