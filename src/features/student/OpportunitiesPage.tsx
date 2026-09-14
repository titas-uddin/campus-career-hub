import { Briefcase, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useApplications, useOpportunities } from "../data/hooks";
import { useActor } from "../roles/useRole";
import { useRouter } from "../../app/router/context";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorState } from "../../shared/ui/ErrorState";
import { formatDate } from "../../shared/ui/Field";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";
import { stageTone } from "../applications/stages";

export function OpportunitiesPage() {
  const actor = useActor();
  const { navigate } = useRouter();
  const [search, setSearch] = useState("");
  const list = useOpportunities({ Status: "Open" });
  const mine = useApplications({ StudentUserId: actor.userId });
  const appliedByOpportunity = useMemo(() => new Map((mine.data ?? []).map((application) => [application.OpportunityId, application])), [mine.data]);

  const rows = (list.data ?? [])
    .filter((opportunity) => !search || `${opportunity.Title} ${opportunity.EmployerName} ${(opportunity.SkillsRequired ?? []).join(" ")}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.CreatedDate ?? 0).getTime() - new Date(a.CreatedDate ?? 0).getTime());

  return (
    <section>
      <PageHeader title="Open internships" subtitle="Apply once with your profile. You will see every stage change here, the moment it happens." />
      <div className="toolbar">
        <div className="search-box"><Search size={16} /><input placeholder="Search by title, company or skill" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      </div>
      {list.isLoading ? <Skeleton className="skeleton-line-lg" /> : null}
      {list.error ? <ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} /> : null}
      {list.data && rows.length === 0 ? <EmptyState icon={<Briefcase size={28} />} title="No open postings" description="Employers have not posted anything yet. Check back soon." /> : null}
      <div className="cards">
        {rows.map((opportunity) => {
          const applied = appliedByOpportunity.get(opportunity.ItemId);
          return (
            <article key={opportunity.ItemId} className="card" onClick={() => navigate(`/student/opportunities/${opportunity.ItemId}`)}>
              <div className="card-head">
                <div>
                  <h3>{opportunity.Title}</h3>
                  <p className="muted">{opportunity.EmployerName} · {opportunity.Department} · {opportunity.Slots} slot{opportunity.Slots === 1 ? "" : "s"}</p>
                </div>
                {applied ? <StatusPill tone={stageTone(applied.CurrentStage)}>{applied.CurrentStage}</StatusPill> : <StatusPill tone="neutral">Open</StatusPill>}
              </div>
              <div className="chips">{(opportunity.SkillsRequired ?? []).map((skill) => <span key={skill} className="chip">{skill}</span>)}</div>
              <p className="muted">Stipend BDT {opportunity.Stipend?.toLocaleString()} · Apply by {formatDate(opportunity.ApplicationDeadline)}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
