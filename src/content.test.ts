import { describe, expect, it } from "vitest";
import {
  contact,
  currentCompetitionEvidence,
  headlineEvidence,
  interests,
  preUniversityAchievements,
  preUniversityArchivePeriod,
  profile,
  trajectory,
  work,
} from "./content";

describe("portfolio evidence contract", () => {
  it("keeps the verified academic identity and public contact details", () => {
    expect(profile.name).toBe("LÊ NAM KHÁNH");
    expect(profile.school).toBe("University of Science, VNU-HCM (HCMUS)");
    expect(profile.degree).toContain("First-year");
    expect(contact.email.value).toBe("lenamkhanh07082007@gmail.com");
    expect(contact.phone.value).toBe("0914061230");
  });

  it("surfaces only the three verified headline facts", () => {
    expect(headlineEvidence).toEqual([
      expect.objectContaining({ label: "GPA", value: "7.95 / 10" }),
      expect.objectContaining({ label: "Codeforces", value: "Expert · 1796" }),
      expect.objectContaining({
        label: "HCMUS Coding Challenge",
        value: "Champion · 2026",
      }),
    ]);
  });

  it("describes a direction instead of claiming research experience", () => {
    expect(trajectory.map((stage) => stage.title)).toEqual([
      "Algorithms",
      "Competitive Programming",
      "AI Foundations",
      "Current Interests",
    ]);
    expect(interests).toEqual([
      "Machine Learning",
      "Natural Language Processing",
      "Computer Vision",
      "Large Language Models",
    ]);
  });

  it("keeps the confirmed pre-university Informatics record specific and chronological", () => {
    expect(preUniversityAchievements).toEqual([
      expect.objectContaining({ award: "Third Prize", context: "Informatics · Grade 10" }),
      expect.objectContaining({ award: "Third Prize", context: "Informatics · Grade 11" }),
      expect.objectContaining({ award: "Second Prize", context: "Informatics · Grade 12" }),
      expect.objectContaining({ award: "First Prize", context: "Central Region · Table C2 · 2024" }),
      expect.objectContaining({ award: "Honourable Mention", context: "National Finals · 2024" }),
      expect.objectContaining({ award: "Bronze Medal", context: "Informatics · 2024" }),
    ]);
  });

  it("keeps the proof-led record grouped around its verified progression and official source", () => {
    expect(preUniversityAchievements.slice(0, 3).map((achievement) => achievement.award)).toEqual([
      "Third Prize",
      "Third Prize",
      "Second Prize",
    ]);
    expect(preUniversityAchievements[3]).toMatchObject({
      award: "First Prize",
      context: "Central Region · Table C2 · 2024",
    });
    expect(preUniversityAchievements[3]).toHaveProperty("href", "https://www.facebook.com/tuoitretinhninhthuan/posts/pfbid02wf7ZJXUyrVeDraiQnX2BvFnTZvxhPSGM8J4gWyLWsne4N9Y72ewgreu6dCNjHMSDl");
  });

  it("records the verified GDGoC team result without inflating its scope", () => {
    expect(currentCompetitionEvidence).toEqual({
      result: "Top 20 Outstanding Team",
      event: "GDGoC AI Challenge 2026",
      team: "Khô gà xé xợi",
      approach: "Reinforcement Learning",
      href: "https://drive.google.com/drive/folders/1QbcPpmv--MbtQ9fTujXMJVWtJOp69Z2s",
      coverSrc: "/assets/achievement/gdgoc-ai-challenge-cover.webp",
    });
  });

  it("keeps the approved 2022–2025 archive period and official GDGoC cover asset", () => {
    expect(preUniversityArchivePeriod).toBe("2022–2025");
    expect(currentCompetitionEvidence).toHaveProperty("coverSrc", "/assets/achievement/gdgoc-ai-challenge-cover.webp");
  });

  it("keeps every selected work item honest and inspectable", () => {
    expect(work).toHaveLength(3);
    expect(work.every((item) => item.href.startsWith("https://"))).toBe(true);
    expect(work.every((item) => item.status.length > 0)).toBe(true);
    expect(work.every((item) => item.artifact.length > 0)).toBe(true);
    expect(work.find((item) => item.title === "FFT Learning Notes")).toMatchObject({
      href: "https://fft-learning.vercel.app/",
      status: "Live learning tool",
    });
  });

  it("does not model unsupported career or impact claims", () => {
    const serialized = JSON.stringify({ profile, headlineEvidence, work });
    for (const forbidden of [
      "publication",
      "employment",
      "testimonial",
      "researchImpact",
      "solvedCount",
      "benchmark",
      "accuracy",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
