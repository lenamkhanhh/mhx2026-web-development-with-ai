import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("screen density at compact desktop widths", () => {
  it("keeps detail rails at laptop widths and stacks them for tablet", () => {
    expect(styles("../features/events/EventsWorkbench.module.css")).toMatch(/@media \(max-width: 1120px\)[\s\S]*?\.timelineWorkspace\s*\{\s*grid-template-columns:\s*1fr;/);
    expect(styles("../features/expenses/ExpensesPanel.css")).toMatch(/@media \(max-width: 1120px\)[\s\S]*?\.expense-workbench__ledger\s*\{\s*grid-template-columns:\s*1fr;/);
    expect(styles("../features/members/MembersPanel.css")).toMatch(/@media \(max-width: 1120px\)[\s\S]*?\.members-panel\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\);/);
  });
});
