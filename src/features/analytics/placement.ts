import { DAY_MS, OVERDUE_DAYS, STALLED_SCREENING_DAYS, daysSince } from "../applications/stages";

export type AnalyticsRow = {
  itemId: string;
  employerName?: string;
  employerUserId?: string;
  applicantDepartment?: string;
  currentStage?: string;
  appliedAt?: string;
  interviewStartedAt?: string;
  lastStageChangeAt?: string;
  lastEmployerUpdateAt?: string;
  applicantName?: string;
  opportunityTitle?: string;
};

export type Funnel = { applied: number; shortlisted: number; interviewing: number; offered: number; hired: number; rejected: number };
export type GroupStat = { key: string; funnel: Funnel; conversion: number };

const REACHED: Record<string, (keyof Funnel)[]> = {
  Applied: ["applied"],
  Screening: ["applied"],
  Shortlisted: ["applied", "shortlisted"],
  Interviewing: ["applied", "shortlisted", "interviewing"],
  Offered: ["applied", "shortlisted", "interviewing", "offered"],
  Hired: ["applied", "shortlisted", "interviewing", "offered", "hired"],
  Rejected: ["applied", "rejected"]
};

function emptyFunnel(): Funnel {
  return { applied: 0, shortlisted: 0, interviewing: 0, offered: 0, hired: 0, rejected: 0 };
}

export function funnelOf(rows: AnalyticsRow[]): Funnel {
  const funnel = emptyFunnel();
  for (const row of rows) {
    for (const key of REACHED[row.currentStage ?? "Applied"] ?? ["applied"]) funnel[key] += 1;
  }
  return funnel;
}

export function groupBy(rows: AnalyticsRow[], pick: (row: AnalyticsRow) => string | undefined): GroupStat[] {
  const groups = new Map<string, AnalyticsRow[]>();
  for (const row of rows) {
    const key = pick(row) || "Unknown";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const funnel = funnelOf(group);
      return { key, funnel, conversion: funnel.applied ? Math.round((funnel.hired / funnel.applied) * 100) : 0 };
    })
    .sort((a, b) => b.funnel.hired - a.funnel.hired || b.funnel.applied - a.funnel.applied);
}

export function medianDaysToFirstInterview(rows: AnalyticsRow[]): number | undefined {
  const deltas = rows
    .filter((row) => row.appliedAt && row.interviewStartedAt)
    .map((row) => (new Date(row.interviewStartedAt as string).getTime() - new Date(row.appliedAt as string).getTime()) / DAY_MS)
    .filter((delta) => Number.isFinite(delta) && delta >= 0)
    .sort((a, b) => a - b);
  if (deltas.length === 0) return undefined;
  const mid = Math.floor(deltas.length / 2);
  const upper = deltas[mid] ?? 0;
  const lower = deltas[mid - 1] ?? upper;
  const median = deltas.length % 2 ? upper : (lower + upper) / 2;
  return Math.round(median * 10) / 10;
}

export type StuckReason = "employer-silent" | "stalled-screening";
export type StuckCase = { row: AnalyticsRow; reason: StuckReason; days: number; nextAction: string };

export function findStuck(rows: AnalyticsRow[], now = Date.now()): StuckCase[] {
  const stuck: StuckCase[] = [];
  for (const row of rows) {
    if (row.currentStage === "Interviewing") {
      const since = row.lastEmployerUpdateAt ?? row.lastStageChangeAt;
      const days = daysSince(since, now);
      if (days >= OVERDUE_DAYS) {
        stuck.push({ row, reason: "employer-silent", days, nextAction: `Ask ${row.employerName ?? "the employer"} for an outcome on ${row.applicantName ?? "this applicant"}; interviews ended ${days} days ago with no report.` });
      }
    } else if (row.currentStage === "Applied" || row.currentStage === "Screening") {
      const days = daysSince(row.lastStageChangeAt ?? row.appliedAt, now);
      if (days >= STALLED_SCREENING_DAYS) {
        stuck.push({ row, reason: "stalled-screening", days, nextAction: `Screen or decline ${row.applicantName ?? "this applicant"} for ${row.opportunityTitle ?? "the posting"}; waiting ${days} days without a decision.` });
      }
    }
  }
  return stuck.sort((a, b) => b.days - a.days);
}
