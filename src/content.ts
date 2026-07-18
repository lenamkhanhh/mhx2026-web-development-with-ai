export type EvidenceTone = "academic" | "competitive" | "achievement";
export type WorkStatus = "Current work" | "Early project" | "Evolving notes" | "Live learning tool";
export type ArtifactKind = "training" | "voxel" | "fft";

export interface EvidenceItem {
  label: string;
  value: string;
  context: string;
  tone: EvidenceTone;
  href?: string;
}

export interface TrajectoryStage {
  title: string;
  description: string;
  marker: string;
}

export interface WorkItem {
  title: string;
  status: WorkStatus;
  type: string;
  focus: string;
  detail: string;
  artifact: string;
  artifactKind: ArtifactKind;
  href: string;
  action: string;
}

export interface PreUniversityAchievement {
  event: string;
  award: string;
  context: string;
  href?: string;
}

export const profile = {
  name: "LÊ NAM KHÁNH",
  shortName: "Nam Khánh",
  school: "University of Science, VNU-HCM (HCMUS)",
  degree: "Information Technology · First-year student",
  thesis: "From algorithms to research questions.",
  intro:
    "Competitive programming trained how I reason under constraints. I am now building the mathematical and technical foundations for AI research.",
};

export const contact = {
  email: {
    label: "Email",
    value: "lenamkhanh07082007@gmail.com",
    href: "mailto:lenamkhanh07082007@gmail.com",
  },
  github: {
    label: "GitHub",
    value: "lenamkhanhh",
    href: "https://github.com/lenamkhanhh",
  },
  codeforces: {
    label: "Codeforces",
    value: "Average2k7",
    href: "https://codeforces.com/profile/Average2k7",
  },
  cv: {
    label: "Download CV",
    value: "PDF",
    href: "/le-nam-khanh-cv.pdf",
  },
};

export const headlineEvidence: EvidenceItem[] = [
  {
    label: "GPA",
    value: "7.95 / 10",
    context: "First semester at HCMUS",
    tone: "academic",
  },
  {
    label: "Codeforces",
    value: "Expert · 1796",
    context: "Verified profile",
    tone: "competitive",
    href: contact.codeforces.href,
  },
  {
    label: "HCMUS Coding Challenge",
    value: "Champion · 2026",
    context: "University competition",
    tone: "achievement",
  },
];

export const trajectory: TrajectoryStage[] = [
  {
    title: "Algorithms",
    description: "Data structures, graph algorithms, mathematics, and proof-oriented reasoning.",
    marker: "01",
  },
  {
    title: "Competitive Programming",
    description: "Problem solving under time, implementation, and correctness constraints.",
    marker: "02",
  },
  {
    title: "AI Foundations",
    description: "Building foundations in linear algebra, probability, optimization, and learning.",
    marker: "03",
  },
  {
    title: "Current Interests",
    description: "Questions across machine learning, language, vision, and large language models.",
    marker: "04",
  },
];

export const preUniversityAchievements: PreUniversityAchievement[] = [
  {
    event: "Provincial Excellent Student Selection Examination",
    award: "Third Prize",
    context: "Informatics · Grade 10",
  },
  {
    event: "Provincial Excellent Student Selection Examination",
    award: "Third Prize",
    context: "Informatics · Grade 11",
  },
  {
    event: "Provincial Excellent Student Selection Examination",
    award: "Second Prize",
    context: "Informatics · Grade 12",
  },
  {
    event: "The 30th National Young Informatics Contest",
    award: "First Prize",
    context: "Central Region · Table C2 · 2024",
    href: "https://www.facebook.com/tuoitretinhninhthuan/posts/pfbid02wf7ZJXUyrVeDraiQnX2BvFnTZvxhPSGM8J4gWyLWsne4N9Y72ewgreu6dCNjHMSDl",
  },
  {
    event: "The 30th National Young Informatics Contest",
    award: "Honourable Mention",
    context: "National Finals · 2024",
  },
  {
    event: "The 28th Traditional April 30 Olympiad",
    award: "Bronze Medal",
    context: "Informatics · 2024",
  },
];

export const currentCompetitionEvidence = {
  result: "Top 20 Outstanding Team",
  event: "GDGoC AI Challenge 2026",
  team: "Khô gà xé xợi",
  approach: "Reinforcement Learning",
  href: "https://drive.google.com/drive/folders/1QbcPpmv--MbtQ9fTujXMJVWtJOp69Z2s",
  coverSrc: "/assets/achievement/gdgoc-ai-challenge-cover.webp",
} as const;

export const preUniversityArchivePeriod = "2022–2025";

export const work: WorkItem[] = [
  {
    title: "ICPC Solo Training System",
    status: "Current work",
    type: "Learning system",
    focus: "Algorithms · Data Structures",
    detail:
      "A structured 2026–2027 training plan with topic task banks, verified anchors, audit reports, and a reproducible workbook generator.",
    artifact: "Training plan → Topic task bank → Verified anchors → Audit reports → Workbook generator",
    artifactKind: "training",
    href: "https://github.com/lenamkhanhh/CP",
    action: "Open training evidence",
  },
  {
    title: "VoxelCode",
    status: "Early project",
    type: "Interactive project",
    focus: "C++ · Visual learning",
    detail:
      "An early interactive programming project currently being prepared for a clearer public release and technical write-up.",
    artifact: "Interactive programming environment · early public prototype",
    artifactKind: "voxel",
    href: "https://voxelcode.vercel.app/",
    action: "Open current prototype",
  },
  {
    title: "FFT Learning Notes",
    status: "Live learning tool",
    type: "Interactive study project",
    focus: "Mathematics · Algorithms · JavaScript",
    detail:
      "An interactive notebook for exploring radix-2 FFT output, spectrum bins, and the butterfly structure from first principles.",
    artifact: "Spectrum explorer · butterfly stages · tested radix-2 implementation",
    artifactKind: "fft",
    href: "https://fft-learning.vercel.app/",
    action: "Open interactive notebook",
  },
];

export const interests = [
  "Machine Learning",
  "Natural Language Processing",
  "Computer Vision",
  "Large Language Models",
] as const;
