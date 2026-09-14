import { Flag } from "lucide-react";
import { useRouter } from "../../app/router/context";
import { useApplications, useExplanations } from "../data/hooks";
import { ExplanationCard } from "../matching/ExplanationCard";
import { EmptyState } from "../../shared/ui/EmptyState";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";

export function FlaggedExplanationsPage() {
  const { navigate } = useRouter();
  const flagged = useExplanations({ FlaggedByStudent: true });
  const apps = useApplications();
  const appById = new Map((apps.data ?? []).map((application) => [application.ItemId, application]));

  return (
    <section>
      <PageHeader title="Disputed match explanations" subtitle="Students can see exactly what was said about their fit and push back. Read these before shortlisting." />
      {flagged.isLoading ? <Skeleton className="skeleton-line-lg" /> : null}
      {flagged.data && flagged.data.length === 0 ? <EmptyState icon={<Flag size={28} />} title="No disputes" description="No student has flagged an explanation." /> : null}
      {(flagged.data ?? []).map((explanation) => {
        const application = appById.get(explanation.ApplicationId);
        return (
          <ExplanationCard
            key={explanation.ItemId}
            title={application ? `${application.ApplicantName} · ${application.OpportunityTitle}` : "Explanation"}
            explanation={{ summary: explanation.Summary, coveredSkills: explanation.CoveredSkills ?? [], missingSkills: explanation.MissingSkills ?? [], relevantExperience: explanation.RelevantExperience, coachingTip: explanation.CoachingTip, flaggedByStudent: true, flagReason: explanation.FlagReason }}
            footer={<div className="form-actions"><button className="primary-button" onClick={() => navigate(`/staff/applications/${explanation.ApplicationId}`)}>Review application</button></div>}
          />
        );
      })}
    </section>
  );
}
