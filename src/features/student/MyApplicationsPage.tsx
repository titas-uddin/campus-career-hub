import { ClipboardList } from "lucide-react";
import { useRouter } from "../../app/router/context";
import { useApplications } from "../data/hooks";
import { useActor } from "../roles/useRole";
import { stageTone } from "../applications/stages";
import { EmptyState } from "../../shared/ui/EmptyState";
import { formatDate } from "../../shared/ui/Field";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";
import { StageProgress } from "../applications/StageProgress";

export function MyApplicationsPage() {
  const actor = useActor();
  const { navigate } = useRouter();
  const list = useApplications({ StudentUserId: actor.userId }, true);
  const rows = [...(list.data ?? [])].sort((a, b) => new Date(b.LastStageChangeAt).getTime() - new Date(a.LastStageChangeAt).getTime());

  return (
    <section>
      <PageHeader title="My applications" subtitle="Every stage change shows up here as soon as it happens. No more applying into silence." />
      {list.isLoading ? <Skeleton className="skeleton-line-lg" /> : null}
      {list.data && rows.length === 0 ? <EmptyState icon={<ClipboardList size={28} />} title="No applications yet" description="Find an internship and apply with your profile." action={<button className="primary-button" onClick={() => navigate("/student/opportunities")}>Browse opportunities</button>} /> : null}
      <div className="cards">
        {rows.map((application) => (
          <article key={application.ItemId} className="card" onClick={() => navigate(`/student/applications/${application.ItemId}`)}>
            <div className="card-head">
              <div>
                <h3>{application.OpportunityTitle}</h3>
                <p className="muted">{application.EmployerName} · applied {formatDate(application.AppliedAt)} · updated {formatDate(application.LastStageChangeAt)}</p>
              </div>
              <StatusPill tone={stageTone(application.CurrentStage)}>{application.CurrentStage}</StatusPill>
            </div>
            <StageProgress stage={application.CurrentStage} />
          </article>
        ))}
      </div>
    </section>
  );
}
