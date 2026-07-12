import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreUniversityRecord } from "./PreUniversityRecord";

describe("PreUniversityRecord", () => {
  it("renders a photo-free three-stage evidence timeline aligned with the competition section", () => {
    const markup = renderToStaticMarkup(<PreUniversityRecord />);

    expect(markup).toContain("foundation-archive-section");
    expect(markup).toContain('class="section-label foundation-section-label"');
    expect(markup).toContain("Pre-university record");
    expect(markup).toContain("2022–2025");
    expect(markup).toContain("foundation-record-ledger");
    expect(markup.match(/foundation-timeline-node/g)).toHaveLength(3);
    expect(markup).toContain("Three years of steady progression.");
    expect(markup).toContain("First Prize");
    expect(markup).toContain("Two national distinctions.");
    expect(markup).not.toContain("foundation-bridge-figure");
    expect(markup).not.toContain("<img");
  });
});
