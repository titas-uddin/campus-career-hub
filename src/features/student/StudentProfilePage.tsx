import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DEPARTMENTS, parseSkills, studentProfiles } from "../data/models";
import { useInvalidateAll, useStudentProfile } from "../data/hooks";
import { useActor } from "../roles/useRole";
import { Alert } from "../../shared/ui/Alert";
import { Field } from "../../shared/ui/Field";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";

export function StudentProfilePage() {
  const actor = useActor();
  const profile = useStudentProfile(actor.userId);
  const invalidate = useInvalidateAll();
  const [form, setForm] = useState({ FullName: "", Department: "CSE", GraduationYear: new Date().getFullYear() + 1, Skills: "", Bio: "", PortfolioUrl: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile.data) {
      setForm({
        FullName: profile.data.FullName ?? "",
        Department: profile.data.Department ?? "CSE",
        GraduationYear: profile.data.GraduationYear ?? new Date().getFullYear() + 1,
        Skills: (profile.data.Skills ?? []).join(", "),
        Bio: profile.data.Bio ?? "",
        PortfolioUrl: profile.data.PortfolioUrl ?? ""
      });
    } else if (!profile.isLoading && actor.name) {
      setForm((current) => ({ ...current, FullName: current.FullName || actor.name }));
    }
  }, [profile.data, profile.isLoading, actor.name]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        UserId: actor.userId as string,
        FullName: form.FullName.trim(),
        Email: actor.email ?? "",
        Department: form.Department,
        GraduationYear: Number(form.GraduationYear),
        Skills: parseSkills(form.Skills),
        Bio: form.Bio.trim(),
        PortfolioUrl: form.PortfolioUrl.trim(),
        ResumeFileId: profile.data?.ResumeFileId ?? ""
      };
      if (profile.data) await studentProfiles.update(profile.data.ItemId, payload);
      else await studentProfiles.create(payload);
    },
    onSuccess: () => { setSaved(true); invalidate(); }
  });

  if (profile.isLoading) return <section><Skeleton className="skeleton-line-lg" /></section>;

  return (
    <section>
      <PageHeader title="My profile" subtitle="One profile, many doors. Employers only see this in the context of an application you submit." />
      {!profile.data ? <Alert tone="info">Complete your profile once; every application reuses it and the match explanation is built from your skills and projects.</Alert> : null}
      {saved ? <Alert tone="info">Profile saved.</Alert> : null}
      {save.error ? <Alert tone="error">{(save.error as Error).message}</Alert> : null}
      <form className="panel form-grid" onSubmit={(event) => { event.preventDefault(); setSaved(false); save.mutate(); }}>
        <Field label="Full name"><input required value={form.FullName} onChange={(event) => setForm({ ...form, FullName: event.target.value })} /></Field>
        <Field label="Department">
          <select value={form.Department} onChange={(event) => setForm({ ...form, Department: event.target.value })}>
            {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
        </Field>
        <Field label="Graduation year"><input type="number" min={2020} max={2035} value={form.GraduationYear} onChange={(event) => setForm({ ...form, GraduationYear: Number(event.target.value) })} /></Field>
        <Field label="Portfolio or GitHub URL"><input value={form.PortfolioUrl} onChange={(event) => setForm({ ...form, PortfolioUrl: event.target.value })} placeholder="https://github.com/you" /></Field>
        <Field label="Skills" hint="Comma separated, e.g. React, TypeScript, SQL">
          <input required value={form.Skills} onChange={(event) => setForm({ ...form, Skills: event.target.value })} />
        </Field>
        <div className="form-field" style={{ gridColumn: "1 / -1" }}>
          <span>Projects and experience</span>
          <textarea rows={6} required value={form.Bio} onChange={(event) => setForm({ ...form, Bio: event.target.value })} placeholder="One sentence per project. Mention the tools you used; the match explanation picks the most relevant sentence." />
          <small className="muted">Write one sentence per project. The match explanation quotes the most relevant sentence to employers.</small>
        </div>
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={save.isPending}><Save size={16} /> {save.isPending ? "Saving…" : "Save profile"}</button>
        </div>
      </form>
    </section>
  );
}
