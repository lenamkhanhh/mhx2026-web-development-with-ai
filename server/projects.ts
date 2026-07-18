import type { Project } from "./projectStore.js";

export const seedProjects: Project[] = [
  {
    id: "portfolio",
    title: "Evidence-led Portfolio",
    description: "A responsive React portfolio that presents verified academic and project evidence.",
    image: "/assets/paper-network.png",
    technologies: ["ReactJS", "TypeScript", "Vite"],
    link: "https://github.com/lenamkhanhh/portfolio",
  },
  {
    id: "fft-learning",
    title: "FFT Learning",
    description: "An interactive learning tool for spectrum bins and radix-2 butterfly stages.",
    image: "/assets/index-flow.png",
    technologies: ["JavaScript", "Algorithms", "Vite"],
    link: "https://github.com/lenamkhanhh/FFT-Learning",
  },
  {
    id: "api-course-lab",
    title: "Portfolio Projects API",
    description: "A validated REST API with CRUD operations and query-parameter filtering.",
    image: "/assets/observatory-path.png",
    technologies: ["NodeJS", "Express", "Zod"],
    link: "https://github.com/lenamkhanhh/portfolio",
  },
];
