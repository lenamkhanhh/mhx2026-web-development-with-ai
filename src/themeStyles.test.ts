import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("src/styles.css", "utf8");

describe("portfolio theme surfaces", () => {
  it("gives light and dark themes their own readable section washes", () => {
    expect(styles).toMatch(/:root\s*{[\s\S]*--section-wash:/);
    expect(styles).toMatch(/:root\[data-theme="dark"\]\s*{[\s\S]*--section-wash:/);
    expect(styles).toMatch(/\.trajectory-section\s*{[\s\S]*background:\s*var\(--section-wash\)/);
    expect(styles).toMatch(/\.foundation-section\s*{[\s\S]*background:\s*var\(--section-wash-strong\)/);
    expect(styles).toMatch(/\.competition-section\s*{[\s\S]*background:\s*var\(--section-wash\)/);
  });

  it("keeps invariant dark feature panels dark in both themes", () => {
    expect(styles).toMatch(/\.foundation-feature[^{}]*{[^}]*background:\s*var\(--fixed-dark-panel\)/);
    expect(styles).toMatch(/\.contact-panel\s*{[^}]*background:\s*var\(--fixed-dark-panel\)/);
  });
});
