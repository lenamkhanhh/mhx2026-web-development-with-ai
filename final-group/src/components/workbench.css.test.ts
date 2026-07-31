import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(new URL("./workbench.css", import.meta.url), "utf8");

describe("workbench responsive density", () => {
  it("keeps the overview context rail at laptop widths before stacking it for tablet", () => {
    expect(stylesheet).toMatch(/@media \(max-width: 1160px\)[\s\S]*?\.workbench-overview\s*\{\s*grid-template-columns:\s*1fr;/);
  });

  it("keeps Overview controls inside the viewport while the itinerary itself scrolls", () => {
    expect(stylesheet).toMatch(/\.workbench-overview-toolbar\s*\{[\s\S]*?grid-template-areas:\s*"counters actions";/);
    expect(stylesheet).toMatch(/@media \(max-width: 760px\)[\s\S]*?\.workbench-table-toolbar-actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/);
    expect(stylesheet).toMatch(/\.workbench-table-frame\s*\{[\s\S]*?overflow-x:\s*auto;/);
  });
});
