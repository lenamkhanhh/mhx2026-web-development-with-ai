import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(new URL("./workbench.css", import.meta.url), "utf8");

describe("workbench responsive density", () => {
  it("keeps the overview context rail at laptop widths before stacking it for tablet", () => {
    expect(stylesheet).toMatch(/@media \(max-width: 1160px\)[\s\S]*?\.workbench-overview\s*\{\s*grid-template-columns:\s*1fr;/);
  });
});
