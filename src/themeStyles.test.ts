import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("src/styles.css", "utf8");

describe("portfolio theme surfaces", () => {
  it("keeps the sticky header outside any clipped scroll ancestor", () => {
    const shellRule = styles.match(/\.portfolio-shell\s*{([^}]*)}/)?.[1] ?? "";
    const headerRule = styles.match(/\.site-header\s*{([^}]*)}/)?.[1] ?? "";

    expect(shellRule).not.toMatch(/overflow:\s*(?:clip|hidden|auto|scroll)/);
    expect(headerRule).toMatch(/position:\s*sticky/);
    expect(headerRule).toMatch(/top:\s*0/);
  });

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
