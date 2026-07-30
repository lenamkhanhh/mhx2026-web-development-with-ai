import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contracts = readFileSync(new URL("./contracts.ts", import.meta.url), "utf8");

describe("collaboration contracts", () => {
  it("defines attributable notes, sub-items, and activity records in the public backend contract", () => {
    expect(contracts).toContain("export interface EventNote");
    expect(contracts).toContain("export interface EventSubitem");
    expect(contracts).toContain("export interface TripActivity");
    expect(contracts).toContain("notes: EventNote[]");
    expect(contracts).toContain("subitems: EventSubitem[]");
    expect(contracts).toContain("activity: TripActivity[]");
  });
});
