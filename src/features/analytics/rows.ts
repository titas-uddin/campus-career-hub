import type { Application } from "../data/models";
import type { AnalyticsRow } from "./placement";

export function toAnalyticsRows(items: Application[]): AnalyticsRow[] {
  return items.map((item) => ({
    itemId: item.ItemId,
    employerName: item.EmployerName,
    employerUserId: item.EmployerUserId,
    applicantDepartment: item.ApplicantDepartment,
    currentStage: item.CurrentStage,
    appliedAt: item.AppliedAt,
    interviewStartedAt: item.InterviewStartedAt ?? undefined,
    lastStageChangeAt: item.LastStageChangeAt,
    lastEmployerUpdateAt: item.LastEmployerUpdateAt ?? undefined,
    applicantName: item.ApplicantName,
    opportunityTitle: item.OpportunityTitle
  }));
}
