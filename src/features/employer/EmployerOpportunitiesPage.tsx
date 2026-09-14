import { Briefcase, Plus } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "../../app/router/context";
import { useApplications, useOpportunities } from "../data/hooks";
import { useActor } from "../roles/useRole";
import { OVERDUE_DAYS, daysSince } from "../applications/stages";
import { EmptyState } from "../../shared/ui/EmptyState";
import { formatDate } from "../../shared/ui/Field";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";

export function EmployerOpportunitiesPage() {
  const actor = useActor();
  const { navigate } = useRouter();
  const postings = useOpportunities({ EmployerUserId: actor.userId });
  const apps = useApplications({ EmployerUserId: actor.userId }, true);
  const byPosting = useMemo(() => {
    const map = new Map<string, { total: number; shortlisted: number; overdue: number; hired: number }>();
    for (const application of apps.data ?? []) {
      const entry = map.get(application.OpportunityId) ?? { total: 0, shortlisted: 0, overdue: 0, hired: 0 };
      entry.total += 1;
      if (["Shortlisted", "Interviewing", "Offered", "Hired"].includes(application.CurrentStage)) entry.shortlisted += 1;
      if (application.CurrentStage === "Hired") entry.hired += 1;
      if (application.CurrentStage === "Interviewing" && daysSince(application.LastEmployerUpdateAt ?? application.LastStageChangeAt) >= OVERDUE_DAYS) entry.overdue += 1;
      map.set(application.OpportunityId, entry);
    }
    return map;
  }, [apps.data]);

  const rows = [...(postings.data ?? [])].sort((a, b) => new Date(b.CreatedDate ?? 0).getTime() - new Date(a.CreatedDate ?? 0).getTime());

  return (
    <section>
      <PageHeader title="My postings" subtitle="You only see applicants career services screened for your own postings. Keep outcomes updated so students stop waiting in silence." actions={<button className="primary-button" onClick={() => navigate("/employer/opportunities/new")}><Plus size={16} /> New posting</button>} />
      {postings.isLoading ? <Skeleton className="skeleton-line-lg" /> : null}
      {postings.data && rows.length === 0 ? <EmptyState icon={<Briefcase size={28} />} title="No postings yet" description="Post an internship with real requirements and career services will send you a screened shortlist." action={<button className="primary-button" onClick={() => navigate("/employer/opportunities/new")}>Post an internship</button>} /> : null}
      <div className="cards">
        {rows.map((posting) => {
          const stats = byPosting.get(posting.ItemId);
          return (
            <article key={posting.ItemId} className="card" onClick={() => navigate(`/employer/opportunities/${posting.ItemId}/applicants`)}>
              <div className="card-head">
                <div>
                  <h3>{posting.Title}</h3>
                  <p className="muted">{posting.Department} · {posting.Slots} slot{posting.Slots === 1 ? "" : "s"} · deadline {formatDate(posting.ApplicationDeadline)}</p>
                </div>
                <StatusPill tone={posting.Status === "Open" ? "good" : "neutral"}>{posting.Status}</StatusPill>
              </div>
              <div className="metrics inline">
                <div className="metric"><span>Applicants</span><strong>{stats?.total ?? 0}</strong></div>
                <div className="metric"><span>Shortlisted</span><strong>{stats?.shortlisted ?? 0}</strong></div>
                <div className="metric"><span>Hired</span><strong>{stats?.hired ?? 0}</strong></div>
                <div className={`metric${stats?.overdue ? " alert-metric" : ""}`}><span>Outcome overdue</span><strong>{stats?.overdue ?? 0}</strong></div>
              </div>
              <div className="row-actions"><button className="link-button" onClick={(event) => { event.stopPropagation(); navigate(`/employer/opportunities/${posting.ItemId}/edit`); }}>Edit posting</button></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
