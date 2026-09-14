const STEPS = ["Applied", "Screening", "Shortlisted", "Interviewing", "Offered", "Hired"];

export function StageProgress({ stage }: { stage: string }) {
  const rejected = stage === "Rejected";
  const index = STEPS.indexOf(stage);
  return (
    <ol className={`stage-progress${rejected ? " rejected" : ""}`}>
      {STEPS.map((step, position) => (
        <li key={step} className={position < index ? "done" : position === index ? "current" : ""}>
          <span className="dot" />
          <span className="step-label">{step}</span>
        </li>
      ))}
      {rejected ? <li className="current"><span className="dot" /><span className="step-label">Closed</span></li> : null}
    </ol>
  );
}
