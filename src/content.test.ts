import { describe, expect, it } from "vitest";
import {
  contact,
  headlineEvidence,
  interests,
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

  it("keeps every selected work item honest and inspectable", () => {
    expect(work).toHaveLength(3);
    expect(work.every((item) => item.href.startsWith("https://"))).toBe(true);
    expect(work.every((item) => item.status.length > 0)).toBe(true);
    expect(work.every((item) => item.artifact.length > 0)).toBe(true);
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
