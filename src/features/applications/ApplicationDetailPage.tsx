import { ArrowLeft, Check, Clock, MessageSquareWarning, X } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "../../app/router/context";
import { useApplication, useExplanation, useInvalidateAll, useStageEvents } from "../data/hooks";
import { useActor } from "../roles/useRole";
import { changeStage, flagExplanation, recordEmployerFollowUp } from "./api";
import { EMPLOYER_STAGES, OVERDUE_DAYS, daysSince, isTerminal, stageTone } from "./stages";
import type { Stage } from "./stages";
import { StageProgress } from "./StageProgress";
import { ExplanationCard } from "../matching/ExplanationCard";
import { Alert } from "../../shared/ui/Alert";
import { formatDate, formatDateTime } from "../../shared/ui/Field";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";

export function ApplicationDetailPage() {
  const { params, navigate } = useRouter();
  const actor = useActor();
  const application = useApplication(params.id, true);
  const events = useStageEvents(params.id, true);
  const explanation = useExplanation(params.id);
  const invalidate = useInvalidateAll();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"idle" | "reject" | "shortlist" | "followup">("idle");

  const act = useMutation({
    mutationFn: async (input: { stage?: Stage; followUp?: string }) => {
      if (!application.data || !actor.userId || !actor.role) throw new Error("Not ready.");
      const who = { userId: actor.userId, role: actor.role, name: actor.name };
      if (input.followUp) return recordEmployerFollowUp(application.data, who, input.followUp);
      if (!input.stage) return;
      return changeStage(application.data, { stage: input.stage, rejectionReason: input.stage === "Rejected" ? reason : undefined, shortlistNote: input.stage === "Shortlisted" ? note : undefined }, who);
    },
    onSuccess: () => { setMode("idle"); setReason(""); setNote(""); invalidate(); }
  });

  const flag = useMutation({
    mutationFn: (why: string) => flagExplanation(explanation.data!, why),
    onSuccess: () => invalidate()
  });

  if (application.isLoading) return <section><Skeleton className="skeleton-line-lg" /></section>;
  if (!application.data) return <section><Alert tone="error">Application not found.</Alert></section>;
  const item = application.data;
  const backPath = actor.role === "student" ? "/student/applications" : actor.role === "employer" ? `/employer/opportunities/${item.OpportunityId}/applicants` : "/staff/applications";
  const silentDays = item.CurrentStage === "Interviewing" ? daysSince(item.LastEmployerUpdateAt ?? item.LastStageChangeAt) : 0;
  const overdue = silentDays >= OVERDUE_DAYS;

  return (
    <section>
      <button className="link-button back" onClick={() => navigate(backPath)}><ArrowLeft size={14} /> Back</button>
      <PageHeader
        title={actor.role === "student" ? item.OpportunityTitle : `${item.ApplicantName} · ${item.OpportunityTitle}`}
        subtitle={`${item.EmployerName} · ${item.ApplicantDepartment} · applied ${formatDate(item.AppliedAt)}`}
        actions={<StatusPill tone={stageTone(item.CurrentStage)}>{item.CurrentStage}</StatusPill>}
      />
      <div className="panel"><StageProgress stage={item.CurrentStage} /></div>

      {overdue && actor.role !== "student" ? (
        <Alert tone="warn"><Clock size={14} /> <strong>Outcome overdue.</strong> {item.EmployerName} has not reported an outcome for {silentDays} days after interviews began. {actor.role === "staff" ? "Follow up with the employer." : "Please update the outcome below."}</Alert>
      ) : null}

      {actor.role !== "student" ? (
        <div className="panel">
          <div className="panel-title">Applicant snapshot</div>
          <p><strong>{item.ApplicantName}</strong> · {item.ApplicantDepartment}</p>
          <div className="chips">{(item.ApplicantSkills ?? []).map((skill) => <span key={skill} className="chip">{skill}</span>)}</div>
          {item.ShortlistNote ? <p className="muted">Shortlist note: {item.ShortlistNote}</p> : null}
        </div>
      ) : null}

      {explanation.data ? (
        <ExplanationCard
          title={actor.role === "student" ? "What we told employers about your fit" : "Match explanation (student can see and dispute this)"}
          explanation={{ summary: explanation.data.Summary, coveredSkills: explanation.data.CoveredSkills ?? [], missingSkills: explanation.data.MissingSkills ?? [], relevantExperience: explanation.data.RelevantExperience, coachingTip: explanation.data.CoachingTip, flaggedByStudent: explanation.data.FlaggedByStudent, flagReason: explanation.data.FlagReason }}
          onFlag={actor.role === "student" ? (why) => flag.mutateAsync(why) : undefined}
        />
      ) : explanation.isLoading ? <Skeleton className="skeleton-line" /> : null}

      {act.error ? <Alert tone="error">{(act.error as Error).message}</Alert> : null}

      {actor.role === "staff" && !isTerminal(item.CurrentStage) ? (
        <div className="panel">
          <div className="panel-title">Career services actions</div>
          {mode === "reject" ? (
            <div className="flag-form">
              <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Write the reason the student will read. Kind, specific, and useful: what to strengthen for next time." />
              <div className="form-actions">
                <button className="icon-button" onClick={() => setMode("idle")}>Cancel</button>
                <button className="primary-button danger" disabled={act.isPending || reason.trim().length < 10} onClick={() => act.mutate({ stage: "Rejected" })}><X size={16} /> Send kind rejection</button>
              </div>
            </div>
          ) : mode === "shortlist" ? (
            <div className="flag-form">
              <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for the employer, e.g. strongest React project in this batch." />
              <div className="form-actions">
                <button className="icon-button" onClick={() => setMode("idle")}>Cancel</button>
                <button className="primary-button" disabled={act.isPending} onClick={() => act.mutate({ stage: "Shortlisted" })}><Check size={16} /> Confirm shortlist</button>
              </div>
            </div>
          ) : mode === "followup" ? (
            <div className="flag-form">
              <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What did you do? e.g. Called Brain Station 23 HR, they will confirm by Friday." />
              <div className="form-actions">
                <button className="icon-button" onClick={() => setMode("idle")}>Cancel</button>
                <button className="primary-button" disabled={act.isPending || !note.trim()} onClick={() => act.mutate({ followUp: note.trim() })}><MessageSquareWarning size={16} /> Record follow-up</button>
              </div>
            </div>
          ) : (
            <div className="toolbar-actions">
              {item.CurrentStage === "Applied" ? <button className="icon-button outlined" disabled={act.isPending} onClick={() => act.mutate({ stage: "Screening" })}>Start screening</button> : null}
              {(item.CurrentStage === "Applied" || item.CurrentStage === "Screening") ? <button className="primary-button" onClick={() => setMode("shortlist")}><Check size={16} /> Shortlist</button> : null}
              {item.CurrentStage === "Interviewing" ? <button className="primary-button" onClick={() => setMode("followup")}><MessageSquareWarning size={16} /> Escalate to employer</button> : null}
              <button className="icon-button outlined danger-text" onClick={() => setMode("reject")}><X size={16} /> Reject with reason</button>
            </div>
          )}
        </div>
      ) : null}

      {actor.role === "employer" && !isTerminal(item.CurrentStage) && item.CurrentStage !== "Applied" && item.CurrentStage !== "Screening" ? (
        <div className="panel">
          <div className="panel-title">Report outcome</div>
          <p className="muted">Career services and the student see this immediately. Silence for {OVERDUE_DAYS} days gets flagged for follow-up.</p>
          <div className="toolbar-actions">
            {EMPLOYER_STAGES.filter((stage) => stage !== item.CurrentStage && stage !== "Rejected").map((stage) => (
              <button key={stage} className="primary-button" disabled={act.isPending} onClick={() => act.mutate({ stage })}>Mark {stage}</button>
            ))}
            <button className="icon-button outlined danger-text" disabled={act.isPending} onClick={() => { setReason("The employer chose another candidate after interviews."); act.mutate({ stage: "Rejected" }); }}>Not selected</button>
          </div>
        </div>
      ) : null}

      <div className="panel">
        <div className="panel-title"><Clock size={16} /><span>Journey</span></div>
        {events.isLoading ? <Skeleton className="skeleton-line" /> : null}
        <ol className="timeline">
          {(events.data ?? []).map((event) => (
            <li key={event.ItemId}>
              <span className={`dot tone-${stageTone(event.Stage)}`} />
              <div>
                <strong>{event.Stage}</strong> <span className="muted">· {formatDateTime(event.ChangedAt)} · by {event.ChangedByRole}</span>
                {event.Note ? <p>{event.Note}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
