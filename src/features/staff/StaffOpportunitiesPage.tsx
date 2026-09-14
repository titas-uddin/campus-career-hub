import { Briefcase } from "lucide-react";
import { useOpportunities, useApplications } from "../data/hooks";
import { DataTable } from "../../shared/ui/DataTable";
import type { Column } from "../../shared/ui/DataTable";
import { EmptyState } from "../../shared/ui/EmptyState";
import { formatDate } from "../../shared/ui/Field";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";
import type { Opportunity } from "../data/models";

export function StaffOpportunitiesPage() {
  const postings = useOpportunities();
  const apps = useApplications();
  const counts = new Map<string, { total: number; hired: number }>();
  for (const application of apps.data ?? []) {
    const entry = counts.get(application.OpportunityId) ?? { total: 0, hired: 0 };
    entry.total += 1;
    if (application.CurrentStage === "Hired") entry.hired += 1;
    counts.set(application.OpportunityId, entry);
  }
  const rows = [...(postings.data ?? [])].sort((a, b) => new Date(b.CreatedDate ?? 0).getTime() - new Date(a.CreatedDate ?? 0).getTime());

  const columns: Column<Opportunity>[] = [
    { key: "title", header: "Posting", render: (row) => <div><strong>{row.Title}</strong><br /><span className="muted">{row.EmployerName}</span></div> },
    { key: "dept", header: "Department", render: (row) => row.Department },
    { key: "skills", header: "Skills", render: (row) => <div className="chips">{(row.SkillsRequired ?? []).map((skill) => <span key={skill} className="chip">{skill}</span>)}</div> },
    { key: "slots", header: "Slots", render: (row) => `${counts.get(row.ItemId)?.hired ?? 0} / ${row.Slots} filled` },
    { key: "apps", header: "Applicants", render: (row) => String(counts.get(row.ItemId)?.total ?? 0) },
    { key: "deadline", header: "Deadline", render: (row) => formatDate(row.ApplicationDeadline) },
    { key: "status", header: "Status", render: (row) => <StatusPill tone={row.Status === "Open" ? "good" : "neutral"}>{row.Status}</StatusPill> }
  ];

  return (
    <section>
      <PageHeader title="Employer postings" subtitle="Every opportunity across all 200+ employer relationships, in one place." />
      {postings.isLoading ? <Skeleton className="skeleton-line-lg" /> : null}
      {postings.data && rows.length === 0 ? <EmptyState icon={<Briefcase size={28} />} title="No postings yet" description="Employers have not posted anything." /> : null}
      {rows.length ? <DataTable columns={columns} rows={rows} /> : null}
    </section>
  );
}
