import { Flag, Lightbulb, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Alert } from "../../shared/ui/Alert";

export type ExplanationView = {
  summary: string;
  coveredSkills: string[];
  missingSkills: string[];
  relevantExperience: string;
  coachingTip: string;
  flaggedByStudent?: boolean;
  flagReason?: string;
};

export function ExplanationCard({ title, explanation, onFlag, footer }: { title: string; explanation: ExplanationView; onFlag?: (reason: string) => Promise<void> | void; footer?: ReactNode }) {
  const [flagging, setFlagging] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitFlag() {
    if (!onFlag || !reason.trim()) return;
    setBusy(true);
    try {
      await onFlag(reason.trim());
      setFlagging(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel explanation">
      <div className="panel-title"><Sparkles size={16} /><span>{title}</span></div>
      <p className="explanation-summary">{explanation.summary}</p>
      <div className="explanation-grid">
        <div>
          <span className="label">Covered</span>
          {explanation.coveredSkills.length ? <div className="chips">{explanation.coveredSkills.map((skill) => <span key={skill} className="chip chip-good">{skill}</span>)}</div> : <p className="muted">None of the listed skills yet</p>}
        </div>
        <div>
          <span className="label">Missing</span>
          {explanation.missingSkills.length ? <div className="chips">{explanation.missingSkills.map((skill) => <span key={skill} className="chip chip-warn">{skill}</span>)}</div> : <p className="muted">Nothing missing</p>}
        </div>
      </div>
      <div>
        <span className="label">Most relevant experience</span>
        <p className="prose">“{explanation.relevantExperience}”</p>
      </div>
      <div className="tip"><Lightbulb size={16} /><span>{explanation.coachingTip}</span></div>
      {explanation.flaggedByStudent ? <Alert tone="warn"><strong>Flagged by the student:</strong> {explanation.flagReason || "no reason given"}</Alert> : null}
      {onFlag && !explanation.flaggedByStudent ? (
        flagging ? (
          <div className="flag-form">
            <textarea rows={2} placeholder="What is wrong or missing? Staff read this before shortlisting." value={reason} onChange={(event) => setReason(event.target.value)} />
            <div className="form-actions">
              <button className="icon-button" onClick={() => setFlagging(false)}>Cancel</button>
              <button className="primary-button" disabled={busy || !reason.trim()} onClick={submitFlag}>{busy ? "Sending…" : "Send flag"}</button>
            </div>
          </div>
        ) : (
          <button className="link-button" onClick={() => setFlagging(true)}><Flag size={14} /> This doesn't look right</button>
        )
      ) : null}
      {footer}
    </div>
  );
}
