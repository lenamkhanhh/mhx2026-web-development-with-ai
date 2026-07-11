import { describe, expect, it } from "vitest";
import { researchAtlasLayers } from "./motion";

describe("academic infrastructure background contract", () => {
  it("combines the approved fixed-field layers", () => {
    expect(researchAtlasLayers.map((layer) => layer.id)).toEqual([
      "spectral-base",
      "living-constellation-field",
      "blueprint-overlay",
    ]);
  });

  it("keeps every atlas layer decorative", () => {
    expect(researchAtlasLayers.every((layer) => layer.decorative)).toBe(true);
  });

  it("keeps animation isolated to the fixed viewport field", () => {
    expect(researchAtlasLayers.filter((layer) => layer.motion !== "none")).toEqual([
      expect.objectContaining({ id: "living-constellation-field", motion: "fixed-viewport" }),
    ]);
  });
});
