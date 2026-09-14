export type MatchInput = {
  opportunityTitle: string;
  skillsRequired: string[];
  studentSkills: string[];
  bio: string;
};

export type MatchResult = {
  summary: string;
  coveredSkills: string[];
  missingSkills: string[];
  relevantExperience: string;
  coachingTip: string;
};

const ALIASES: Record<string, string> = {
  reactjs: "react",
  "react.js": "react",
  js: "javascript",
  ts: "typescript",
  nodejs: "node",
  "node.js": "node",
  postgres: "postgresql",
  "c sharp": "c#",
  "rest api": "rest",
  "rest apis": "rest",
  "unit testing": "testing",
  "automated testing": "testing",
  jest: "testing",
  "tailwind css": "tailwind",
  "html5": "html",
  "css3": "css"
};

const TIPS: Record<string, string> = {
  testing: "Be ready to discuss automated testing in the interview: how you would test a component and what you would mock.",
  react: "Prepare to walk through one React component you built, including how state and props flow through it.",
  typescript: "Expect a question on why types help in a team codebase; have one concrete bug that types would have caught.",
  javascript: "Brush up on closures, promises and array methods; interviewers often start there.",
  sql: "Practice writing a JOIN and a GROUP BY by hand; most screens include one query question.",
  postgresql: "Practice writing a JOIN and a GROUP BY by hand; most screens include one query question.",
  git: "Be ready to explain your branching workflow and how you resolve a merge conflict.",
  node: "Prepare to explain how you structured one backend endpoint end to end, from request to database.",
  rest: "Be ready to design a small REST resource on a whiteboard, including status codes and error shapes.",
  python: "Expect a short live-coding exercise; practice reading input and using dictionaries fluently.",
  docker: "Know what a Dockerfile does line by line for one project you have shipped.",
  excel: "Bring one example of a spreadsheet you built with lookups or pivots and be ready to explain the logic.",
  communication: "Prepare a two-minute story about explaining a technical problem to a non-technical person."
};

const DEFAULT_TIP = "Strong match. Prepare a two-minute walkthrough of your most relevant project and the hardest decision you made in it.";

export function normalizeSkill(raw: string): string {
  const lower = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return ALIASES[lower] ?? lower;
}

function displaySkill(raw: string): string {
  return raw.trim();
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 12);
}

function overlapScore(sentence: string, keywords: string[]): number {
  const lower = sentence.toLowerCase();
  return keywords.reduce((score, keyword) => (keyword && lower.includes(keyword) ? score + 1 : score), 0);
}

export function explainMatch(input: MatchInput): MatchResult {
  const required = input.skillsRequired.map((skill) => ({ display: displaySkill(skill), key: normalizeSkill(skill) })).filter((skill) => skill.key);
  const owned = new Set(input.studentSkills.map(normalizeSkill).filter(Boolean));

  const coveredSkills = required.filter((skill) => owned.has(skill.key)).map((skill) => skill.display);
  const missingSkills = required.filter((skill) => !owned.has(skill.key)).map((skill) => skill.display);

  const keywords = [...required.map((skill) => skill.key), ...input.opportunityTitle.toLowerCase().split(/\W+/).filter((word) => word.length > 3)];
  const ranked = sentences(input.bio)
    .map((sentence) => ({ sentence, score: overlapScore(sentence, keywords) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const topMissing = missingSkills[0];
  const relevantExperience = best && best.score > 0
    ? best.sentence
    : topMissing
      ? `No project on the profile mentions ${topMissing}. Adding one would make this application much stronger.`
      : "The profile does not describe a project that matches this role yet; add one so reviewers can see it.";

  const tip = missingSkills.map(normalizeSkill).map((key) => TIPS[key]).find((value): value is string => Boolean(value));
  const coachingTip = tip ? tip : topMissing ? `Prepare a short answer on how you would learn ${topMissing} quickly, with one example of picking up a new tool before.` : DEFAULT_TIP;

  const total = required.length;
  const summary = total === 0
    ? "This posting lists no required skills, so the match is judged on the profile description alone."
    : missingSkills.length === 0
      ? `Covers all ${total} required skills for ${input.opportunityTitle}.`
      : `Covers ${coveredSkills.length} of ${total} required skills for ${input.opportunityTitle}; missing ${missingSkills.join(", ")}.`;

  return { summary, coveredSkills, missingSkills, relevantExperience, coachingTip };
}
