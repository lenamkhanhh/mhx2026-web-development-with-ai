import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("screen density at compact desktop widths", () => {
  it("keeps detail rails at laptop widths and stacks them for tablet", () => {
    expect(styles("../features/events/EventsWorkbench.module.css")).toMatch(/@media \(max-width: 1120px\)[\s\S]*?\.timelineWorkspace\s*\{\s*grid-template-columns:\s*1fr;/);
    expect(styles("../features/expenses/ExpensesPanel.css")).toMatch(/@media \(max-width: 1120px\)[\s\S]*?\.expense-workbench(?: \.expense-workbench__ledger)?\s*\{\s*grid-template-columns:\s*1fr\s*!important;/);
    expect(styles("../features/members/MembersPanel.css")).toMatch(/@media \(max-width: 1120px\)[\s\S]*?\.members-panel\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\);/);
  });

  it("overrides the global split grid on narrow expense layouts", () => {
    expect(styles("../features/expenses/ExpensesPanel.css")).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.expense-workbench \.expense-workbench__ledger[\s\S]*?grid-template-columns:\s*1fr\s*!important;/,
    );
  });

  it("sets a 10px minimum type floor for compact workbench metadata and controls", () => {
    expect(styles("./workbench.css")).toMatch(/\.workbench-shell :is\(span, small, p, label, button, input, select, code, dt, dd, th, td\)[\s\S]*?font-size:\s*max\(10px, 1em\);/);
  });
});
