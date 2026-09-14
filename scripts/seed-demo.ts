/**
 * Seeds the scripted CampusCareer demo: one employer posting, three student
 * profiles, and three applications with real match explanations.
 *
 *   npx tsx scripts/seed-demo.ts
 *
 * Idempotent: re-running updates the posting and profiles in place and skips
 * students who have already applied. Reads the shared demo password from
 * .demo-password (gitignored) and never prints it.
 */
import { readFileSync } from "node:fs";
import { explainMatch } from "../src/features/matching/explainMatch";

const TENANT = "D318d3278d4414be19accd612664558d3";
const CLIENT_ID = "da69ed82-8884-45fa-8e51-281e63209b2a";
const IAM = "https://iam.seliseblocks.com";
const API = "https://blocksapi.slsblx.com";
const PASSWORD = readFileSync(new URL("../.demo-password", import.meta.url), "utf8").trim();

const POSTING = {
  Title: "React Intern",
  EmployerName: "Brain Station 23",
  Department: "CSE",
  SkillsRequired: ["React", "TypeScript", "Testing", "Git"],
  Stipend: 15000,
  Slots: 3,
  Description:
    "Join the frontend guild building customer dashboards in React and TypeScript. You will pair with a senior engineer, take real tickets from week two, and ship to production before the internship ends. We care more about how you reason through a problem than how many frameworks you have used.",
  Status: "Open"
};

const STUDENTS = [
  {
    email: "cc-tanvir@yopmail.com",
    FullName: "Tanvir Ahmed",
    Department: "CSE",
    GraduationYear: 2026,
    Skills: ["React", "TypeScript", "Git", "JavaScript", "Redux"],
    Bio: "Built a React and TypeScript dashboard for the campus robotics club that tracked over 200 inventory items across three labs. Automated my team's weekly status report with a small Node script that cut an hour of manual work each week. Volunteered two semesters as a peer tutor for first-year programming students.",
    PortfolioUrl: "https://github.com/tanvir-ahmed"
  },
  {
    email: "cc-nadia@yopmail.com",
    FullName: "Nadia Rahman",
    Department: "CSE",
    GraduationYear: 2026,
    Skills: ["React", "JavaScript", "Git", "SQL", "Figma"],
    Bio: "Built a React attendance app now used by three student clubs to track weekly meetings. Designed and shipped a Figma prototype for the university library website that the administration adopted. Wrote SQL reports for a local retail shop to track slow-moving stock.",
    PortfolioUrl: "https://github.com/nadia-rahman"
  },
  {
    email: "cc-rafi@yopmail.com",
    FullName: "Rafi Hossain",
    Department: "CSE",
    GraduationYear: 2026,
    Skills: ["HTML", "CSS", "JavaScript", "WordPress"],
    Bio: "Built three WordPress sites for local businesses including a restaurant and a tailoring shop. Completed a JavaScript course project that fetched and displayed weather data from a public API. Managed the social media page for our department's annual tech fest.",
    PortfolioUrl: "https://github.com/rafi-hossain"
  }
];

type Session = { token: string; userId: string };

async function login(username: string): Promise<Session> {
  const response = await fetch(`${IAM}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-blocks-key": TENANT },
    body: JSON.stringify({ username, password: PASSWORD, clientId: CLIENT_ID })
  });
  if (!response.ok) throw new Error(`login failed for ${username}: ${response.status}`);
  const token = (await response.json()).access_token as string;
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  return { token, userId: claims.user_id };
}

async function gql<T>(session: Session, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API}/data/v4/gateway`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-blocks-key": TENANT, authorization: `Bearer ${session.token}` },
    body: JSON.stringify({ query, variables })
  });
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(JSON.stringify(payload.errors).slice(0, 300));
  return payload.data as T;
}

const listQuery = (schema: string, fields: string) =>
  `query get${schema}s($input: DynamicQueryInput){ get${schema}s(input:$input){ totalCount items{ ItemId ${fields} } } }`;
const insertMutation = (schema: string) =>
  `mutation insert${schema}($input: ${schema}InsertInput!){ insert${schema}(input:$input){ acknowledged itemId message } }`;
const updateMutation = (schema: string) =>
  `mutation update${schema}($filter: String, $input: ${schema}UpdateInput!){ update${schema}(filter:$filter, input:$input){ acknowledged totalImpactedData } }`;

async function list<T>(session: Session, schema: string, fields: string, filter?: Record<string, unknown>): Promise<T[]> {
  const data = await gql<Record<string, { items: T[] }>>(session, listQuery(schema, fields), {
    input: { pageNo: 1, pageSize: 100, filter: filter ? JSON.stringify(filter) : undefined }
  });
  return data[`get${schema}s`].items;
}

