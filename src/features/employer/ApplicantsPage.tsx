import { ArrowLeft, Users } from "lucide-react";
import { useRouter } from "../../app/router/context";
import { useApplications, useExplanations, useOpportunity } from "../data/hooks";
import { OVERDUE_DAYS, daysSince, stageTone } from "../applications/stages";
import { DataTable } from "../../shared/ui/DataTable";
import type { Column } from "../../shared/ui/DataTable";
import { EmptyState } from "../../shared/ui/EmptyState";
import { formatDate } from "../../shared/ui/Field";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";
import type { Application } from "../data/models";

const VISIBLE_TO_EMPLOYER = ["Shortlisted", "Interviewing", "Offered", "Hired", "Rejected"];

export function ApplicantsPage() {
  const { params, navigate } = useRouter();
  const posting = useOpportunity(params.id);
  const apps = useApplications({ OpportunityId: params.id }, true);
  const explanations = useExplanations({ OpportunityId: params.id });
  const summaryByApp = new Map((explanations.data ?? []).map((explanation) => [explanation.ApplicationId, explanation.Summary]));

  const rows = (apps.data ?? [])
    .filter((application) => VISIBLE_TO_EMPLOYER.includes(application.CurrentStage) && (application.CurrentStage !== "Rejected" || application.LastEmployerUpdateAt))
    .sort((a, b) => new Date(b.LastStageChangeAt).getTime() - new Date(a.LastStageChangeAt).getTime());
  const pending = (apps.data ?? []).filter((application) => application.CurrentStage === "Applied" || application.CurrentStage === "Screening").length;

  const columns: Column<Application>[] = [
    { key: "name", header: "Applicant", render: (row) => <div><strong>{row.ApplicantName}</strong><br /><span className="muted">{row.ApplicantDepartment}</span></div> },
    { key: "fit", header: "Match", render: (row) => <span className="cell-wrap">{summaryByApp.get(row.ItemId) ?? "—"}</span> },
    { key: "stage", header: "Stage", render: (row) => {
      const silent = row.CurrentStage === "Interviewing" ? daysSince(row.LastEmployerUpdateAt ?? row.LastStageChangeAt) : 0;
      return <div className="stack"><StatusPill tone={stageTone(row.CurrentStage)}>{row.CurrentStage}</StatusPill>{silent >= OVERDUE_DAYS ? <span className="pill pill-warn">outcome overdue · {silent}d</span> : null}</div>;
    } },
    { key: "updated", header: "Updated", render: (row) => formatDate(row.LastStageChangeAt) },
    { key: "actions", header: "", render: (row) => <div className="row-actions"><button className="primary-button" onClick={() => navigate(`/employer/applications/${row.ItemId}`)}>Open</button></div> }
  ];

  return (
    <section>
      <button className="link-button back" onClick={() => navigate("/employer/opportunities")}><ArrowLeft size={14} /> My postings</button>
      <PageHeader title={posting.data?.Title ?? "Applicants"} subtitle={`Screened shortlist from career services. ${pending ? `${pending} more applicant${pending === 1 ? "" : "s"} still in screening.` : "Nothing waiting in screening."}`} />
      {apps.isLoading ? <Skeleton className="skeleton-line-lg" /> : null}
      {apps.data && rows.length === 0 ? <EmptyState icon={<Users size={28} />} title="No shortlisted applicants yet" description="Career services screens every application first. You will see candidates here once they are shortlisted." /> : null}
      {rows.length ? <DataTable columns={columns} rows={rows} /> : null}
    </section>
  );
}
