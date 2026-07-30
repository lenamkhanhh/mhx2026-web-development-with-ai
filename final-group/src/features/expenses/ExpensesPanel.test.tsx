// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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

    await actor.click(screen.getByRole("button", { name: "Thêm khoản chi" }));
    await actor.type(screen.getByLabelText("Tên khoản chi"), "Ăn tối");
    await actor.type(screen.getByLabelText("Số tiền (VND)"), "300000");
    await actor.click(screen.getByRole("button", { name: "Lưu khoản chi" }));

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

  it("uses the reference KPI-table-rail anatomy with real filters and settlement suggestions", async () => {
    const actor = userEvent.setup();
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
            id: "pending",
            title: "Xe di chuyển",
            amount: 200_000,
            paidBy: "lead-1",
            splitAmong: ["lead-1", "member-1"],
            status: "pending",
            createdBy: "lead-1",
          },
          {
            id: "settled",
            title: "Khách sạn",
            amount: 400_000,
            paidBy: "lead-1",
            splitAmong: ["lead-1", "member-1"],
            status: "settled",
            createdBy: "lead-1",
          },
        ]}
        onCreate={vi.fn()}
        onSettle={vi.fn()}
      />,
    );

    expect(screen.getByRole("region", { name: "Chỉ số chi phí" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Bảng khoản chi" })).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "Gợi ý thanh toán" }).textContent).toContain(
      "Minh trả Khánh",
    );
    expect(screen.getByRole("button", { name: "Xuất CSV" })).toBeTruthy();

    await actor.selectOptions(
      screen.getByRole("combobox", { name: "Lọc trạng thái khoản chi" }),
      "pending",
    );
    const table = screen.getByRole("table", { name: "Bảng khoản chi" });
    expect(within(table).getByText("Xe di chuyển")).toBeTruthy();
    expect(within(table).queryByText("Khách sạn")).toBeNull();
  });

  it("opens details, lets the expense owner update, and confirms deletion", async () => {
    const actor = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <ExpensesPanel
        currentUserId="lead-1"
        members={[
          { uid: "lead-1", displayName: "Khánh" },
          { uid: "member-1", displayName: "Minh" },
        ]}
        expenses={[{
          id: "expense-1", title: "Xe di chuyển", amount: 200_000, paidBy: "lead-1",
          splitAmong: ["lead-1", "member-1"], status: "pending", createdBy: "lead-1",
        }]}
        onDelete={onDelete}
        onUpdate={onUpdate}
      />,
    );

    await actor.click(screen.getByRole("button", { name: "Open Xe di chuyển details" }));
    const details = screen.getByRole("complementary", { name: "Expense details" });
    expect(within(details).getByText("Xe di chuyển")).toBeTruthy();

    await actor.click(within(details).getByRole("button", { name: "Edit expense" }));
    const title = within(details).getByRole("textbox", { name: "Expense title" });
    await actor.clear(title);
    await actor.type(title, "Xe sân bay");
    await actor.click(within(details).getByRole("button", { name: "Save expense changes" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith("expense-1", {
      title: "Xe sân bay", amount: 200_000, paidBy: "lead-1", splitAmong: ["lead-1", "member-1"],
    }));

    await actor.click(within(details).getByRole("button", { name: "Delete expense" }));
    expect(screen.getByRole("dialog", { name: "Confirm delete expense" })).toBeTruthy();
    await actor.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("expense-1"));
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
