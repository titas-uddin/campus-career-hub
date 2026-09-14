import { makeCollection } from "../../lib/blocks/data";

type System = { ItemId: string; CreatedDate?: string; CreatedBy?: string; LastUpdatedDate?: string };

export type StudentProfile = System & {
  UserId: string;
  FullName: string;
  Email: string;
  Department: string;
  GraduationYear: number;
  Skills: string[];
  Bio: string;
  ResumeFileId?: string;
  PortfolioUrl?: string;
};

export type Opportunity = System & {
  Title: string;
  EmployerUserId: string;
  EmployerName: string;
  Department: string;
  SkillsRequired: string[];
  Stipend: number;
  Slots: number;
  ApplicationDeadline: string;
  Description: string;
  Status: "Open" | "Closed";
};

export type Application = System & {
  OpportunityId: string;
  OpportunityTitle: string;
  EmployerUserId: string;
  EmployerName: string;
  StudentUserId: string;
  ApplicantName: string;
  ApplicantDepartment: string;
  ApplicantSkills: string[];
  ApplicantResumeFileId?: string;
  CurrentStage: string;
  AppliedAt: string;
  LastStageChangeAt: string;
  InterviewStartedAt?: string | null;
  LastEmployerUpdateAt?: string | null;
  ShortlistNote?: string;
  RejectionReason?: string;
  RejectedByUserId?: string;
  RejectedAt?: string | null;
};

export type StageEvent = System & {
  ApplicationId: string;
  StudentUserId: string;
  EmployerUserId: string;
  Stage: string;
  ChangedAt: string;
  ChangedByUserId: string;
  ChangedByRole: string;
  Note?: string;
};

export type MatchExplanation = System & {
  ApplicationId: string;
  OpportunityId: string;
  StudentUserId: string;
  EmployerUserId: string;
  Summary: string;
  CoveredSkills: string[];
  MissingSkills: string[];
  RelevantExperience: string;
  CoachingTip: string;
  GeneratedAt: string;
  FlaggedByStudent: boolean;
  FlagReason?: string;
  FlaggedAt?: string | null;
};

const SYSTEM_FIELDS = ["CreatedDate", "CreatedBy", "LastUpdatedDate"];

export const studentProfiles = makeCollection<StudentProfile>("StudentProfile", [
  ...SYSTEM_FIELDS, "UserId", "FullName", "Email", "Department", "GraduationYear", "Skills", "Bio", "ResumeFileId", "PortfolioUrl"
]);

export const opportunities = makeCollection<Opportunity>("Opportunity", [
  ...SYSTEM_FIELDS, "Title", "EmployerUserId", "EmployerName", "Department", "SkillsRequired", "Stipend", "Slots", "ApplicationDeadline", "Description", "Status"
]);

export const applications = makeCollection<Application>("Application", [
  ...SYSTEM_FIELDS, "OpportunityId", "OpportunityTitle", "EmployerUserId", "EmployerName", "StudentUserId", "ApplicantName", "ApplicantDepartment",
  "ApplicantSkills", "ApplicantResumeFileId", "CurrentStage", "AppliedAt", "LastStageChangeAt", "InterviewStartedAt", "LastEmployerUpdateAt",
  "ShortlistNote", "RejectionReason", "RejectedByUserId", "RejectedAt"
]);

export const stageEvents = makeCollection<StageEvent>("StageEvent", [
  ...SYSTEM_FIELDS, "ApplicationId", "StudentUserId", "EmployerUserId", "Stage", "ChangedAt", "ChangedByUserId", "ChangedByRole", "Note"
]);

export const matchExplanations = makeCollection<MatchExplanation>("MatchExplanation", [
  ...SYSTEM_FIELDS, "ApplicationId", "OpportunityId", "StudentUserId", "EmployerUserId", "Summary", "CoveredSkills", "MissingSkills",
  "RelevantExperience", "CoachingTip", "GeneratedAt", "FlaggedByStudent", "FlagReason", "FlaggedAt"
]);

export const DEPARTMENTS = ["CSE", "BBA", "EEE"] as const;

export function parseSkills(raw: string): string[] {
  return raw.split(/[,\n]/).map((skill) => skill.trim()).filter(Boolean);
}
