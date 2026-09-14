import { applications, matchExplanations, stageEvents } from "../data/models";
import type { Application, MatchExplanation, Opportunity, StudentProfile } from "../data/models";
import { explainMatch } from "../matching/explainMatch";
import type { Stage } from "./stages";

export type Actor = { userId: string; role: string; name: string };

export async function applyToOpportunity(profile: StudentProfile, opportunity: Opportunity, actor: Actor): Promise<string> {
  const now = new Date().toISOString();
  const applicationId = await applications.create({
    OpportunityId: opportunity.ItemId,
    OpportunityTitle: opportunity.Title,
    EmployerUserId: opportunity.EmployerUserId,
    EmployerName: opportunity.EmployerName,
    StudentUserId: actor.userId,
    ApplicantName: profile.FullName,
    ApplicantDepartment: profile.Department,
    ApplicantSkills: profile.Skills ?? [],
    ApplicantResumeFileId: profile.ResumeFileId ?? "",
    CurrentStage: "Applied",
    AppliedAt: now,
    LastStageChangeAt: now,
    ShortlistNote: "",
    RejectionReason: "",
    RejectedByUserId: ""
  });

  await stageEvents.create({
    ApplicationId: applicationId,
    StudentUserId: actor.userId,
    EmployerUserId: opportunity.EmployerUserId,
    Stage: "Applied",
    ChangedAt: now,
    ChangedByUserId: actor.userId,
    ChangedByRole: "student",
    Note: `Applied to ${opportunity.Title} at ${opportunity.EmployerName}.`
  });

  const result = explainMatch({
    opportunityTitle: opportunity.Title,
    skillsRequired: opportunity.SkillsRequired ?? [],
    studentSkills: profile.Skills ?? [],
    bio: profile.Bio ?? ""
  });

  await matchExplanations.create({
    ApplicationId: applicationId,
    OpportunityId: opportunity.ItemId,
    StudentUserId: actor.userId,
    EmployerUserId: opportunity.EmployerUserId,
    Summary: result.summary,
    CoveredSkills: result.coveredSkills,
    MissingSkills: result.missingSkills,
    RelevantExperience: result.relevantExperience,
    CoachingTip: result.coachingTip,
    GeneratedAt: now,
    FlaggedByStudent: false,
    FlagReason: ""
  });

  return applicationId;
}

export type StageChange = { stage: Stage; note?: string; rejectionReason?: string; shortlistNote?: string };

export async function changeStage(application: Application, change: StageChange, actor: Actor): Promise<void> {
  const now = new Date().toISOString();
  const patch: Partial<Application> = { CurrentStage: change.stage, LastStageChangeAt: now };

  if (change.stage === "Interviewing" && !application.InterviewStartedAt) patch.InterviewStartedAt = now;
  if (actor.role === "employer") patch.LastEmployerUpdateAt = now;
  if (change.stage === "Rejected") {
    patch.RejectionReason = change.rejectionReason ?? "";
    patch.RejectedByUserId = actor.userId;
    patch.RejectedAt = now;
  }
  if (change.stage === "Shortlisted" && change.shortlistNote !== undefined) patch.ShortlistNote = change.shortlistNote;

  await applications.update(application.ItemId, patch);
  await stageEvents.create({
    ApplicationId: application.ItemId,
    StudentUserId: application.StudentUserId,
    EmployerUserId: application.EmployerUserId,
    Stage: change.stage,
    ChangedAt: now,
    ChangedByUserId: actor.userId,
    ChangedByRole: actor.role,
    Note: change.note ?? defaultNote(change, application)
  });
}

function defaultNote(change: StageChange, application: Application): string {
  switch (change.stage) {
    case "Screening": return "Career services started reviewing your application.";
    case "Shortlisted": return `You were shortlisted for ${application.OpportunityTitle}.${change.shortlistNote ? ` ${change.shortlistNote}` : ""}`;
    case "Interviewing": return `${application.EmployerName} invited you to interview.`;
    case "Offered": return `${application.EmployerName} made you an offer.`;
    case "Hired": return `Congratulations, ${application.EmployerName} confirmed your placement.`;
    case "Rejected": return change.rejectionReason ? `Not moving forward this time: ${change.rejectionReason}` : "Not moving forward this time.";
    default: return "";
  }
}

export async function flagExplanation(explanation: MatchExplanation, reason: string): Promise<void> {
  await matchExplanations.update(explanation.ItemId, { FlaggedByStudent: true, FlagReason: reason, FlaggedAt: new Date().toISOString() });
}

export async function recordEmployerFollowUp(application: Application, actor: Actor, note: string): Promise<void> {
  await stageEvents.create({
    ApplicationId: application.ItemId,
    StudentUserId: application.StudentUserId,
    EmployerUserId: application.EmployerUserId,
    Stage: application.CurrentStage,
    ChangedAt: new Date().toISOString(),
    ChangedByUserId: actor.userId,
    ChangedByRole: actor.role,
    Note: note
  });
}
