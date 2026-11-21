# Phase 5 — Report Cards, PDF/Print, Review, Approval & Publication

This phase adds the **report card lifecycle** on top of Phase 4 (authoritative
results). It turns the already-computed `TermResult` rows into **versioned,
reviewable, approvable, publishable report cards** with an A4-ready
screen/print view. It introduces **no new calculation** — every mark, grade,
average and position is copied verbatim from the authoritative result.

Scope: **report generation, versioned snapshots, lifecycle
(GENERATED → REVIEWED → APPROVED → PUBLISHED), stale invalidation &
republication, strict authorization/scoping/IDOR, audit logging, A4 print,
backend + frontend, tests.**

Out of scope (unchanged): tuition/finance, parent/student accounts,
transcript exports, unrelated ERP features.

---

## 1. Architecture — one authoritative source

The same rule as Phases 3–4 holds and is extended: the single calculation
path is `markEngine.js` → `resultService.js` → `TermResult`. `reportService.js`
**only reads** those persisted rows and freezes a copy into a `ReportVersion`.

```
routes → middleware (auth, CSRF, role) → reportController → reportService
                                                              ↓ (read-only)
                                            TermResult (authoritative, Phase 4)
```

`buildPayload()` copies `value`, `grade`, `average`, `rank`, `rankOutOf`,
`status`, `subjectsCounted/Total`, `missingPolicy`, `configHash` and
`calculationVersion` **verbatim** from the `TermResult`. Neither the screen nor
the PDF/print re-derives any official number. The printed PDF is the **same
`#report-card-document` DOM** the screen renders (via `window.print()`), so the
two can never diverge. A Phase 5 test asserts the detail payload equals the
source `TermResult` field-for-field.

## 2. Models

- `ReportCard` — the **current lifecycle pointer** for one
  (school, academicYear, term, class, student) window. Holds `status`,
  `currentVersion`, `isStale`, and provenance (`sourceTermResult`,
  `sourceConfigHash`) plus lifecycle actors. Unique on the 5-tuple. It points
  at the current version; it never stores report content itself.
- `ReportVersion` — **immutable, versioned** frozen payload. One doc per
  (reportCard, version). `payload` holds exactly what was reviewed, approved
  and published: student identity, class/year/term, subject rows (mark, grade,
  status), average, grade, position, completeness, missing-mark policy and the
  grading bands in force.
  - **Schema-hook immutability** (mirrors `ResultSnapshot`): `payload` and
    identity can never change; lifecycle actor fields may advance only while
    `status < PUBLISHED`; once `PUBLISHED` the whole doc is frozen; deletion is
    always blocked. Regeneration creates a NEW version — a published snapshot
    is never overwritten.

## 3. Period windows

Reports reuse the Phase 4 term-window rules exactly (via
`resultService.termsForTarget`): sequence 1 → `TERM` (that term); middle →
`CUMULATIVE` (terms 1..N); last → `ANNUAL` (all terms). A Term 2 report shows
Term 1 + Term 2 cumulative values; a Term 3 report shows the annual result.
The window and its included terms are recorded in both the card
(`resultType`, `termsIncluded`) and the frozen payload, and tested per window.

## 4. Lifecycle & validation

`GENERATED → REVIEWED → APPROVED → PUBLISHED`, enforced in
`reportService.transition`:

- The target card must be in the exact `from` state (no skipping, no double
  review/approval, no review after publication) → otherwise `400`.
- **Stale cards are rejected** at every transition. Staleness is recomputed
  live (`computeStale`) against the source `TermResult`: missing result, result
  flagged stale, `configHash` mismatch, or a `calculatedAt` newer than the
  report's `generatedAt`.
- **Publication re-verifies** the source result still matches the frozen
  `sourceConfigHash` and is not stale, so a published payload always equals the
  reviewed/approved one. Republishing a corrected report (version > 1) is
  audited as `REPORT_REPUBLISHED`.

Roles (no new roles): **generate / approve / publish / invalidate** are
ADMIN/DOS only; **review** also allows the CLASS_TEACHER **within their
assigned class**. All transitions are CSRF-protected.

## 5. Stale reports & republication

When marks change, `assessmentMarkService` → `resultService.markStaleForAssessment`
also calls `reportService.markReportsStale`, flagging every report card whose
`termsIncluded` contains the changed term (so cumulative/annual reports of a
changed term are covered too). Saving a grading scale flags every report for
that year (`markReportsStaleForYear`). A stale report must be recalculated,
regenerated (new version), re-reviewed and re-approved before it can be
published again. `invalidate` explicitly flags a **published** report stale
without touching any version. Best-effort hooks never block a mark write and
skip when no DB connection is live.

