'use strict';

const mongoose = require('../lib/pg-odm');
const Assessment = require('../models/Assessment');
const AssessmentMark = require('../models/AssessmentMark');
const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const Term = require('../models/Term');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const SubjectResult = require('../models/SubjectResult');
const TermResult = require('../models/TermResult');
const ResultSnapshot = require('../models/ResultSnapshot');
const GradingScale = require('../models/GradingScale');
const TeacherAssignment = require('../models/TeacherAssignment');
const engine = require('./markEngine');

const err400 = (msg) => { const e = new Error(msg); e.statusCode = 400; return e; };

const DEFAULT_BANDS = [
  { grade: 'A', minPercentage: 80, maxPercentage: 100, remark: 'Excellent' },
  { grade: 'B', minPercentage: 70, maxPercentage: 80, remark: 'Very Good' },
  { grade: 'C', minPercentage: 60, maxPercentage: 70, remark: 'Good' },
  { grade: 'D', minPercentage: 50, maxPercentage: 60, remark: 'Pass' },
  { grade: 'F', minPercentage: 0, maxPercentage: 50, remark: 'Fail' },
];

// ─── Scope validation ───────────────────────────────────────────────────────

const assertScope = async (school, { academicYear: yearId, term: termId, class: classId, subject: subjectId }) => {
  const [year, term, cls, subject] = await Promise.all([
    AcademicYear.findById(yearId),
    Term.findById(termId),
    Class.findById(classId),
    subjectId ? Subject.findById(subjectId) : Promise.resolve(null),
  ]);
  if (!year || year.school.toString() !== school.toString()) throw err400('Academic year not found or does not belong to this school');
  if (!term || term.school.toString() !== school.toString()) throw err400('Term not found or does not belong to this school');
  if (term.academicYear.toString() !== yearId.toString()) throw err400('Term does not belong to the selected academic year');
  if (!cls || cls.school.toString() !== school.toString()) throw err400('Class not found or does not belong to this school');
  if (cls.academicYear.toString() !== yearId.toString()) throw err400('Class does not belong to the selected academic year');
  if (subjectId && (!subject || subject.school.toString() !== school.toString())) throw err400('Subject not found or does not belong to this school');
  return { year, term, cls, subject };
};

/** Ordered terms for the year (sequence asc). Determines cumulative windows. */
const orderedTerms = async (school, yearId) => Term.find({ school, academicYear: yearId }).sort({ sequence: 1 }).lean();

/**
 * Terms included for a target term:
 *   first term (sequence 1) → [term]            (TERM result)
 *   middle term             → terms 1..N        (CUMULATIVE)
 *   last configured term    → every term        (ANNUAL)
 * A single-term year yields a TERM result.
 */
const termsForTarget = (allTerms, targetId) => {
  const idx = allTerms.findIndex((t) => t._id.toString() === targetId.toString());
  if (idx === -1) throw err400('Term not found in academic year');
  const included = allTerms.slice(0, idx + 1);
  const resultType = allTerms.length === 1 || idx === 0 ? 'TERM' : (idx === allTerms.length - 1 ? 'ANNUAL' : 'CUMULATIVE');
  return { included, resultType };
};

const activeBands = async (school, yearId) => {
  const scale = await GradingScale.findOne({ school, academicYear: yearId, status: 'ACTIVE' }).lean();
  return scale ? scale.bands : DEFAULT_BANDS;
};

// ─── Pure subject computation ───────────────────────────────────────────────
// assessments: docs with _id/maxMarks/weight (CANCELLED excluded by caller)
// marksByAssessment: Map assessmentId -> { score, entered }

