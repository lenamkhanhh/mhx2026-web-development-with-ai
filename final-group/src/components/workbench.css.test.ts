import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(new URL("./workbench.css", import.meta.url), "utf8");

describe("workbench responsive density", () => {
  it("moves the overview context rail below the table before desktop controls collide", () => {
    expect(stylesheet).toMatch(/@media \(max-width: 1320px\)[\s\S]*?\.workbench-overview\s*\{\s*grid-template-columns:\s*1fr;/);
  });
});
