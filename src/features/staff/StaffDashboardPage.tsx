import { AlertTriangle, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "../../app/router/context";
import { useApplications, useExplanations } from "../data/hooks";
import { findStuck, funnelOf } from "../analytics/placement";
import { toAnalyticsRows } from "../analytics/rows";
import { EmptyState } from "../../shared/ui/EmptyState";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";

export function StaffDashboardPage() {
  const { navigate } = useRouter();
  const apps = useApplications(undefined, true);
  const flagged = useExplanations({ FlaggedByStudent: true });
  const rows = useMemo(() => toAnalyticsRows(apps.data ?? []), [apps.data]);
  const stuck = useMemo(() => findStuck(rows), [rows]);
  const funnel = funnelOf(rows);
  const silent = stuck.filter((item) => item.reason === "employer-silent");
  const stalled = stuck.filter((item) => item.reason === "stalled-screening");

  return (
    <section>
      <PageHeader title="Who is stuck in silence right now?" subtitle="Computed live from every application. No inbox archaeology, no phone census." />
      <div className="metrics">
        <div className="metric"><span>Active applications</span><strong>{rows.filter((row) => !["Hired", "Rejected"].includes(row.currentStage ?? "")).length}</strong></div>
        <div className={`metric${silent.length ? " alert-metric" : ""}`}><span>Employers gone quiet</span><strong>{silent.length}</strong><small>no outcome for 14+ days</small></div>
        <div className={`metric${stalled.length ? " alert-metric" : ""}`}><span>Stalled in screening</span><strong>{stalled.length}</strong><small>7+ days without a decision</small></div>
        <div className="metric"><span>Hired this cycle</span><strong>{funnel.hired}</strong></div>
        <div className={`metric${flagged.data?.length ? " alert-metric" : ""}`}><span>Disputed explanations</span><strong>{flagged.data?.length ?? 0}</strong></div>
      </div>

      <div className="panel">
        <div className="panel-title"><Sparkles size={16} /><span>Coaching digest — suggested next actions</span></div>
        {apps.isLoading ? <Skeleton className="skeleton-line" /> : null}
        {!apps.isLoading && stuck.length === 0 ? <EmptyState icon={<CheckCircle2 size={28} />} title="Nobody is stuck" description="Every active application moved within the last two weeks." /> : null}
        <ul className="digest">
          {stuck.map((item) => (
            <li key={item.row.itemId} className={item.reason === "employer-silent" ? "silent" : "stalled"}>
              <div className="digest-icon">{item.reason === "employer-silent" ? <AlertTriangle size={18} /> : <Clock size={18} />}</div>
              <div className="digest-body">
                <strong>{item.row.applicantName}</strong> · {item.row.opportunityTitle} at {item.row.employerName}
                <p>{item.nextAction}</p>
                <span className="muted">{item.reason === "employer-silent" ? `Interviewing · employer silent ${item.days} days` : `${item.row.currentStage} · waiting ${item.days} days`}</span>
              </div>
              <button className="primary-button" onClick={() => navigate(`/staff/applications/${item.row.itemId}`)}>{item.reason === "employer-silent" ? "Escalate" : "Decide"}</button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
