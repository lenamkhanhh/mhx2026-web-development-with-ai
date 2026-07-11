import { describe, expect, it } from "vitest";
import {
  CONSTELLATION_SEED,
  buildConstellationTopology,
  createConstellationNodes,
  getConstellationProfile,
} from "./constellation";

describe("living constellation field contract", () => {
  it("creates the same seeded field on every run", () => {
    expect(createConstellationNodes(CONSTELLATION_SEED, 6)).toEqual(
      createConstellationNodes(CONSTELLATION_SEED, 6),
    );
  });

  it("uses the approved desktop and mobile quality budgets", () => {
    const desktop = getConstellationProfile({ width: 1440, reducedMotion: false, saveData: false });
    const mobile = getConstellationProfile({ width: 390, reducedMotion: false, saveData: false });

    expect(desktop.nodeCount).toBeGreaterThanOrEqual(72);
    expect(desktop.nodeCount).toBeLessThanOrEqual(90);
    expect(desktop.fps).toBeGreaterThanOrEqual(40);
    expect(desktop.fps).toBeLessThanOrEqual(45);
    expect(mobile.nodeCount).toBeGreaterThanOrEqual(28);
    expect(mobile.nodeCount).toBeLessThanOrEqual(36);
    expect(mobile.fps).toBeGreaterThanOrEqual(20);
    expect(mobile.fps).toBeLessThanOrEqual(24);
  });

  it("limits every node to three precomputed nearest neighbours", () => {
    const nodes = createConstellationNodes(CONSTELLATION_SEED, 84);
    const topology = buildConstellationTopology(nodes, 1440, 1024);

    expect(topology.every((neighbours) => neighbours.length <= 3)).toBe(true);
  });

  it("uses a single static frame for reduced motion and Save-Data", () => {
    expect(getConstellationProfile({ width: 1440, reducedMotion: true, saveData: false }).mode).toBe("static");
    expect(getConstellationProfile({ width: 390, reducedMotion: false, saveData: true }).mode).toBe("static");
  });
});
