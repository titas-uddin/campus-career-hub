# Known security gap: data-layer row scoping

**Status: open. UI enforces scoping; the data layer does not.**

## The gap

Every schema is at access level `1` (all logged in). The app's queries filter by
`StudentUserId` / `EmployerUserId`, so the UI never shows a user data they shouldn't see —
but the filter is client-side, and a signed-in user can query the gateway directly.

Reproduce (any valid session token for a student):

```
POST https://blocksapi.slsblx.com/data/v4/gateway
  query getApplications { totalCount items { ApplicantName RejectionReason } }
→ returns all 3 applications, including other students' names and rejection reasons

  query getStudentProfiles { items { FullName Email } }
→ returns every student profile and email address
```

This breaks two rules the case brief states explicitly: *"an employer sees only applicants to
their own postings"* and *"a student sees their own applications and journey, never other
applicants."*

**Not affected:** anonymous access. All five schemas return `401 User is not authenticated`
without a session. Authentication is sound; authorization is the gap.

## What was tried

Blocks' native Custom row-level policies were authored, deployed and tested against the live
project. Every combination produced the same result: **all field values null for every role,
including staff, and rows never filtered** (`totalCount` and `ItemId` still returned).

| Variable | Values tried | Result |
|---|---|---|
| Rule expression | `UserID`/`UserId`/`user_id`/`sub` vs `StudentUserId`; reversed operand order | no effect |
| Control rule | `Email equals "<the caller's own address>"` — trivially true | **no effect** |
| `policyType` | `0` (RLS) accepted; `2`, `3` rejected by the API | no effect |
| `fieldNames` | empty → all columns denied; populated → `FIELD_NAMES_ARE_NOT_ALLOWED_FOR_ROW_LEVEL_SECURITY` | contradiction |
| Column policy (`policyType: 1`) | with all 8 field names, alone and combined with an RLS policy | no effect |
| `operation` | `0`,`1`,`2`,`3`,`4` | no effect |

The control rule is the decisive one: a policy whose single condition is
`Auth.Email equals "cc-rafi@yopmail.com"`, evaluated for that exact user, still returned no
data. That rules out operand naming and operator semantics as the cause — nothing was
evaluating true, so setting a schema to Custom is behaving as deny-all regardless of policy.

The policy request shape itself was reverse-engineered from live API validation errors, since
it is not documented and `/data/swagger/v1/swagger.json` returns 404:

```json
{"leftSource": 1, "leftOperand": "UserID", "operator": 0,
 "rightSource": 2, "rightOperand": "StudentUserId",
 "rightOperands": [], "staticValue": null, "description": null}
```
`leftSource`/`rightSource`: `0` static (use `staticValue`), `1` auth, `2` schema field.
Group container is `ruleGroup` with `logicalOperator` (`0` and / `1` or), `rules`, `nestedGroups`.

## Operational hazard found along the way

`blocks data rules deploy` applies the `security` array **before** `policies`, and reloads the
gateway only at the end. When the policy step fails, the schema is left at the new access level
with no reload — config and runtime silently disagree, and the next unrelated `data reload`
applies the broken state. Verify with `blocks data schema aggregation` after any failed deploy.

Column-level policies (`policyType: 1`) also keep masking fields **even at access level 1**;
lowering the access level does not neutralise them. They must be deleted explicitly with
`blocks data rules policy delete <itemId>`.

## Next steps

1. Build one policy through the Blocks OS portal's visual rule editor, then `blocks data rules
   pull` to capture a known-working shape. This is the fastest way to find whatever the API
   path is missing.
2. If the portal produces a working policy, this repo's `blocks/data/rules.json` can be
   restored from git history — the intended policy set was:
   - `Application` / `StageEvent` / `MatchExplanation` read: own-student **or** own-employer
     **or** staff **or** department
   - `StudentProfile` read: own **or** staff (employers never get access; applicant fields are
     snapshotted onto `Application` instead, so there is no student database to browse)
3. If Custom access cannot be made to work, raise it with the Blocks platform team — the
   evidence above is reproducible in minutes.