async function insert(session: Session, schema: string, input: Record<string, unknown>): Promise<string> {
  const data = await gql<Record<string, { itemId: string }>>(session, insertMutation(schema), { input });
  return data[`insert${schema}`].itemId;
}

async function update(session: Session, schema: string, itemId: string, input: Record<string, unknown>): Promise<void> {
  await gql(session, updateMutation(schema), { filter: JSON.stringify({ ItemId: itemId }), input });
}

async function main() {
  console.log("signing in as the employer…");
  const employer = await login("cc-bs23@yopmail.com");

  const existing = await list<{ ItemId: string; Title: string }>(employer, "Opportunity", "Title EmployerUserId");
  const mine = existing.filter((item) => item.Title);
  let opportunityId: string;
  if (mine.length > 0) {
    opportunityId = mine[0].ItemId;
    await update(employer, "Opportunity", opportunityId, {
      ...POSTING,
      EmployerUserId: employer.userId,
      ApplicationDeadline: new Date(Date.now() + 30 * 86_400_000).toISOString()
    });
    console.log(`  updated posting "${mine[0].Title}" -> "${POSTING.Title}" (${POSTING.Slots} slots)`);
  } else {
    opportunityId = await insert(employer, "Opportunity", {
      ...POSTING,
      EmployerUserId: employer.userId,
      ApplicationDeadline: new Date(Date.now() + 30 * 86_400_000).toISOString()
    });
    console.log(`  created posting "${POSTING.Title}"`);
  }

  for (const student of STUDENTS) {
    const session = await login(student.email);
    const { email, ...profileFields } = student;

    const profiles = await list<{ ItemId: string }>(session, "StudentProfile", "UserId", { UserId: session.userId });
    if (profiles.length > 0) {
      await update(session, "StudentProfile", profiles[0].ItemId, { ...profileFields, Email: email, UserId: session.userId });
      console.log(`${student.FullName}: profile updated`);
    } else {
      await insert(session, "StudentProfile", { ...profileFields, Email: email, UserId: session.userId, ResumeFileId: "" });
      console.log(`${student.FullName}: profile created`);
    }

    const applied = await list<{ ItemId: string }>(session, "Application", "OpportunityId", {
      StudentUserId: session.userId,
      OpportunityId: opportunityId
    });
    if (applied.length > 0) {
      console.log(`  already applied — skipping`);
      continue;
    }

    const now = new Date().toISOString();
    const applicationId = await insert(session, "Application", {
      OpportunityId: opportunityId,
      OpportunityTitle: POSTING.Title,
      EmployerUserId: employer.userId,
      EmployerName: POSTING.EmployerName,
      StudentUserId: session.userId,
      ApplicantName: student.FullName,
      ApplicantDepartment: student.Department,
      ApplicantSkills: student.Skills,
      ApplicantResumeFileId: "",
      CurrentStage: "Applied",
      AppliedAt: now,
      LastStageChangeAt: now,
      ShortlistNote: "",
      RejectionReason: "",
      RejectedByUserId: ""
    });

    await insert(session, "StageEvent", {
      ApplicationId: applicationId,
      StudentUserId: session.userId,
      EmployerUserId: employer.userId,
      Stage: "Applied",
      ChangedAt: now,
      ChangedByUserId: session.userId,
      ChangedByRole: "student",
      Note: `Applied to ${POSTING.Title} at ${POSTING.EmployerName}.`
    });

    // Same pure function the app calls on apply, so the seeded explanations are
    // byte-for-byte what a live application would have produced.
    const result = explainMatch({
      opportunityTitle: POSTING.Title,
      skillsRequired: POSTING.SkillsRequired,
      studentSkills: student.Skills,
      bio: student.Bio
    });

    await insert(session, "MatchExplanation", {
      ApplicationId: applicationId,
      OpportunityId: opportunityId,
      StudentUserId: session.userId,
      EmployerUserId: employer.userId,
      Summary: result.summary,
      CoveredSkills: result.coveredSkills,
      MissingSkills: result.missingSkills,
      RelevantExperience: result.relevantExperience,
      CoachingTip: result.coachingTip,
      GeneratedAt: now,
      FlaggedByStudent: false,
      FlagReason: ""
    });

    console.log(`  applied — covered [${result.coveredSkills.join(", ") || "none"}] / missing [${result.missingSkills.join(", ") || "none"}]`);
  }

  console.log("\nseed complete. Sign in as cc-staff@yopmail.com to screen the three applicants.");
}

main().catch((error) => {
  console.error("seed failed:", error.message);
  process.exit(1);
});
