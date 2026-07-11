export const easeOut = [0.16, 1, 0.3, 1] as const;

export const heroGroup = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.08,
    },
  },
};

export const heroItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: easeOut },
  },
};

export const revealItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: easeOut },
  },
};

export const layoutTransition = {
  layout: { duration: 0.36, ease: easeOut },
  opacity: { duration: 0.22 },
};

export const researchAtlasLayers = [
  { id: "spectral-base", decorative: true, motion: "none" },
  { id: "living-constellation-field", decorative: true, motion: "fixed-viewport" },
  { id: "blueprint-overlay", decorative: true, motion: "none" },
] as const;
