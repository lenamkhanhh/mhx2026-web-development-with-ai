// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatisticsPanel } from "./StatisticsPanel";

afterEach(cleanup);

describe("StatisticsPanel", () => {
  it("renders expense totals and the largest recorded expense", () => {
    render(
      <StatisticsPanel
        members={[
          { uid: "lead-1", displayName: "Khánh" },
          { uid: "member-1", displayName: "Minh" },
        ]}
        expenses={[
          {
            id: "expense-1",
            title: "Khách sạn",
            amount: 900_000,
            paidBy: "lead-1",
            splitAmong: ["lead-1", "member-1"],
            status: "settled",
            createdBy: "lead-1",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tổng quan chi phí" })).toBeTruthy();
    expect(screen.getAllByText("900.000 ₫").length).toBeGreaterThan(0);
    expect(screen.getByText("Khách sạn")).toBeTruthy();
  });
});
