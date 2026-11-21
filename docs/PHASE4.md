# Phase 4 — Authoritative Results, Cumulative Calculations & Ranking

This phase adds the derived-results layer on top of Phase 3 (assessments, marks
& the authoritative mark engine). It converts raw marks into **subject results**,
**term/cumulative/annual results**, **grades** and **class rankings**, with
immutable snapshots and stale-result invalidation.

Scope: **Subject results, term windows (TERM/CUMULATIVE/ANNUAL), grade scales,
competition ranking, cumulative averages, snapshot history, stale marking,
authoritative generation, audit logging, backend + frontend, tests.**

Out of scope (later phases): PDF report cards, printing templates, parent
portals, transcript exports.

---

## 1. Architecture

Same rule as Phase 3: the single calculation path is `markEngine.js` (pure
functions). `resultService.js` orchestrates I/O only; controllers stay thin;
React only renders backend values — it never computes results.

```
routes → middleware (auth, CSRF, role) → controller → resultService → markEngine
```

## 2. Models

- `SubjectResult` — **current** derived result per
  (school, academicYear, term, class, subject, student). Stores the **unrounded**
  weighted `total` (0..100), grade, `COMPLETE | INCOMPLETE` status, `isStale`
  flag, per-assessment `sourceMarks` provenance and `configHash`.
  Unique index prevents duplicates; regeneration **upserts**.
- `TermResult` — current result per (…, student, resultType) where resultType is
  `TERM | CUMULATIVE | ANNUAL`. Holds the unrounded `average`, per-subject
  entries, competition `rank` / `rankOutOf` and `isStale`.
- `ResultSnapshot` — **append-only** history written on every generation. A
  schema pre-hook blocks `updateOne/updateMany/findOneAndUpdate/deleteOne/
  deleteMany/findOneAndDelete/replaceOne` and `save` on existing docs, so what
  was officially calculated, when, by whom and with which configuration can
  never be rewritten.
- `GradingScale` — per-school/per-year grade bands (grade, min%, max%, remark).
  One `ACTIVE` scale per (school, year); saving supersedes the previous one and
  flags all existing results in that year stale.

## 3. Term windows (sequence-based)

Configured terms are ordered by `sequence`:

| Target term position | Result type | Terms included |
|---|---|---|
| First (sequence 1) | `TERM` | that term only |
| Middle | `CUMULATIVE` | terms 1..N |
| Last | `ANNUAL` | every configured term |
| Single-term year | `TERM` | that term |

Cumulative/annual averages are the mean of **unrounded per-subject values**
across the window; terms without data for a subject are skipped, never treated
as zero.

## 4. Grades & ranking

- Default bands: A 80-100, B 70-80, C 60-70, D 50-60, F 0-50. Bounds are
  **lower-inclusive, upper-exclusive** (100 inclusive at the top). Gaps between
  custom bands are allowed but resolve to `grade: null` — gaps stay visible and
  are never silently filled.
- Ranking: **COMPETITION** (1, 1, 3) on unrounded averages; deterministic
  student-id tie-break; only `COMPLETE` results are eligible; ineligible rows
  get `rank: null`. `DENSE`/`NONE` are supported by the engine.
- Weights are percentage-points and must sum to ≤ 100% per subject — never
  silently normalised.

## 5. Invalidation (stale marking)

Marking `assessmentMarkService.recordMark` (create **and** correction paths)
calls `resultService.markStaleForAssessment`, flagging `isStale: true` on the
affected subject scope and its term rows. The hook is try/catch-wrapped and
skips when no DB connection is live, so it can never block a mark write. Saving
a grading scale flags every result in that year. Authorised generation /
recalculation recomputes and clears the flags. No transactions (standalone
Mongo): per-student failures are reported; `success=false` and HTTP 207 when
any student fails.

## 6. Authorization

- **Read** (`/api/results/…`): all roles. TEACHER/CLASS_TEACHER rows are
  filtered server-side to their assignment tuples / class-teacher class.
- **Generate / recalculate / grading-scale save**: **ADMIN / DOS only**,
  CSRF-protected and audited (`RESULTS_GENERATED`, `RESULTS_RECALCULATED`,
  `GRADING_SCALE_SAVED`).

Endpoints: `GET /api/results/meta|subject|term|status|snapshots|grading-scale`,
`POST /api/results/subject/generate|term/generate|recalculate|grading-scale`.

## 7. Frontend

Redux slice `resultRelated` (slice + thunks, CSRF-aware writes). Pages:
`ResultPage` (term/cumulative/annual windows with generate/recalculate) and
`SubjectResultPage` (per-subject generation), shared by all four role
dashboards; sidebar links added for every role. Generation buttons render only
for ADMIN/DOS. Stale counts are surfaced next to every table.

## 8. Tests (`backend/tests/phase4.test.js`, 62 tests)

Validators; grade boundaries/gaps; ranking determinism & ties; band validation;
config hashing; real-MongoDB integration (subject generation, upsert-only
semantics, weight rejection, PENDING vs ZERO missing-mark policies, TERM/
CUMULATIVE/ANNUAL windows, single-term years, scope-wide stale invalidation,
recalculation clearing staleness, snapshot immutability, grading-scale saves);
HTTP permission/CSRF/validation enforcement. Full suite: **286 tests green**
(224 pre-existing + 62 Phase 4).
