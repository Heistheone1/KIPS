# Phase 3 — Assessments, Marks, Corrections & Authoritative Mark Engine

This phase adds the academic assessment and marking foundation on top of the
Phase 1 (Foundation + Security) and Phase 2 (Academic Foundation) systems.

Scope: **Assessments, Assessment Marks, Mark Correction/History, Missing-mark
policy, Assessment weights, Centralized mark calculations, Strict
authorization, Audit logging, Backend + Frontend management, Tests.**

Out of scope (later phases): final report cards, PDF reports, final ranking UI,
parent/student portals, finance, tuition, payroll, SMS.

---

## 1. Architecture (routes → middleware → controller → service → model)

Business rules live in **services**. Controllers stay thin. The frontend never
performs authoritative academic calculations — it only renders authoritative
values returned by the backend.

```
routes → middleware (auth, CSRF, role) → controller → service → model
```

---

## 2. Models

- `Assessment` — School + AcademicYear + Term + Class + Subject + type/name/
  maxMarks/weight/status/dates. Status lifecycle: `DRAFT → ACTIVE → CLOSED`,
  or `CANCELLED` at any time. `CLOSED`/`CANCELLED` assessments are frozen for
  field edits (only status transitions allowed).
- `AssessmentMark` — the **current authoritative** mark. Key distinction:
  - `entered: true, score: 0` → **real zero** (student scored zero)
  - `entered: false, score: null` → **missing mark** (not recorded)
  - Unique index on `{ assessment, student }` prevents duplicate active marks.
- `MarkCorrection` — **immutable, append-only** history of every mark change.

Assessment types and statuses are configurable enums
(`TEST, CAT, QUIZ, HOMEWORK, MID_TERM, EXAM, PRACTICAL, PROJECT, END_OF_TERM`)
and are exposed to the frontend via `GET /api/assessments/meta` so React never
hardcodes them.

---

## 3. Authorization (server-side, object-level)

Roles (unchanged): `ADMIN`, `DOS`, `CLASS_TEACHER`, `TEACHER`.

- **ADMIN / DOS** — school-wide academic authority.
- **TEACHER** — may manage assessments/marks **only** when an **active
  `TeacherAssignment`** exists matching `teacher + academicYear + term + class
  + subject`. Role alone never grants marking authority.
- **CLASS_TEACHER** — `ClassTeacherAssignment` grants class scope, but does NOT
  grant authority over every subject. A class teacher may only manage
  assessments where an actual teaching assignment (or explicit academic scope)
  applies. `CLASS_TEACHER` is not elevated to DOS.

The authoritative teacher-scope check lives in
`assessmentService.assertTeacherAssignmentScope()`. IDOR attempts (changing
class/subject/year/term/student/school IDs) are rejected server-side.

---

## 4. Enrollment Validation

Before a mark is recorded, `assessmentMarkService.assertStudentEnrolled()`
verifies an **active `Enrollment`** matching the assessment's
`school + academicYear + class`. Placement comes from **Enrollment**, not
`Student.classId`. Historical enrollment stays intact.

---

## 5. Missing-Mark Policy (configurable)

Centralized in `markEngine.policyConfig`:

- `ZERO` (default) — missing mark contributes `0`.
- `MINIMUM` — missing mark contributes `policyConfig.missingMinimum` (default
  `0.1`; env `MARK_MISSING_MINIMUM`). **Never hardcoded as `0.1` elsewhere.**
- `PENDING` — missing marks make the affected result incomplete.

A **real zero is never treated as missing.** Code uses the explicit `entered`
flag; it never uses truthiness (`if (!score)`) on a score.

---

## 6. Mark Engine — single source of truth

`backend/services/markEngine.js` is the ONLY place academic calculations occur:
`validateMark`, `normalizeMark`, `calculatePercentage`,
`calculateAssessmentContribution`, `calculateSubjectTotal`,
`calculateSubjectAverage`, `calculateTermAverage`, `determineGrade`,
`calculateClassStatistics`, `resolveMissingMark`, `validateAssessmentWeights`,
`roundForDisplay`.

**Precision:** intermediate math keeps full floating-point precision; rounding
(`roundForDisplay`, precision 2) is applied **only at final display**. Later
Results/Ranking/Reports phases consume these same authoritative values without
rewriting the calculation architecture.

---

## 7. Mark Editing & Correction History

Editing a mark never overwrites history. On every change the service:
1. validates current state,
2. appends a `MarkCorrection` (old/new score, old/new entered, student,
   assessment, reason, correctedBy, correctedAt),
3. updates the current `AssessmentMark`,
4. writes an audit entry.

This answers: original mark, current mark, who changed it, when, why, and how
many times. Correction history is append-only and cannot be edited.

---

## 8. Audit Logging

Uses the existing `AuditLog` infrastructure. Emits at minimum:
`ASSESSMENT_CREATED`, `ASSESSMENT_UPDATED`, `ASSESSMENT_STATUS_CHANGED`,
`MARK_CREATED`, `MARK_UPDATED`, `MARK_CORRECTED`. Logs safe IDs only — never
passwords, JWTs, tokens, or secrets.

---

## 9. API Routes

| Route | Notes |
|-------|-------|
| `GET  /api/assessments/meta` | assessment types + statuses for the UI |
| `GET  /api/assessments` | list (school-scoped, filtered by assignment scope for teachers) |
| `POST /api/assessments` | create (auth + CSRF + scope) |
| `GET  /api/assessments/:id` | read |
| `PUT  /api/assessments/:id` | update / status change (auth + CSRF + scope) |
| `GET  /api/assessment-marks` | list marks (filters: assessment, student) |
| `POST /api/assessment-marks` | record a mark (auth + CSRF + scope + enrollment) |
| `POST /api/assessment-marks/bulk` | bulk record (auth + CSRF + scope) |
| `GET  /api/assessment-marks/:id/history` | immutable correction history for a mark |
| `GET  /api/assessment-marks/assessment/:id/corrections` | all corrections for an assessment (ADMIN/DOS) |

Read routes require authentication; write routes require authentication + role
authorization + school scope + object-level academic scope + CSRF.

---

## 10. Security

- HttpOnly signed auth cookie, CSRF protection, secure cookie config,
  authentication/authorization middleware, school scoping, generic error
  handling — all preserved from Phase 1.
- **Mass assignment:** request bodies can never set `school`, `recordedBy`,
  `updatedBy`, `correctedBy`, `academicYear`, `term`, `class`. Identity always
  comes from `req.user`; school from authenticated context. Validators strip
  these fields.
- **Object-level authorization** is enforced server-side; the frontend respects
  permissions but is not trusted.

---

## 11. Known Limitation — MongoDB Transactions

MongoDB multi-document transactions require a **replica set**. The development
setup uses a **standalone** MongoDB, where transactions are unavailable. The
mark update path therefore performs, in the safest sequential order:
validate → append correction → update mark → audit. If the mark update fails
after a correction is appended, an orphan correction record could exist. This
is a documented limitation; in production with a replica set the same sequence
should be wrapped in a `session` transaction. No transaction guarantees are
claimed where they do not exist.

---

## 12. Testing

Run the complete suite (not only Phase 3):

```
cd backend
npm test
```

`phase3.test.js` covers authorization (role + object-level + IDOR +
cross-school), assessment validation, mark validation (zero vs missing,
bounds, enrollment), correction history (immutability, preserved fields), mark
engine calculations (all policies, weights, precision), CSRF, mass-assignment
protection, invalid ObjectId → 400, and audit generation.

Phase 1, Phase 2, and Phase 3 suites all pass together.