## 6. Authorization, scoping & IDOR

- **Reads** (`GET /api/reports…`): all four roles. TEACHER / CLASS_TEACHER
  lists are filtered server-side to their assignment tuples
  (`getTeacherScope`): a teacher sees only (year, term, class) tuples they
  teach; a class teacher additionally their assigned class. Exact tuple
  matching prevents tuple-crossing.
- **Single-report reads and CLASS_TEACHER transitions** re-check scope
  (`assertStaffCanAccess`); out-of-scope staff and cross-school requests return
  **404** (never 403, to avoid leaking existence).
- **Generation / approval / publication / invalidation**: ADMIN/DOS
  (`requireRole`), CSRF-protected. All audited.

## 7. Audit logging

`REPORT_GENERATED`, `REPORT_REVIEWED`, `REPORT_APPROVED`, `REPORT_PUBLISHED`,
`REPORT_REPUBLISHED`, `REPORT_INVALIDATED` — each with actor, entity and the
term/class/year/version context.

## 8. Frontend

- Redux `reportRelated` (slice + CSRF-aware thunks), registered in `store`.
- `ReportCardsPage` — filterable list (year/term/class/status/stale) with
  role-gated actions (generate, review, approve, publish, invalidate, view),
  status/stale chips, and loading/empty/error/success states.
- `ReportCardDetailPage` — renders the shared document, lets reviewers switch
  between the current and **historical versions** (each historical version is
  fetched from `/reports/:id/versions/:version` and rendered exactly), shows
  lifecycle timestamps, stale/incomplete/unpublished notices, and
  **Print / Save as PDF**.
- `ReportCardDocument` — the single A4 render shared by screen and print.
- A4 print CSS in `index.css`: `@page A4 portrait`, hides all app chrome,
  lays the document at the page origin, avoids mid-row page breaks, repeats
  table headers.
- Routes + sidebar links added to all four dashboards (admin, dos, teacher,
  class-teacher).

Endpoints: `GET /api/reports`, `GET /api/reports/:id`,
`GET /api/reports/:id/versions`, `GET /api/reports/:id/versions/:version`,
`POST /api/reports/generate`,
`POST /api/reports/:id/review|approve|publish|invalidate`.

## 9. Tests (`backend/tests/phase5.test.js`, 45 tests)

Validators; period windows (TERM/CUMULATIVE/ANNUAL) freezing the right terms;
verbatim payload from the authoritative result; identity/bands/completeness;
missing-result failures; regeneration creates a new version and resets the
card; full valid lifecycle and every invalid transition (skip, double,
post-publish, unknown, cross-school IDOR); stale-blocks-transition; publish
re-verification; version preservation & historical reads; stale marking from a
mark change and from a grading-scale change; full correction → regenerate →
review → approve → publish; invalidate preserves versions; HTTP role/scoping
(teacher/class-teacher in vs out, cross-school 404, CSRF, validation 400s);
audit trail over HTTP; screen/PDF payload == source `TermResult`; incomplete
report surfacing; list filters.

**Full backend suite: 331 tests green** (286 pre-existing + 45 Phase 5).
Frontend production build compiles (one pre-existing `LoginPage.js`
`exhaustive-deps` warning, unrelated to Phase 5).

---

## 10. Honest limitations (not production-launch claims)

- **PDF is produced by the browser print pipeline** (`window.print()` →
  "Save as PDF"), deliberately, so the PDF is byte-for-byte the same DOM as
  the screen and shares the single authoritative source. It is **not** a
  server-rendered PDF file and has **not** been pixel-inspected by a headless
  browser in this environment. A4 page size, margins, chrome-hiding and
  row-break rules are in place, but **visual page-overflow across many
  subjects has not been machine-verified** — verify on the target
  browser/printer before relying on exact pagination.
- **No multi-document transactions** (standalone MongoDB). Generation and
  transitions are per-document; per-student failures are surfaced explicitly
  (`success=false`, HTTP 207) rather than rolled back.
- **Authorization is enforced at the API layer.** The UI additionally hides
  actions by role, but the server is the source of truth (tests assert this).
- Tests pass and the build is green, but **passing tests are not a statement
  of production readiness** — deployment still needs environment/secrets,
  real data seeding, load/UX review and the visual PDF check above.

