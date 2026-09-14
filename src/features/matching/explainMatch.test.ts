import { describe, expect, it } from "vitest";
import { explainMatch, normalizeSkill } from "./explainMatch";

describe("normalizeSkill", () => {
  it("maps aliases and case", () => {
    expect(normalizeSkill("ReactJS")).toBe("react");
    expect(normalizeSkill("  JS ")).toBe("javascript");
    expect(normalizeSkill("Automated Testing")).toBe("testing");
  });
});

describe("explainMatch", () => {
  const opportunity = { opportunityTitle: "React Intern", skillsRequired: ["React", "TypeScript", "Testing", "Git"] };

  it("splits covered and missing skills exactly", () => {
    const result = explainMatch({ ...opportunity, studentSkills: ["ReactJS", "git", "SQL"], bio: "Built a React dashboard for a campus club. Wrote SQL reports for a shop." });
    expect(result.coveredSkills).toEqual(["React", "Git"]);
    expect(result.missingSkills).toEqual(["TypeScript", "Testing"]);
    expect(result.summary).toContain("Covers 2 of 4");
  });

  it("quotes the most relevant bio sentence", () => {
    const result = explainMatch({ ...opportunity, studentSkills: ["React"], bio: "Volunteered at a food bank. Built a React and TypeScript inventory app with unit tests." });
    expect(result.relevantExperience).toContain("React and TypeScript inventory app");
  });

  it("picks a coaching tip for the first missing skill that has one", () => {
    const result = explainMatch({ ...opportunity, studentSkills: ["React", "Git", "TypeScript"], bio: "Built things." });
    expect(result.missingSkills).toEqual(["Testing"]);
    expect(result.coachingTip.toLowerCase()).toContain("testing");
  });

  it("gives a default tip and full-match summary when nothing is missing", () => {
    const result = explainMatch({ ...opportunity, studentSkills: ["React", "TypeScript", "Testing", "Git"], bio: "Built a React app." });
    expect(result.missingSkills).toEqual([]);
    expect(result.summary).toContain("Covers all 4");
    expect(result.coachingTip).toContain("Strong match");
  });

  it("never emits a numeric score", () => {
    const result = explainMatch({ ...opportunity, studentSkills: ["React"], bio: "" });
    expect(JSON.stringify(result)).not.toMatch(/\b\d+(\.\d+)?\s*(%|\/\s*100)/);
  });
});
