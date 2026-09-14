export const STAGES = ["Applied", "Screening", "Shortlisted", "Interviewing", "Offered", "Hired", "Rejected"] as const;
export type Stage = (typeof STAGES)[number];

export const STAFF_STAGES: Stage[] = ["Screening", "Shortlisted", "Rejected"];
export const EMPLOYER_STAGES: Stage[] = ["Interviewing", "Offered", "Hired", "Rejected"];

// Business rule is 14 days. Set VITE_OVERDUE_DAYS=0 to compress the clock for a
// live demo: the rule still reads the real LastEmployerUpdateAt timestamp.
export const OVERDUE_DAYS = Number(import.meta.env.VITE_OVERDUE_DAYS ?? 14);
export const STALLED_SCREENING_DAYS = Number(import.meta.env.VITE_STALLED_DAYS ?? 7);
export const DAY_MS = 86_400_000;

export function daysSince(iso?: string | null, now = Date.now()): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.floor((now - then) / DAY_MS);
}

export function stageTone(stage?: string): "good" | "warn" | "neutral" {
  if (stage === "Hired" || stage === "Offered") return "good";
  if (stage === "Rejected") return "warn";
  return "neutral";
}

export function isTerminal(stage?: string): boolean {
  return stage === "Hired" || stage === "Rejected";
}