const computeSubject = (assessments, marksByAssessment, missingPolicy) => {
  const items = assessments.map((a) => ({
    assessment: { _id: a._id, maxMarks: a.maxMarks, weight: a.weight },
    mark: marksByAssessment.get(a._id.toString()) || { score: null, entered: false },
  }));
  const { total, isPending, assessmentResults } = engine.calculateSubjectTotal(items, missingPolicy);

  // The engine returns a weighted sum on whatever scale the configured weights
  // add up to. Grade bands are percentages (0-100), so normalize to 100 when
  // the weights do not already sum to 100. With a correct 100% config this is
  // a no-op; with a partial config (e.g. 10% + 10%) it prevents a 20-point
  // total from being graded as if it were 20%.
  const weightSum = assessments.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);
  const normalizedTotal = weightSum > 0 && Math.abs(weightSum - 100) > 1e-9
    ? (total / weightSum) * 100
    : total;

  return {
    total: isPending && missingPolicy === 'PENDING' ? null : normalizedTotal,
    isPending,
    entries: assessmentResults,
    missingCount: assessmentResults.filter((r) => r.missing).length,
    recordedCount: assessmentResults.filter((r) => !r.missing).length,
    weightSum,
  };
};

// ─── Subject results ──────────────────────────────────────────────────────
// Upserts current SubjectResult docs; writes an immutable ResultSnapshot.
// Per-student failures collected; success=false unless every student persisted.
const generateSubjectResults = async ({ school, academicYear, term, class: classId, subject: subjectId, missingPolicy, calculatedBy }) => {
  const policy = missingPolicy || engine.policyConfig.defaultMissingPolicy;
  if (!engine.MISSING_MARK_POLICIES.includes(policy)) throw err400('Invalid missing-mark policy');
  await assertScope(school, { academicYear, term, class: classId, subject: subjectId });
  const assessments = await Assessment.find({ school, academicYear, term, class: classId, subject: subjectId, status: { $ne: 'CANCELLED' } }).lean();
  const weightCheck = engine.validateAssessmentWeights(assessments.map((a) => ({ weight: a.weight })));
  if (!weightCheck.valid) throw err400(weightCheck.message);
  const enrollments = await Enrollment.find({ school, academicYear, class: classId, status: 'ACTIVE' }).lean();
  const bands = await activeBands(school, academicYear);
  const configHash = engine.hashResultConfig({ v: engine.CALCULATION_VERSION, policy, bands, assessments: assessments.map((a) => ({ id: a._id.toString(), max: a.maxMarks, weight: a.weight })) });
  const marks = assessments.length ? await AssessmentMark.find({ school, assessment: { $in: assessments.map((a) => a._id) } }).lean() : [];
  const marksByStudent = new Map();
  for (const m of marks) {
    const key = m.student.toString();
    if (!marksByStudent.has(key)) marksByStudent.set(key, new Map());
    marksByStudent.get(key).set(m.assessment.toString(), { score: m.score, entered: m.entered });
  }
  const results = [];
  const failures = [];
  for (const enr of enrollments) {
    try {
      const computed = computeSubject(assessments, marksByStudent.get(enr.student.toString()) || new Map(), policy);
      const grade = computed.total === null ? { grade: null, remark: null } : engine.resolveGrade(computed.total, bands);
      const doc = await SubjectResult.findOneAndUpdate(
        { school, academicYear, term, class: classId, subject: subjectId, student: enr.student },
        { school, academicYear, term, class: classId, subject: subjectId, student: enr.student,
          enrollment: enr._id, termsIncluded: [term],
          total: computed.total, percentage: computed.total,
          grade: grade.grade, remark: grade.remark,
          status: computed.isPending || assessments.length === 0 ? 'INCOMPLETE' : 'COMPLETE',
          isStale: false,
          missingCount: computed.missingCount, recordedCount: computed.recordedCount,
          assessmentsCount: assessments.length, missingPolicy: policy,
          sourceMarks: computed.entries.map((e) => ({ assessment: e.assessmentId, maxMarks: e.maxMarks, weight: e.weight, score: e.score, entered: !e.missing, percentage: e.percentage, contribution: e.contribution, missing: e.missing, pending: e.pending || false })),
          calculationVersion: engine.CALCULATION_VERSION, configHash,
          calculatedAt: new Date(), calculatedBy: calculatedBy || null },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(doc);
    } catch (err) { failures.push({ student: enr.student.toString(), error: err.message }); }
  }
  const summary = { students: enrollments.length, succeeded: results.length, failed: failures.length,
    complete: results.filter((r) => r.status === 'COMPLETE').length,
    incomplete: results.filter((r) => r.status === 'INCOMPLETE').length };
  await ResultSnapshot.create({ school, academicYear, term, class: classId, subject: subjectId,
    resultType: 'SUBJECT', reason: 'GENERATION',
    payload: { missingPolicy: policy, assessmentsCount: assessments.length,
      rows: results.map((r) => ({ student: r.student, total: r.total, grade: r.grade, status: r.status })), failures, bands },
    summary: { students: summary.students, complete: summary.complete, incomplete: summary.incomplete, ranked: 0, failed: summary.failed },
    configHash, calculationVersion: engine.CALCULATION_VERSION,
    snapshotAt: new Date(), snapshotBy: calculatedBy || null });
  return { results, failures, summary, success: failures.length === 0, configHash, resultType: 'SUBJECT' };
};

// Live per-subject value for cumulative windows. Prefers persisted per-term
// SubjectResult (unrounded total); falls back to live computation from real
// MongoDB assessments/marks — never hardcoded values.
const subjectValueForStudent = async (school, academicYear, classId, subjectId, termsIncluded, studentId, policy) => {
  const persisted = await SubjectResult.find({ school, academicYear, class: classId, subject: subjectId, student: studentId, term: { $in: termsIncluded.map((t) => t._id) } }).lean();
  const byTerm = new Map(persisted.map((r) => [r.term.toString(), r]));
  const values = [];
  for (const t of termsIncluded) {
    const row = byTerm.get(t._id.toString());
    if (row) {
      if (row.status === 'INCOMPLETE' || row.total === null) {
        if (policy === 'PENDING') return { value: null, status: 'INCOMPLETE' };
        continue;
      }
      values.push(row.total);
      continue;
    }
    const assessments = await Assessment.find({ school, academicYear, term: t._id, class: classId, subject: subjectId, status: { $ne: 'CANCELLED' } }).lean();
    if (assessments.length === 0) continue;
    const marks = await AssessmentMark.find({ school, assessment: { $in: assessments.map((a) => a._id) }, student: studentId }).lean();
    const byA = new Map(marks.map((m) => [m.assessment.toString(), { score: m.score, entered: m.entered }]));
    const computed = computeSubject(assessments, byA, policy);
    if (computed.total === null) {
      if (policy === 'PENDING') return { value: null, status: 'INCOMPLETE' };
      continue;
    }
    values.push(computed.total);
  }
  if (values.length === 0) return { value: null, status: 'INCOMPLETE' };
  const value = values.reduce((s, v) => s + v, 0) / values.length;
  return { value, status: 'COMPLETE' };
};

/**
 * Subjects a class actually takes inside a result window.
 *
 * A school can define many subjects, but a class only offers a subset. Using
 * every active subject would mark students INCOMPLETE for subjects that were
 * never taught to them. The source of truth is, in order:
 *   1. subjects that have assessments for this class/year/term(s)
 *   2. subjects with an active teacher assignment for this class/year/term(s)
 *   3. all active subjects (last-resort fallback for unconfigured schools)
 */
const subjectsForScope = async (school, academicYear, classId, termsIncluded) => {
  const termIds = termsIncluded.map((t) => t._id);
  const assessments = await Assessment.find({
    school, academicYear, class: classId, term: { $in: termIds }, status: { $ne: 'CANCELLED' },
  }).select('subject').lean();
  let subjectIds = [...new Set(assessments.map((a) => (a.subject ? a.subject.toString() : null)).filter(Boolean))];

  if (subjectIds.length === 0) {
    const assignments = await TeacherAssignment.find({
      school, academicYear, class: classId, term: { $in: termIds }, status: 'ACTIVE',
    }).select('subject').lean();
    subjectIds = [...new Set(assignments.map((a) => (a.subject ? a.subject.toString() : null)).filter(Boolean))];
  }

  if (subjectIds.length === 0) {
    return Subject.find({ school, status: 'ACTIVE' }).sort({ name: 1 }).lean();
  }
  return Subject.find({ _id: { $in: subjectIds } }).sort({ name: 1 }).lean();
};

// Mandatory: term1 -> TERM; middle -> CUMULATIVE(1..N); last -> ANNUAL(all).
// Ranking on UNROUNDED averages; only COMPLETE eligible; ties share rank.
const generateTermResults = async ({ school, academicYear, term, class: classId, missingPolicy, calculatedBy }) => {
  const policy = missingPolicy || engine.policyConfig.defaultMissingPolicy;
  if (!engine.MISSING_MARK_POLICIES.includes(policy)) throw err400('Invalid missing-mark policy');
  await assertScope(school, { academicYear, term, class: classId });
  const allTerms = await orderedTerms(school, academicYear);
  const wt = termsForTarget(allTerms, term);
  const termsIncluded = wt.included; const resultType = wt.resultType;
  const subjects = await subjectsForScope(school, academicYear, classId, termsIncluded);
  const rawEnrollments = await Enrollment.find({ school, academicYear, class: classId, status: 'ACTIVE' }).lean();
  // Guard against dangling enrollments left behind when a student record was
  // deleted: a result for a student that no longer exists cannot be shown and
  // must not occupy a rank slot.
  const enrollmentStudentIds = [...new Set(rawEnrollments.map((e) => (e.student ? e.student.toString() : null)).filter(Boolean))];
  const existingStudents = enrollmentStudentIds.length
    ? await Student.find({ _id: { $in: enrollmentStudentIds } }).select('_id').lean()
    : [];
  const existingStudentIds = new Set(existingStudents.map((s) => s._id.toString()));
  const enrollments = rawEnrollments.filter((e) => e.student && existingStudentIds.has(e.student.toString()));
  const bands = await activeBands(school, academicYear);
  const configHash = engine.hashResultConfig({ v: engine.CALCULATION_VERSION, policy, bands, resultType, terms: termsIncluded.map((t) => t._id.toString()) });
  const computed = []; const failures = [];
  for (const enr of enrollments) {
    try {
      const entries = [];
      for (const subj of subjects) {
        const sv = await subjectValueForStudent(school, academicYear, classId, subj._id, termsIncluded, enr.student, policy);
        const g = sv.value === null ? { grade: null, remark: null } : engine.resolveGrade(sv.value, bands);
        entries.push({ subject: subj._id, subjectResult: null, value: sv.value, grade: g.grade, status: sv.status });
      }
      const agg = engine.aggregateSubjectValues(entries.map((e) => e.value), policy);
      const overall = agg.average === null ? { grade: null, remark: null } : engine.resolveGrade(agg.average, bands);
      computed.push({ student: enr.student, enrollment: enr._id, entries, average: agg.average, grade: overall.grade, remark: overall.remark, status: agg.status, counted: agg.counted, total: entries.length });
    } catch (err) { failures.push({ student: enr.student.toString(), error: err.message }); }
  }
  const rankRows = computed.map((c) => ({ student: c.student, average: c.average, eligible: c.status === 'COMPLETE' && c.average !== null }));
  const ranks = engine.assignRanks(rankRows, engine.DEFAULT_RANK_TIE_POLICY);
  const rankedCount = rankRows.filter((r) => r.eligible).length;
  const results = [];
  for (const c of computed) {
    try {
      const rank = ranks.get(c.student.toString()) || null;
      const doc = await TermResult.findOneAndUpdate(
        { school, academicYear, term, class: classId, student: c.student, resultType },
        { school, academicYear, term, class: classId, student: c.student,
          enrollment: c.enrollment, resultType, termsIncluded: termsIncluded.map((t) => t._id),
          average: c.average, grade: c.grade, remark: c.remark, status: c.status, isStale: false,
          subjects: c.entries.map((e) => ({ subject: e.subject, subjectResult: e.subjectResult, value: e.value, grade: e.grade, status: e.status })),
          subjectsCounted: c.counted, subjectsTotal: c.total, missingPolicy: policy,
          rank, rankOutOf: rank === null ? null : rankedCount, eligibleForRanking: rank !== null,
          calculationVersion: engine.CALCULATION_VERSION, configHash,
          calculatedAt: new Date(), calculatedBy: calculatedBy || null },
        { upsert: true, new: true, setDefaultsOnInsert: true });
      results.push(doc);
    } catch (err) { failures.push({ student: c.student.toString(), error: err.message }); }
  }
  const avgs = results.map((r) => r.average).filter((a) => typeof a === 'number');
  const summary = { students: enrollments.length, succeeded: results.length, failed: failures.length,
    complete: results.filter((r) => r.status === 'COMPLETE').length,
    incomplete: results.filter((r) => r.status === 'INCOMPLETE').length,
    ranked: rankedCount, resultType,
    classAverage: avgs.length ? engine.roundForDisplay(avgs.reduce((s, a) => s + a, 0) / avgs.length) : null };
  await ResultSnapshot.create({ school, academicYear, term, class: classId, subject: null, resultType, reason: 'GENERATION',
    payload: { missingPolicy: policy, termsIncluded: termsIncluded.map((t) => ({ id: t._id, name: t.name, sequence: t.sequence })),
      rows: results.map((r) => ({ student: r.student, average: r.average, grade: r.grade, status: r.status, rank: r.rank })), failures, bands },
    summary: { students: summary.students, complete: summary.complete, incomplete: summary.incomplete, ranked: rankedCount, failed: summary.failed },
    configHash, calculationVersion: engine.CALCULATION_VERSION, snapshotAt: new Date(), snapshotBy: calculatedBy || null });
  return { results, failures, summary, success: failures.length === 0, configHash, resultType };
};

// ─── Reads ────────────────────────────────────────────────────────────────
const listSubjectResults = async (school, f) => {
  const q = { school };
  if (f.academicYear) q.academicYear = f.academicYear;
  if (f.term) q.term = f.term;
  if (f.class) q.class = f.class;
  if (f.subject) q.subject = f.subject;
  if (f.status) q.status = f.status;
  if (f.stale !== undefined) q.isStale = f.stale === true || f.stale === 'true';

  const docs = await SubjectResult.find(q).sort({ createdAt: 1 });
  const studentIds = [...new Set(docs.map(d => d.student).filter(Boolean))];
  const subjectIds = [...new Set(docs.map(d => d.subject).filter(Boolean))];
  const classIds = [...new Set(docs.map(d => d.class).filter(Boolean))];
  const termIds = [...new Set(docs.map(d => d.term).filter(Boolean))];

  const [students, subjects, classes, terms] = await Promise.all([
    studentIds.length ? Student.find({ _id: { $in: studentIds } }) : [],
    subjectIds.length ? Subject.find({ _id: { $in: subjectIds } }) : [],
    classIds.length ? Class.find({ _id: { $in: classIds } }) : [],
    termIds.length ? Term.find({ _id: { $in: termIds } }) : [],
  ]);

  const studentMap = new Map(students.map(s => [s._id, s]));
  const subjectMap = new Map(subjects.map(s => [s._id, s]));
  const classMap = new Map(classes.map(c => [c._id, c]));
  const termMap = new Map(terms.map(t => [t._id, t]));

  return docs.map(doc => {
    const plain = doc.toObject ? doc.toObject() : doc;
    return {
      ...plain,
      student: plain.student ? studentMap.get(plain.student) : null,
      subject: plain.subject ? subjectMap.get(plain.subject) : null,
      class: plain.class ? classMap.get(plain.class) : null,
      term: plain.term ? termMap.get(plain.term) : null,
    };
  }).filter((r) => r.student && r.subject && r.class && r.term);
};

const listTermResults = async (school, f) => {
  const q = { school };
  if (f.academicYear) q.academicYear = f.academicYear;
  if (f.term) q.term = f.term;
  if (f.class) q.class = f.class;
  if (f.resultType) q.resultType = f.resultType;
  if (f.status) q.status = f.status;
  if (f.stale !== undefined) q.isStale = f.stale === true || f.stale === 'true';

  const docs = await TermResult.find(q).sort({ rank: 1 });
  const studentIds = [...new Set(docs.map(d => d.student).filter(Boolean))];
  const classIds = [...new Set(docs.map(d => d.class).filter(Boolean))];
  const termIds = [...new Set(docs.map(d => d.term).filter(Boolean))];
  const subjectIds = [...new Set(docs.flatMap(d => (d.subjects || []).map(s => s.subject)).filter(Boolean))];

  const [students, classes, terms, subjects] = await Promise.all([
    studentIds.length ? Student.find({ _id: { $in: studentIds } }) : [],
    classIds.length ? Class.find({ _id: { $in: classIds } }) : [],
    termIds.length ? Term.find({ _id: { $in: termIds } }) : [],
    subjectIds.length ? Subject.find({ _id: { $in: subjectIds } }) : [],
  ]);

  const studentMap = new Map(students.map(s => [s._id, s]));
  const classMap = new Map(classes.map(c => [c._id, c]));
  const termMap = new Map(terms.map(t => [t._id, t]));
  const subjectMap = new Map(subjects.map(s => [s._id, s]));

  return docs.map(doc => {
    const plain = doc.toObject ? doc.toObject() : doc;
    return {
      ...plain,
      student: plain.student ? studentMap.get(plain.student) : null,
      class: plain.class ? classMap.get(plain.class) : null,
      term: plain.term ? termMap.get(plain.term) : null,
      subjects: (plain.subjects || []).map(s => ({
        ...s,
        subject: s.subject ? subjectMap.get(s.subject) : null,
      })),
    };
  }).filter((r) => r.student && r.class && r.term);
};
const resultStatus = async (school, f) => {
  const base = { school };
  if (f.academicYear) base.academicYear = f.academicYear;
  if (f.term) base.term = f.term;
  if (f.class) base.class = f.class;
  const sg = await SubjectResult.aggregate([{ $match: base }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const tg = await TermResult.aggregate([{ $match: base }, { $group: { _id: { status: '$status', resultType: '$resultType' }, count: { $sum: 1 } } }]);
  const staleSubjects = await SubjectResult.countDocuments({ ...base, isStale: true });
  const staleTerms = await TermResult.countDocuments({ ...base, isStale: true });
  return { subjects: sg, terms: tg, stale: { subjects: staleSubjects, terms: staleTerms } };
};
const snapshotHistory = async (school, f) => {
  const q = { school };
  if (f.academicYear) q.academicYear = f.academicYear;
  if (f.term) q.term = f.term;
  if (f.class) q.class = f.class;
  if (f.subject) q.subject = f.subject;
  if (f.resultType) q.resultType = f.resultType;
  const limit = Math.min(Number(f.limit) || 20, 100);
  return ResultSnapshot.find(q).sort({ snapshotAt: -1 }).limit(limit);
};

// ─── Invalidation ─────────────────────────────────────────────────────────
// Standalone MongoDB: no multi-doc transactions; generation reports
// per-student failures explicitly instead of claiming atomicity.
const markStaleForAssessment = async (assessment) => {
  // Best-effort: skip when no live connection (e.g. mocked-model unit tests)
  // instead of blocking on mongoose buffering.
  if (mongoose.connection.readyState !== 1) return { skipped: true, subjectResults: 0, termResults: 0 };

  const s = await SubjectResult.updateMany({ school: assessment.school, academicYear: assessment.academicYear, term: assessment.term, class: assessment.class, subject: assessment.subject }, { $set: { isStale: true } });
  // Term results OF the changed term, plus any later cumulative/annual
  // results whose window includes the changed term (termsIncluded).
  const t = await TermResult.updateMany({ school: assessment.school, academicYear: assessment.academicYear, term: assessment.term, class: assessment.class }, { $set: { isStale: true } });
  const t2 = await TermResult.updateMany({ school: assessment.school, academicYear: assessment.academicYear, class: assessment.class, term: { $ne: assessment.term }, termsIncluded: assessment.term }, { $set: { isStale: true } });
  // Flag report cards whose window includes the changed term (lazy require
  // avoids a circular dependency with reportService).
  let reportCards = 0;
  try {
    const reportService = require('./reportService');
    const r = await reportService.markReportsStale({ school: assessment.school, academicYear: assessment.academicYear, term: assessment.term, class: assessment.class });
    reportCards = r.cards || 0;
  } catch (err) { /* never block a mark write on report invalidation */ }
  return { subjectResults: s.modifiedCount, termResults: t.modifiedCount + t2.modifiedCount, reportCards };
};
const recalculateScope = async ({ school, academicYear, term, class: classId, subject, calculatedBy }) => {
  if (subject) return generateSubjectResults({ school, academicYear, term, class: classId, subject, calculatedBy });
  return generateTermResults({ school, academicYear, term, class: classId, calculatedBy });
};
// ─── Grading scales ───────────────────────────────────────────────────────
const getGradingScale = async (school, yearId) => GradingScale.findOne({ school, academicYear: yearId, status: 'ACTIVE' });
const listGradingScales = async (school, yearId) => {
  const q = { school };
  if (yearId) q.academicYear = yearId;
  return GradingScale.find(q).sort({ createdAt: -1 });
};
const saveGradingScale = async ({ school, academicYear, name, bands, createdBy }) => {
  const year = await AcademicYear.findById(academicYear);
  if (!year || year.school.toString() !== school.toString()) throw err400('Academic year not found or does not belong to this school');
  const checked = engine.validateGradeBands(bands);
  if (!checked.valid) throw err400(checked.message);
  const existing = await GradingScale.findOne({ school, academicYear, name: name || 'Default' });
  if (existing) {
    existing.bands = checked.bands; existing.status = 'ACTIVE'; existing.updatedBy = createdBy;
    await existing.save();
  } else {
    await GradingScale.create({ school, academicYear, name: name || 'Default', bands: checked.bands, status: 'ACTIVE', createdBy });
  }
  const kept = await GradingScale.findOne({ school, academicYear, name: name || 'Default' });
  await GradingScale.updateMany({ school, academicYear, _id: { $ne: kept._id }, status: 'ACTIVE' }, { $set: { status: 'INACTIVE', updatedBy: createdBy } });
  await SubjectResult.updateMany({ school, academicYear }, { $set: { isStale: true } });
  await TermResult.updateMany({ school, academicYear }, { $set: { isStale: true } });
  // Report cards for the year are frozen against the old bands — flag them
  // stale too (lazy require avoids a circular dependency).
  try {
    const reportService = require('./reportService');
    await reportService.markReportsStaleForYear(school, academicYear);
  } catch (err) { /* best-effort */ }
  return kept;
};

module.exports = {
  markStaleForAssessment,
  recalculateScope,
  getGradingScale,
  listGradingScales,
  saveGradingScale,
  listSubjectResults,
  listTermResults,
  resultStatus,
  snapshotHistory,
  generateTermResults,
  subjectValueForStudent,
  generateSubjectResults,
  DEFAULT_BANDS,
  assertScope,
  orderedTerms,
  termsForTarget,
  computeSubject,
  activeBands,
};
