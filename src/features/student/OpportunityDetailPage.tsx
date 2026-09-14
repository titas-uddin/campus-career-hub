import { ArrowLeft, Send } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "../../app/router/context";
import { useApplications, useInvalidateAll, useOpportunity, useStudentProfile } from "../data/hooks";
import { useActor } from "../roles/useRole";
import { applyToOpportunity } from "../applications/api";
import { explainMatch } from "../matching/explainMatch";
import { Alert } from "../../shared/ui/Alert";
import { formatDate } from "../../shared/ui/Field";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ExplanationCard } from "../matching/ExplanationCard";

export function OpportunityDetailPage() {
  const { params, navigate } = useRouter();
  const actor = useActor();
  const opportunity = useOpportunity(params.id);
  const profile = useStudentProfile(actor.userId);
  const mine = useApplications({ StudentUserId: actor.userId });
  const invalidate = useInvalidateAll();
  const existing = (mine.data ?? []).find((application) => application.OpportunityId === params.id);

  const apply = useMutation({
    mutationFn: async () => {
      if (!opportunity.data || !profile.data || !actor.userId) throw new Error("Complete your profile before applying.");
      return applyToOpportunity(profile.data, opportunity.data, { userId: actor.userId, role: "student", name: actor.name });
    },
    onSuccess: (applicationId) => { invalidate(); navigate(`/student/applications/${applicationId}`); }
  });

  if (opportunity.isLoading) return <section><Skeleton className="skeleton-line-lg" /></section>;
  if (!opportunity.data) return <section><Alert tone="error">This posting no longer exists.</Alert></section>;
  const item = opportunity.data;
  const preview = profile.data ? explainMatch({ opportunityTitle: item.Title, skillsRequired: item.SkillsRequired ?? [], studentSkills: profile.data.Skills ?? [], bio: profile.data.Bio ?? "" }) : undefined;

  return (
    <section>
      <button className="link-button back" onClick={() => navigate("/student/opportunities")}><ArrowLeft size={14} /> All opportunities</button>
      <PageHeader title={item.Title} subtitle={`${item.EmployerName} · ${item.Department} · ${item.Slots} slot${item.Slots === 1 ? "" : "s"} · BDT ${item.Stipend?.toLocaleString()} / month · apply by ${formatDate(item.ApplicationDeadline)}`} />
      <div className="panel">
        <div className="panel-title">Required skills</div>
        <div className="chips">{(item.SkillsRequired ?? []).map((skill) => <span key={skill} className="chip">{skill}</span>)}</div>
        <p className="prose">{item.Description}</p>
      </div>

      {existing ? (
        <Alert tone="info">You applied on {formatDate(existing.AppliedAt)} and are currently at <strong>{existing.CurrentStage}</strong>. <button className="link-button" onClick={() => navigate(`/student/applications/${existing.ItemId}`)}>Open your journey</button></Alert>
      ) : !profile.data && !profile.isLoading ? (
        <Alert tone="warn">Complete your profile first so we can build your match explanation. <button className="link-button" onClick={() => navigate("/student/profile")}>Go to profile</button></Alert>
      ) : (
        <>
          {preview ? <ExplanationCard title="How you match, before you apply" explanation={preview} /> : null}
          {apply.error ? <Alert tone="error">{(apply.error as Error).message}</Alert> : null}
          {item.Status !== "Open" ? <Alert tone="warn">This posting is closed.</Alert> : (
            <button className="primary-button" disabled={apply.isPending || !profile.data} onClick={() => apply.mutate()}>
              <Send size={16} /> {apply.isPending ? "Submitting…" : "Apply with my profile"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
