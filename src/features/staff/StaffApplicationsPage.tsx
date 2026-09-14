import { ClipboardList, Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "../../app/router/context";
import { useApplications } from "../data/hooks";
import { OVERDUE_DAYS, STAGES, daysSince, stageTone } from "../applications/stages";
import { DataTable } from "../../shared/ui/DataTable";
import type { Column } from "../../shared/ui/DataTable";
import { EmptyState } from "../../shared/ui/EmptyState";
import { formatDate } from "../../shared/ui/Field";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";
import type { Application } from "../data/models";

export function StaffApplicationsPage() {
  const { navigate } = useRouter();
  const apps = useApplications(undefined, true);
  const [stage, setStage] = useState("");
  const [search, setSearch] = useState("");

  const rows = (apps.data ?? [])
    .filter((application) => !stage || application.CurrentStage === stage)
    .filter((application) => !search || `${application.ApplicantName} ${application.OpportunityTitle} ${application.EmployerName}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.LastStageChangeAt).getTime() - new Date(a.LastStageChangeAt).getTime());

  const columns: Column<Application>[] = [
    { key: "applicant", header: "Applicant", render: (row) => <div><strong>{row.ApplicantName}</strong><br /><span className="muted">{row.ApplicantDepartment}</span></div> },
    { key: "posting", header: "Posting", render: (row) => <div>{row.OpportunityTitle}<br /><span className="muted">{row.EmployerName}</span></div> },
    { key: "stage", header: "Stage", render: (row) => {
      const silent = row.CurrentStage === "Interviewing" ? daysSince(row.LastEmployerUpdateAt ?? row.LastStageChangeAt) : 0;
      return <div className="stack"><StatusPill tone={stageTone(row.CurrentStage)}>{row.CurrentStage}</StatusPill>{silent >= OVERDUE_DAYS ? <span className="pill pill-warn">employer silent {silent}d</span> : null}</div>;
    } },
    { key: "applied", header: "Applied", render: (row) => formatDate(row.AppliedAt) },
    { key: "updated", header: "Last change", render: (row) => formatDate(row.LastStageChangeAt) },
    { key: "actions", header: "", render: (row) => <div className="row-actions"><button className="primary-button" onClick={() => navigate(`/staff/applications/${row.ItemId}`)}>Review</button></div> }
  ];

  return (
    <section>
      <PageHeader title="All applications" subtitle="One record per application. Screen, shortlist and send kind rejections from here." />
      <div className="toolbar">
        <div className="search-box"><Search size={16} /><input placeholder="Search applicant, posting or employer" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="toolbar-actions">
          <select className="select" value={stage} onChange={(event) => setStage(event.target.value)}>
            <option value="">All stages</option>
            {STAGES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>
      {apps.isLoading ? <Skeleton className="skeleton-line-lg" /> : null}
      {apps.data && rows.length === 0 ? <EmptyState icon={<ClipboardList size={28} />} title="No applications" description="Nothing matches this filter." /> : null}
      {rows.length ? <DataTable columns={columns} rows={rows} /> : null}
    </section>
  );
}
