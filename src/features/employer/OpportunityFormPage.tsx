import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "../../app/router/context";
import { DEPARTMENTS, opportunities, parseSkills } from "../data/models";
import { useInvalidateAll, useOpportunity } from "../data/hooks";
import { useActor } from "../roles/useRole";
import { Alert } from "../../shared/ui/Alert";
import { Field } from "../../shared/ui/Field";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";

function inThirtyDays(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

export function OpportunityFormPage() {
  const { params, navigate } = useRouter();
  const actor = useActor();
  const editing = Boolean(params.id);
  const existing = useOpportunity(params.id);
  const invalidate = useInvalidateAll();
  const [form, setForm] = useState({ Title: "", EmployerName: "", Department: "CSE", SkillsRequired: "", Stipend: 15000, Slots: 1, ApplicationDeadline: inThirtyDays(), Description: "", Status: "Open" });

  useEffect(() => {
    if (existing.data) {
      const item = existing.data;
      setForm({ Title: item.Title, EmployerName: item.EmployerName, Department: item.Department, SkillsRequired: (item.SkillsRequired ?? []).join(", "), Stipend: item.Stipend, Slots: item.Slots, ApplicationDeadline: item.ApplicationDeadline?.slice(0, 10) ?? inThirtyDays(), Description: item.Description, Status: item.Status });
    } else if (!editing && actor.name && !form.EmployerName) {
      setForm((current) => ({ ...current, EmployerName: current.EmployerName || actor.name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data, editing, actor.name]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        Title: form.Title.trim(),
        EmployerUserId: actor.userId as string,
        EmployerName: form.EmployerName.trim(),
        Department: form.Department,
        SkillsRequired: parseSkills(form.SkillsRequired),
        Stipend: Number(form.Stipend),
        Slots: Number(form.Slots),
        ApplicationDeadline: new Date(`${form.ApplicationDeadline}T23:59:00`).toISOString(),
        Description: form.Description.trim(),
        Status: form.Status as "Open" | "Closed"
      };
      if (existing.data) { await opportunities.update(existing.data.ItemId, payload); return existing.data.ItemId; }
      return opportunities.create(payload);
    },
    onSuccess: (id) => { invalidate(); navigate(`/employer/opportunities/${id}/applicants`); }
  });

  if (editing && existing.isLoading) return <section><Skeleton className="skeleton-line-lg" /></section>;

  return (
    <section>
      <button className="link-button back" onClick={() => navigate("/employer/opportunities")}><ArrowLeft size={14} /> My postings</button>
      <PageHeader title={editing ? "Edit posting" : "Post an internship"} subtitle="Real requirements in, screened shortlist out. Skills you list here drive every applicant's match explanation." />
      {save.error ? <Alert tone="error">{(save.error as Error).message}</Alert> : null}
      <form className="panel form-grid" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <Field label="Title"><input required value={form.Title} onChange={(event) => setForm({ ...form, Title: event.target.value })} placeholder="React Intern" /></Field>
        <Field label="Company name"><input required value={form.EmployerName} onChange={(event) => setForm({ ...form, EmployerName: event.target.value })} placeholder="Brain Station 23" /></Field>
        <Field label="Department">
          <select value={form.Department} onChange={(event) => setForm({ ...form, Department: event.target.value })}>
            {[...DEPARTMENTS, "Any"].map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.Status} onChange={(event) => setForm({ ...form, Status: event.target.value })}>
            <option value="Open">Open</option><option value="Closed">Closed</option>
          </select>
        </Field>
        <Field label="Required skills" hint="Comma separated"><input required value={form.SkillsRequired} onChange={(event) => setForm({ ...form, SkillsRequired: event.target.value })} placeholder="React, TypeScript, Testing, Git" /></Field>
        <Field label="Application deadline"><input type="date" required value={form.ApplicationDeadline} onChange={(event) => setForm({ ...form, ApplicationDeadline: event.target.value })} /></Field>
        <Field label="Monthly stipend (BDT)"><input type="number" min={0} value={form.Stipend} onChange={(event) => setForm({ ...form, Stipend: Number(event.target.value) })} /></Field>
        <Field label="Slots"><input type="number" min={1} value={form.Slots} onChange={(event) => setForm({ ...form, Slots: Number(event.target.value) })} /></Field>
        <div className="form-field" style={{ gridColumn: "1 / -1" }}>
          <span>Description</span>
          <textarea rows={5} required value={form.Description} onChange={(event) => setForm({ ...form, Description: event.target.value })} />
        </div>
        <div className="form-actions"><button className="primary-button" type="submit" disabled={save.isPending}><Save size={16} /> {save.isPending ? "Saving…" : editing ? "Save changes" : "Publish posting"}</button></div>
      </form>
    </section>
  );
}
