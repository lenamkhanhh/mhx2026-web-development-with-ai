export type EvidenceTone = "academic" | "competitive" | "achievement";
export type WorkStatus = "Current work" | "Early project" | "Evolving notes";
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
  phone: {
    label: "Phone",
    value: "0914061230",
    href: "tel:0914061230",
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
    status: "Evolving notes",
    type: "Study notes",
    focus: "Mathematics · Algorithms",
    detail:
      "An evolving collection of visual and written notes for understanding Fast Fourier Transform from first principles.",
    artifact: "Derivation notes · butterfly structure · implementation checklist",
    artifactKind: "fft",
    href: "https://github.com/lenamkhanhh/FFT-Learning",
    action: "Open learning notes",
  },
];

export const interests = [
  "Machine Learning",
  "Natural Language Processing",
  "Computer Vision",
  "Large Language Models",
] as const;
