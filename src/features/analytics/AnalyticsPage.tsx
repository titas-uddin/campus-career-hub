import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { useApplications } from "../data/hooks";
import { useActor } from "../roles/useRole";
import { findStuck, funnelOf, groupBy, medianDaysToFirstInterview } from "./placement";
import type { Funnel, GroupStat } from "./placement";
import { toAnalyticsRows } from "./rows";
import { EmptyState } from "../../shared/ui/EmptyState";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";

function pct(part: number, whole: number): string {
  return whole ? `${Math.round((part / whole) * 100)}%` : "—";
}

export function AnalyticsPage() {
  const actor = useActor();
  const apps = useApplications(undefined, true);
  const rows = useMemo(() => toAnalyticsRows(apps.data ?? []), [apps.data]);
  const funnel = funnelOf(rows);
  const byDepartment = useMemo(() => groupBy(rows, (row) => row.applicantDepartment), [rows]);
  const byEmployer = useMemo(() => groupBy(rows, (row) => row.employerName), [rows]);
  const median = medianDaysToFirstInterview(rows);
  const silent = findStuck(rows).filter((item) => item.reason === "employer-silent").length;

  return (
    <section>
      <PageHeader title="Placement picture" subtitle={actor.role === "department" ? "Live accreditation view. Aggregates only; no applicant details." : "Which employers convert, which departments place, and who is stuck in silence right now."} />
      {apps.isLoading ? <Skeleton className="skeleton-line-lg" /> : null}
      {apps.data && rows.length === 0 ? <EmptyState icon={<BarChart3 size={28} />} title="No data yet" description="Analytics appear as soon as the first application is submitted." /> : null}

      <div className="metrics">
        <div className="metric"><span>Applications</span><strong>{funnel.applied}</strong></div>
        <div className="metric"><span>Shortlisted</span><strong>{funnel.shortlisted}</strong><small>{pct(funnel.shortlisted, funnel.applied)} of applied</small></div>
        <div className="metric"><span>Interviewed</span><strong>{funnel.interviewing}</strong><small>{pct(funnel.interviewing, funnel.shortlisted)} of shortlisted</small></div>
        <div className="metric"><span>Hired</span><strong>{funnel.hired}</strong><small>{pct(funnel.hired, funnel.applied)} overall conversion</small></div>
        <div className="metric"><span>Median days to first interview</span><strong>{median ?? "—"}</strong></div>
        <div className={`metric${silent ? " alert-metric" : ""}`}><span>Stuck in employer silence</span><strong>{silent}</strong></div>
      </div>

      <FunnelBars funnel={funnel} />

      <div className="two-col">
        <GroupTable title="Placements by department" label="Department" stats={byDepartment} />
        <GroupTable title="Placements by employer" label="Employer" stats={byEmployer} />
      </div>
    </section>
  );
}

function FunnelBars({ funnel }: { funnel: Funnel }) {
  const steps: [string, number][] = [["Applied", funnel.applied], ["Shortlisted", funnel.shortlisted], ["Interviewing", funnel.interviewing], ["Offered", funnel.offered], ["Hired", funnel.hired]];
  const max = Math.max(1, funnel.applied);
  return (
    <div className="panel">
      <div className="panel-title">Funnel conversion</div>
      <div className="funnel">
        {steps.map(([label, value]) => (
          <div key={label} className="funnel-row">
            <span className="funnel-label">{label}</span>
            <div className="funnel-track"><div className="funnel-bar" style={{ width: `${Math.max(2, (value / max) * 100)}%` }} /></div>
            <span className="funnel-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupTable({ title, label, stats }: { title: string; label: string; stats: GroupStat[] }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      {stats.length === 0 ? <p className="muted">No data</p> : (
        <div className="table-shell compact">
          <table>
            <thead><tr><th>{label}</th><th>Applied</th><th>Shortlisted</th><th>Interviewed</th><th>Hired</th><th>Conversion</th></tr></thead>
            <tbody>
              {stats.map((stat) => (
                <tr key={stat.key}>
                  <td><strong>{stat.key}</strong></td>
                  <td>{stat.funnel.applied}</td>
                  <td>{stat.funnel.shortlisted}</td>
                  <td>{stat.funnel.interviewing}</td>
                  <td>{stat.funnel.hired}</td>
                  <td><span className={`pill ${stat.conversion >= 25 ? "pill-good" : stat.conversion > 0 ? "pill-neutral" : "pill-warn"}`}>{stat.conversion}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
