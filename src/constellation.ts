export const CONSTELLATION_SEED = 49374;
export const MAX_NEIGHBOURS = 3;
export const TOPOLOGY_INTERVAL_MS = 167;

export type ConstellationMode = "animated" | "static";

export interface ConstellationProfile {
  mode: ConstellationMode;
  nodeCount: number;
  fps: number;
  radius: number;
}

export interface ConstellationNode {
  x: number;
  y: number;
  phaseX: number;
  phaseY: number;
  driftX: number;
  driftY: number;
  twinklePhase: number;
  twinklePeriod: number;
  accent: "cobalt" | "violet" | "coral" | "olive";
}

export interface ProfileInput {
  width: number;
  reducedMotion: boolean;
  saveData: boolean;
}

const desktopProfile: ConstellationProfile = { mode: "animated", nodeCount: 84, fps: 45, radius: 238 };
const mobileProfile: ConstellationProfile = { mode: "animated", nodeCount: 32, fps: 22, radius: 172 };

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function getConstellationProfile({ width, reducedMotion, saveData }: ProfileInput): ConstellationProfile {
  const profile = width <= 767 ? mobileProfile : desktopProfile;
  return reducedMotion || saveData ? { ...profile, mode: "static", fps: 0 } : profile;
}

export function createConstellationNodes(seed: number, count: number): ConstellationNode[] {
  const random = seededRandom(seed);
  const accents: ConstellationNode["accent"][] = ["violet", "coral", "olive"];

  return Array.from({ length: count }, (_, index) => ({
    x: 0.035 + random() * 0.93,
    y: 0.045 + random() * 0.91,
    phaseX: random() * Math.PI * 2,
    phaseY: random() * Math.PI * 2,
    driftX: 8 + random() * 10,
    driftY: 8 + random() * 10,
    twinklePhase: random() * Math.PI * 2,
    twinklePeriod: 3 + random() * 4,
    accent: index % 23 === 0 ? accents[(index / 23) % accents.length | 0] : "cobalt",
  }));
}

export function nodePosition(node: ConstellationNode, width: number, height: number, timeSeconds: number) {
  return {
    x: node.x * width + Math.sin(timeSeconds * 0.46 + node.phaseX) * node.driftX,
    y: node.y * height + Math.cos(timeSeconds * 0.38 + node.phaseY) * node.driftY,
  };
}

export function buildConstellationTopology(
  nodes: readonly ConstellationNode[],
  width: number,
  height: number,
  timeSeconds = 0,
  radius = desktopProfile.radius,
): number[][] {
  const positions = nodes.map((node) => nodePosition(node, width, height, timeSeconds));
  const radiusSquared = radius * radius;

  return positions.map((point, index) => positions
    .map((candidate, candidateIndex) => ({
      candidateIndex,
      distance: (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2,
    }))
    .filter(({ candidateIndex, distance }) => candidateIndex !== index && distance <= radiusSquared)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, MAX_NEIGHBOURS)
    .map(({ candidateIndex }) => candidateIndex));
}
