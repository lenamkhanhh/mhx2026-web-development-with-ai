// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
});
