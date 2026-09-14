# CampusCareer — demo runbook

University internship and placement hub, built on SELISE Blocks OS.

- **Project:** CampusCareer (`D318d3278d4414be19accd612664558d3`), dev environment
- **App domain:** https://dbtqmg.slsblx.com
- **Local dev URL:** https://dbtqmg.slsblx.com:5173

## One-time local setup

```bash
sudo sh -c 'echo "127.0.0.1 dbtqmg.slsblx.com" >> /etc/hosts'
sudo cp .cert/dev-cert.pem /usr/local/share/ca-certificates/blocks-dev.crt && sudo update-ca-certificates
npm install
npm run cert     # already done once; regenerate only if .cert/ is deleted
npm run dev
```

Blocks hosted login sets a Secure, domain-scoped cookie, so the app must be opened on
`https://dbtqmg.slsblx.com:5173` — plain `localhost` never receives the session.

## Demo accounts

All six share the password in `.demo-password` (gitignored, never committed). The addresses are
yopmail throwaways — any mail sent to them is readable at https://yopmail.com with no signup.

| Email | Role | Plays |
|---|---|---|
| `cc-staff@yopmail.com` | staff | Career services — screens, shortlists, rejects, escalates |
| `cc-bs23@yopmail.com` | employer | Brain Station 23 HR |
| `cc-tanvir@yopmail.com` | student | Tanvir Ahmed, CSE '26 |
| `cc-nadia@yopmail.com` | student | Nadia Rahman |
| `cc-rafi@yopmail.com` | student | Rafi Hossain — the one who gets the kind rejection |
| `cc-dept@yopmail.com` | department | Accreditation / rankings view |

Your Blocks platform account is not a user of this project tenant, so sign in as
`cc-staff@yopmail.com` to run career services.

## Roles

Role is read from Blocks IAM (`iam.me().roles`) and decides routing, navigation and every screen.

| Role | Sees |
|---|---|
| `student` | Open postings, own applications, own journey timeline, own match explanation (can dispute it) |
| `employer` | Only their own postings and only the applicants career services shortlisted for them |
| `staff` | Everything: follow-up queue, all applications, shortlist/reject, disputed explanations, analytics |
| `department` | Placement analytics only — aggregates, no applicant names |

The project owner account (`clouduser`) is treated as staff so the account that created the
project can run career services without an extra role assignment.

## The scripted demo

1. **Employer posts** — sign in as the employer account → *My postings* → **New posting**:
   React Intern, Brain Station 23, CSE, skills `React, TypeScript, Testing, Git`, 3 slots.
2. **Students apply** — sign in as each student → complete profile once (skills + one sentence
   per project) → open the React Intern posting. The match explanation is shown **before**
   applying, then saved with the application.
3. **Career services screens** — sign in as staff → *Applications* → shortlist two with a note,
   reject the third with a recorded, kind reason.
4. **Student sees the journey** — back as the rejected student: the timeline shows every stage
   change and the rejection reason, not silence.
5. **Complication — employer goes quiet.** Employer marks the two shortlisted candidates
   *Interviewing*, then stops. Staff *Follow-ups* flags any application sitting in Interviewing
   for 14+ days with no employer update, with a suggested next action.
   To make the flag appear live, see "Ageing a record" below.
6. **Staff escalates** — open the flagged application → **Escalate to employer** → records a
   follow-up entry on the student-visible timeline.
7. **Employer reports the outcome** — employer marks **Hired**.
8. **Close on analytics** — staff *Placement analytics*: funnel conversion, median days to first
   interview, placements by department and by employer, updating live. This is the accreditation
   report that used to take three weeks of phone calls.

### Ageing a record for the overdue flag

The overdue rule is computed at query time from `LastEmployerUpdateAt` / `LastStageChangeAt`,
so a record only needs an older timestamp — no scheduler, nothing to wait for. Either demo it
with a record created earlier, or lower `OVERDUE_DAYS` in
`src/features/applications/stages.ts` to `0` for the demo run.

## What is computed, not stored

Nothing is a background job; Blocks Logic has no cron trigger, so both live numbers are derived
on read:

- **Overdue-outcome flag** — `src/features/analytics/placement.ts#findStuck`
- **Funnel, conversion, median days-to-first-interview** — same file, `funnelOf` / `groupBy` /
  `medianDaysToFirstInterview`

## Match explanation

`src/features/matching/explainMatch.ts` is a deterministic, rule-based explainer: skill-set diff
with an alias map, the most relevant sentence from the student's own profile, and one concrete
coaching tip keyed on the top missing skill. Plain language, **never a numeric score**, and the
student can dispute any explanation — disputes land in staff's *Flagged explanations*.

It is one pure function behind one call site, so swapping in an LLM later changes that file only.

`npm test` covers the alias map, the covered/missing split, tip selection and the no-score rule.

## Data model (Blocks Data Gateway)

`blocks/data/schemas/*.json`, pushed with `blocks data sync`.

| Schema | Purpose |
|---|---|
| `StudentProfile` | One per student; apply-once profile |
| `Opportunity` | Employer posting with real requirements |
| `Application` | The single application record, with applicant fields snapshotted at apply time |
| `StageEvent` | Append-only journey timeline |
| `MatchExplanation` | Explanation + the student's dispute |

Applicant name, skills and CV are **snapshotted onto `Application`**, so an employer never needs
read access to `StudentProfile` — "employers cannot browse a student database" is structural,
not a query filter.
