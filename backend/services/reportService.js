'use strict';

const mongoose = require('../lib/pg-odm');
const ReportCard = require('../models/ReportCard');
const ReportVersion = require('../models/ReportVersion');
const TermResult = require('../models/TermResult');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const Term = require('../models/Term');
const Enrollment = require('../models/Enrollment');
const School = require('../models/School');
const resultService = require('./resultService');

const err400 = (msg) => { const e = new Error(msg); e.statusCode = 400; return e; };
const err404 = (msg) => { const e = new Error(msg); e.statusCode = 404; return e; };

/**
 * Valid lifecycle transitions. GENERATED → REVIEWED → APPROVED → PUBLISHED.
 * Regeneration is always allowed and produces a NEW version.
 */
const TRANSITIONS = {
  review: { from: 'GENERATED', to: 'REVIEWED' },
  approve: { from: 'REVIEWED', to: 'APPROVED' },
  publish: { from: 'APPROVED', to: 'PUBLISHED' },
};

// ─── Staleness ─────────────────────────────────────────────────────────────
/**
 * A card is stale when its source TermResult no longer exists, was itself
 * invalidated (isStale), was recalculated after the report was generated
 * (calculatedAt newer than generatedAt), or its configHash no longer
 * matches (recalculation or grading-scale change). Checked live so a stale
 * report can never slip through review/approval/publication even if the
 * flag write was missed.
 */
const computeStale = async (card) => {
  const tr = await TermResult.findById(card.sourceTermResult).lean();
  if (!tr) return true;
  if (tr.isStale) return true;
  if (card.sourceConfigHash && tr.configHash !== card.sourceConfigHash) return true;
  // Recalculation updates calculatedAt; if it happened after this report
  // version was generated the frozen payload no longer matches the source.
  if (card.generatedAt && tr.calculatedAt && new Date(tr.calculatedAt) > new Date(card.generatedAt)) return true;
  return false;
};

const syncStaleFlag = async (card) => {
  const stale = await computeStale(card);
  if (stale !== card.isStale) {
    await ReportCard.updateOne({ _id: card._id, isStale: card.isStale }, { $set: { isStale: stale } });
    card.isStale = stale;
  }
  return stale;
};

/**
 * Flag every report card whose term window includes the changed term
 * (called from resultService.markStaleForAssessment) — note this covers
 * cumulative/annual reports whose window contains the changed term, not
 * just reports of the changed term itself. Grading-scale changes use
 * markReportsStaleForYear (school+year wide). Best-effort; never throws
 * into the mark path.
 */
const markReportsStale = async ({ school, academicYear, term, class: classId }) => {
  if (mongoose.connection.readyState !== 1) return { skipped: true, cards: 0 };
  const filter = { school, academicYear, isStale: false };
  if (term) filter.termsIncluded = term;
  if (classId) filter.class = classId;
  const res = await ReportCard.updateMany(filter, { $set: { isStale: true } });
  return { cards: res.modifiedCount };
};

const markReportsStaleForYear = async (school, academicYear) => {
  if (mongoose.connection.readyState !== 1) return { skipped: true, cards: 0 };
  const res = await ReportCard.updateMany({ school, academicYear, isStale: false }, { $set: { isStale: true } });
  return { cards: res.modifiedCount };
};

// ─── Generation ────────────────────────────────────────────────────────────
/**
 * Build the frozen payload for one student from the AUTHORITATIVE TermResult.
 * Nothing is recalculated here — values, grades, rank and status are copied
 * verbatim from the persisted result; only identity/config context is added.
 */
const buildPayload = ({ termResult, student, cls, year, termDoc, termsIncluded, subjectsById, bands, school, subjectResultsByTermAndSubject }) => ({
  schoolName: school?.name || null,
  schoolCode: school?.code || null,
  schoolPhone: school?.phone || null,
  schoolAddress: school?.address || null,
  schoolEmail: school?.email || null,
  schoolLogoUrl: school?.logoUrl || null,
  reportHeader: school?.reportHeader || {},
  student: {
    admissionNumber: student.admissionNumber,
    firstName: student.firstName,
    middleName: student.middleName || null,
    lastName: student.lastName,
  },
  className: cls.name,
  classCode: cls.code || null,
  academicYearName: year.name,
  termName: termDoc.name,
  termSequence: termDoc.sequence,
  resultType: termResult.resultType,
  termsIncluded: termsIncluded.map((t) => ({ id: t._id, name: t.name, sequence: t.sequence })),
  subjects: (termResult.subjects || []).map((s) => {
    const subj = subjectsById.get(s.subject.toString());
    // Build per-term breakdown if subjectResultsByTermAndSubject provided
    const isNursery = cls.level === 'NURSERY';
    const termBreakdown = termsIncluded.map((t) => {
      const key = `${t._id}:${s.subject}`;
      const sr = subjectResultsByTermAndSubject ? subjectResultsByTermAndSubject.get(key) : null;
      if (!sr) {
        return isNursery
          ? { termId: t._id, termName: t.name, termSequence: t.sequence, rank: null, rankMax: null, total: null }
          : { termId: t._id, termName: t.name, termSequence: t.sequence, test: null, testMax: null, exam: null, examMax: null, total: null };
      }
      // sourceMarks: find TEST and EXAM type assessments by name heuristic
      const marks = sr.sourceMarks || [];
      let testMark, examMark;
      if (isNursery) {
        // Nursery: single "Rank" assessment
        const rankMark = marks.find((m) => /rank/i.test(String(m.assessmentName || ''))) || marks[0];
        return {
          termId: t._id,
          termName: t.name,
          termSequence: t.sequence,
          rank: rankMark ? rankMark.score : (marks[0] ? marks[0].score : null),
          rankMax: rankMark ? rankMark.maxMarks : (marks[0] ? marks[0].maxMarks : null),
          total: sr.total,
          percentage: sr.percentage,
          grade: sr.grade,
        };
      } else {
        // Primary: TEST + EXAM
        testMark = marks.find((m) => /test/i.test(String(m.assessmentName || '')));
        examMark = marks.find((m) => /exam/i.test(String(m.assessmentName || '')));
        // fallback: first mark = test, second = exam
        const m0 = marks[0]; const m1 = marks[1];
        return {
          termId: t._id,
          termName: t.name,
          termSequence: t.sequence,
          test: testMark ? testMark.score : (m0 ? m0.score : null),
          testMax: testMark ? testMark.maxMarks : (m0 ? m0.maxMarks : null),
          exam: examMark ? examMark.score : (m1 ? m1.score : null),
          examMax: examMark ? examMark.maxMarks : (m1 ? m1.maxMarks : null),
          total: sr.total,
          percentage: sr.percentage,
          grade: sr.grade,
        };
      }
    });
    return {
      subject: s.subject,
      subjectName: subj ? subj.name : 'Unknown subject',
      subjectCode: subj ? subj.code : null,
      value: s.value,
      grade: s.grade,
      remark: null,
      status: s.status,
      termBreakdown,
    };
  }),
  subjectsCounted: termResult.subjectsCounted,
  subjectsTotal: termResult.subjectsTotal,
  average: termResult.average,
  grade: termResult.grade,
  remark: termResult.remark,
  rank: termResult.rank,
  rankOutOf: termResult.rankOutOf,
  status: termResult.status,
  missingPolicy: termResult.missingPolicy,
  gradingBands: bands,
  sourceTermResult: termResult._id,
  configHash: termResult.configHash,
  calculationVersion: termResult.calculationVersion,
});

/**
 * generateReports — create the current version of every active student's
 * report for one class + target term window.
 *
 * Rules:
 *  - The term window (TERM/CUMULATIVE/ANNUAL) follows the same sequence
 *    rules as result generation; reports are read from the authoritative
 *    TermResult rows, never recomputed.
 *  - Students without a TermResult row are reported as failures.
 *  - A NEW ReportVersion is always created so a reviewed/approved/published
 *    snapshot is never overwritten. The card's lifecycle resets to
 *    GENERATED and points at the new version.
 */
const generateReports = async ({ school, academicYear, term, class: classId, generatedBy }) => {
  await resultService.assertScope(school, { academicYear, term, class: classId });
  const allTerms = await resultService.orderedTerms(school, academicYear);
  const { included, resultType } = resultService.termsForTarget(allTerms, term);
  const [year, cls, termDoc, schoolDoc] = await Promise.all([
    AcademicYear.findById(academicYear).lean(),
    Class.findById(classId).lean(),
    Term.findById(term).lean(),
    School.findById(school).lean(),
  ]);
  const enrollments = await Enrollment.find({ school, academicYear, class: classId, status: 'ACTIVE' }).lean();
  const studentIds = enrollments.map((e) => e.student);
  const termResults = studentIds.length ? await TermResult.find({
    school, academicYear, term, class: classId, resultType, student: { $in: studentIds },
  }).lean() : [];
  const byStudent = new Map(termResults.map((r) => [r.student.toString(), r]));
  const students = studentIds.length ? await Student.find({ _id: { $in: studentIds } }).lean() : [];
  const studentById = new Map(students.map((s) => [s._id.toString(), s]));
  const subjectIds = new Set();
  for (const r of termResults) for (const s of r.subjects || []) subjectIds.add(s.subject.toString());
  const subjects = subjectIds.size ? await Subject.find({ _id: { $in: [...subjectIds] } }).lean() : [];
  const subjectsById = new Map(subjects.map((s) => [s._id.toString(), s]));
  const bands = await resultService.activeBands(school, academicYear);

  // Fetch per-term SubjectResults for the breakdown columns
  const SubjectResult = require('../models/SubjectResult');
  const termIds = included.map((t) => t._id);
  const subjectResultDocs = studentIds.length && subjectIds.size
    ? await SubjectResult.find({ school, academicYear, term: { $in: termIds }, class: classId, student: { $in: studentIds } }).lean()
    : [];
  // key: `${termId}:${subjectId}:${studentId}`
  const subjectResultsByKey = new Map(subjectResultDocs.map((sr) => [
    `${sr.term}:${sr.subject}:${sr.student}`, sr,
  ]));

  const results = [];
  const failures = [];
  const now = new Date();
  for (const enr of enrollments) {
    const sid = enr.student.toString();
    const tr = byStudent.get(sid);
    const student = studentById.get(sid);
    if (!tr || !student) {
      failures.push({ student: sid, error: 'No authoritative term result — generate results first' });
      continue;
    }
    try {
        // Build student-specific subjectResultsByTermAndSubject map
        const srByTermSubject = new Map();
        for (const t of included) {
          for (const subjId of subjectIds) {
            const sr = subjectResultsByKey.get(`${t._id}:${subjId}:${sid}`);
            if (sr) srByTermSubject.set(`${t._id}:${subjId}`, sr);
          }
        }
        const payload = buildPayload({ termResult: tr, student, cls, year, termDoc, termsIncluded: included, subjectsById, bands, school: schoolDoc, subjectResultsByTermAndSubject: srByTermSubject });
      let card = await ReportCard.findOne({ school, academicYear, term, class: classId, student: enr.student });
      if (!card) {
        card = await ReportCard.create({
          school, academicYear, term, class: classId, student: enr.student,
          enrollment: enr._id, resultType, termsIncluded: included.map((t) => t._id),
          status: 'GENERATED', currentVersion: 1, isStale: false,
          sourceTermResult: tr._id, sourceConfigHash: tr.configHash,
          generatedBy: generatedBy || null, generatedAt: now,
        });
      } else {
        card.set({
          resultType, termsIncluded: included.map((t) => t._id),
          status: 'GENERATED', currentVersion: card.currentVersion + 1, isStale: false,
          sourceTermResult: tr._id, sourceConfigHash: tr.configHash,
          generatedBy: generatedBy || null, generatedAt: now,
          reviewedBy: null, reviewedAt: null, reviewNote: null,
          approvedBy: null, approvedAt: null, approvalNote: null,
          publishedBy: null, publishedAt: null,
        });
        await card.save();
      }
      const version = await ReportVersion.create({
        reportCard: card._id, school, academicYear, term, class: classId,
        student: enr.student, version: card.currentVersion, payload,
        status: 'GENERATED', generatedBy: generatedBy || null, generatedAt: now,
      });
      results.push({ card, version });
    } catch (err) {
      failures.push({ student: sid, error: err.message });
    }
  }
  const summary = {
    students: enrollments.length,
    succeeded: results.length,
    failed: failures.length,
    resultType,
    complete: results.filter((r) => r.version.payload.status === 'COMPLETE').length,
    incomplete: results.filter((r) => r.version.payload.status === 'INCOMPLETE').length,
  };
  return { results, failures, summary, success: failures.length === 0, resultType };
};

// ─── Reads ─────────────────────────────────────────────────────────────────
const listReports = async (school, f) => {
  const q = { school };
  if (f.academicYear) q.academicYear = f.academicYear;
  if (f.term) q.term = f.term;
  if (f.class) q.class = f.class;
  if (f.student) q.student = f.student;
  if (f.status) q.status = f.status;
  if (f.stale !== undefined) q.isStale = f.stale === true || f.stale === 'true';
  if (f.periodType) q.periodType = f.periodType;
  if (f.catAssessment) q.catAssessment = f.catAssessment;

  const docs = await ReportCard.find(q).sort({ 'student.lastName': 1, 'student.firstName': 1 });

  const studentIds = [...new Set(docs.map(d => d.student).filter(Boolean))];
  const classIds = [...new Set(docs.map(d => d.class).filter(Boolean))];
  const termIds = [...new Set(docs.map(d => d.term).filter(Boolean))];
  const yearIds = [...new Set(docs.map(d => d.academicYear).filter(Boolean))];
  const schoolIds = [...new Set(docs.map(d => d.school).filter(Boolean))];

  const [students, classes, terms, years, schools] = await Promise.all([
    studentIds.length ? Student.find({ _id: { $in: studentIds } }) : [],
    classIds.length ? Class.find({ _id: { $in: classIds } }) : [],
    termIds.length ? Term.find({ _id: { $in: termIds } }) : [],
    yearIds.length ? AcademicYear.find({ _id: { $in: yearIds } }) : [],
    schoolIds.length ? School.find({ _id: { $in: schoolIds } }) : [],
  ]);

  const studentMap = new Map(students.map(s => [s._id, s]));
  const classMap = new Map(classes.map(c => [c._id, c]));
  const termMap = new Map(terms.map(t => [t._id, t]));
  const yearMap = new Map(years.map(y => [y._id, y]));
  const schoolMap = new Map(schools.map(s => [s._id, s]));

  return docs.map(doc => {
    const plain = doc.toObject ? doc.toObject() : doc;
    return {
      ...plain,
      student: plain.student ? studentMap.get(plain.student) : null,
      class: plain.class ? classMap.get(plain.class) : null,
      term: plain.term ? termMap.get(plain.term) : null,
      academicYear: plain.academicYear ? yearMap.get(plain.academicYear) : null,
      school: plain.school ? schoolMap.get(plain.school) : null,
    };
  });
};

/** Full card + current version (what the report screen and print render). */
const getReportDetail = async (id, school) => {
  const card = await ReportCard.findById(id);
  const schoolId = card && card.school && card.school._id ? card.school._id.toString() : (card && card.school ? card.school.toString() : null);
  if (!card || schoolId !== school.toString()) throw err404('Report not found');

  const plain = card.toObject ? card.toObject() : card;

  const [student, cls, term, year, sch] = await Promise.all([
    plain.student ? Student.findById(plain.student) : null,
    plain.class ? Class.findById(plain.class) : null,
    plain.term ? Term.findById(plain.term) : null,
    plain.academicYear ? AcademicYear.findById(plain.academicYear) : null,
    plain.school ? School.findById(plain.school) : null,
  ]);

  const populatedCard = {
    ...plain,
    student: student || null,
    class: cls || null,
    term: term || null,
    academicYear: year || null,
    school: sch || null,
  };

  const version = await ReportVersion.findOne({ reportCard: card._id, version: card.currentVersion });
  if (!version) throw err404('Report version not found');
  await syncStaleFlag(card);
  return { card: populatedCard, version };
};

/** Any historical version — exactly what was approved/published then. */
const getReportVersion = async (id, versionNumber, school) => {
  const card = await ReportCard.findById(id);
  if (!card || card.school.toString() !== school.toString()) throw err404('Report not found');
  const version = await ReportVersion.findOne({ reportCard: card._id, version: Number(versionNumber) });
  if (!version) throw err404('Report version not found');
  return { card, version };
};

const listVersions = async (id, school) => {
  const card = await ReportCard.findById(id);
  if (!card || card.school.toString() !== school.toString()) throw err404('Report not found');
  const versions = await ReportVersion.find({ reportCard: card._id })
    .select('version status generatedAt generatedBy reviewedAt reviewedBy approvedAt approvedBy publishedAt publishedBy')
    .sort({ version: -1 });
  return versions;
};

// ─── Lifecycle transitions ─────────────────────────────────────────────────
/**
 * transition — validated lifecycle step on a card's CURRENT version.
 * Stale cards are rejected; the live configHash is re-verified before
 * publication so a published payload always matches the reviewed one.
 */
const transition = async ({ reportId, action, actor, school, note }) => {
  const rule = TRANSITIONS[action];
  if (!rule) throw err400(`Unknown report action: ${action}`);
  const card = await ReportCard.findById(reportId);
  if (!card || card.school.toString() !== school.toString()) throw err404('Report not found');
  if (card.status !== rule.from) {
    throw err400(`Cannot ${action} a report in state ${card.status} (expected ${rule.from})`);
  }
  const stale = await syncStaleFlag(card);
  if (stale) {
    throw err400('Report is stale — underlying results or configuration changed. Recalculate results and generate a new report version.');
  }
  const now = new Date();
  const versionUpdate = { status: rule.to };
  const cardUpdate = { status: rule.to };
  if (action === 'review') {
    versionUpdate.reviewedBy = actor; versionUpdate.reviewedAt = now; versionUpdate.reviewNote = note || null;
    cardUpdate.reviewedBy = actor; cardUpdate.reviewedAt = now; cardUpdate.reviewNote = note || null;
  } else if (action === 'approve') {
    versionUpdate.approvedBy = actor; versionUpdate.approvedAt = now; versionUpdate.approvalNote = note || null;
    cardUpdate.approvedBy = actor; cardUpdate.approvedAt = now; cardUpdate.approvalNote = note || null;
  } else if (action === 'publish') {
    // Re-verify the authoritative result still matches what this version froze
    const tr = await TermResult.findById(card.sourceTermResult).lean();
    if (!tr || tr.configHash !== card.sourceConfigHash || tr.isStale) {
      throw err400('Source results changed since generation — regenerate the report before publishing');
    }
    versionUpdate.publishedBy = actor; versionUpdate.publishedAt = now;
    cardUpdate.publishedBy = actor; cardUpdate.publishedAt = now;
  }
  const version = await ReportVersion.findOneAndUpdate(
    { reportCard: card._id, version: card.currentVersion, status: rule.from },
    { $set: versionUpdate },
    { new: true }
  );
  if (!version) throw err400('Report version no longer in expected state');
  card.set(cardUpdate);
  await card.save();
  return { card, version, republished: version.version > 1 };
};

/**
 * invalidate — explicitly flag a report as stale (e.g. an error was found
 * after publication). The card and all versions remain intact; a new
 * version must go through the full lifecycle before being published.
 */
const invalidate = async ({ reportId, school, actor = null, reason = null }) => {
  const card = await ReportCard.findById(reportId);
  if (!card || card.school.toString() !== school.toString()) throw err404('Report not found');
  // Never touches versions — the published snapshot stays exactly as recorded.
  card.isStale = true;
  card.invalidatedBy = actor;
  card.invalidatedAt = new Date();
  card.invalidationReason = reason || null;
  await card.save();
  return card;
};

module.exports.TRANSITIONS = TRANSITIONS;
module.exports.computeStale = computeStale;
module.exports.syncStaleFlag = syncStaleFlag;
module.exports.markReportsStale = markReportsStale;
module.exports.markReportsStaleForYear = markReportsStaleForYear;
module.exports.buildPayload = buildPayload;
module.exports.generateReports = generateReports;
module.exports.listReports = listReports;
module.exports.getReportDetail = getReportDetail;
module.exports.getReportVersion = getReportVersion;
module.exports.listVersions = listVersions;
module.exports.transition = transition;
module.exports.invalidate = invalidate;

/**
 * buildPeriodPayload — builds the frozen payload for a PERIOD (CAT) report.
 * Uses marks from a specific CAT assessment (or multiple CATs) for one student.
 */
const buildPeriodPayload = ({
  catAssessment, student, cls, year, termDoc, school, subjectsById, marksBySubject, bands,
}) => ({
  schoolName: school?.name || null,
  schoolCode: school?.code || null,
  schoolPhone: school?.phone || null,
  schoolAddress: school?.address || null,
  schoolEmail: school?.email || null,
  schoolLogoUrl: school?.logoUrl || null,
  reportHeader: school?.reportHeader || {},
  student: {
    admissionNumber: student.admissionNumber,
    firstName: student.firstName,
    middleName: student.middleName || null,
    lastName: student.lastName,
  },
  className: cls.name,
  classCode: cls.code || null,
  academicYearName: year.name,
  termName: termDoc.name,
  termSequence: termDoc.sequence,
  resultType: 'PERIOD',
  periodType: catAssessment.type,
  catAssessment: {
    _id: catAssessment._id,
    name: catAssessment.name,
    type: catAssessment.type,
    maxMarks: catAssessment.maxMarks,
    weight: catAssessment.weight,
  },
  termsIncluded: [{ id: catAssessment.term, name: catAssessment.name, sequence: 1 }],
  subjects: Object.entries(marksBySubject).map(([subjectId, mark]) => {
    const subj = subjectsById.get(subjectId);
    const isNursery = cls.level === 'NURSERY';
    return {
      subject: subjectId,
      subjectName: subj ? subj.name : 'Unknown subject',
      subjectCode: subj ? subj.code : null,
      value: mark.percentage,
      grade: mark.grade,
      remark: null,
      status: mark.status,
      termBreakdown: [{
        termId: catAssessment.term,
        termName: catAssessment.name,
        termSequence: 1,
        ...(isNursery
          ? { rank: mark.score, rankMax: mark.maxMarks }
          : { test: mark.score, testMax: mark.maxMarks, exam: null, examMax: null }),
        total: mark.percentage,
        percentage: mark.percentage,
        grade: mark.grade,
      }],
    };
  }),
  subjectsCounted: Object.keys(marksBySubject).length,
  subjectsTotal: Object.keys(marksBySubject).length,
  average: null,
  grade: null,
  remark: null,
  rank: null,
  rankOutOf: null,
  status: 'COMPLETE',
  missingPolicy: 'ZERO',
  gradingBands: bands,
  catAssessment: catAssessment._id,
  configHash: null,
  calculationVersion: 1,
});

/**
 * generatePeriodReports — create PERIOD reports for a specific CAT assessment.
 * Generates one report per student for the given CAT assessment.
 * Only students with entered marks for that CAT are included.
 */
const generatePeriodReports = async ({ school, academicYear, term, class: classId, catAssessment, periodType, generatedBy }) => {
  await resultService.assertScope(school, { academicYear, term, class: classId });
  const cat = await require('../models/Assessment').findById(catAssessment);
  if (!cat || cat.school.toString() !== school.toString()) throw err400('CAT assessment not found or does not belong to this school');
  if (cat.term.toString() !== term.toString()) throw err400('CAT assessment does not belong to the selected term');
  if (cat.class.toString() !== classId.toString()) throw err400('CAT assessment does not belong to the selected class');
  if (!['CAT', 'MID_TERM', 'QUIZ', 'TEST'].includes(cat.type)) throw err400('Assessment must be a period type (CAT, MID_TERM, QUIZ, TEST)');

  const [year, cls, termDoc, schoolDoc] = await Promise.all([
    AcademicYear.findById(academicYear).lean(),
    Class.findById(classId).lean(),
    Term.findById(term).lean(),
    School.findById(school).lean(),
  ]);

  const enrollments = await Enrollment.find({ school, academicYear, class: classId, status: 'ACTIVE' }).lean();
  const studentIds = enrollments.map((e) => e.student);
  const students = studentIds.length ? await Student.find({ _id: { $in: studentIds } }).lean() : [];
  const studentById = new Map(students.map((s) => [s._id.toString(), s]));

  // Get marks for this CAT assessment
  const marks = await require('../models/AssessmentMark').find({
    school, assessment: cat._id, entered: true,
  }).lean();

  const marksByStudent = new Map();
  for (const m of marks) {
    if (!marksByStudent.has(m.student.toString())) marksByStudent.set(m.student.toString(), []);
    marksByStudent.get(m.student.toString()).push(m);
  }

  const subjects = await Subject.find({ school, status: 'ACTIVE' }).lean();
  const subjectsById = new Map(subjects.map((s) => [s._id.toString(), s]));
  const bands = await resultService.activeBands(school, academicYear);

  const results = [];
  const failures = [];
  const now = new Date();

  for (const enr of enrollments) {
    const sid = enr.student.toString();
    const student = studentById.get(sid);
    if (!student) {
      failures.push({ student: sid, error: 'Student not found' });
      continue;
    }

    const studentMarks = marksByStudent.get(sid) || [];
    if (studentMarks.length === 0) {
      failures.push({ student: sid, error: 'No marks entered for this CAT assessment' });
      continue;
    }

    // Group marks by subject
    const marksBySubject = {};
    for (const m of studentMarks) {
      const subjId = m.subject.toString();
      if (!marksBySubject[subjId]) marksBySubject[subjId] = [];
      marksBySubject[subjId].push(m);
    }

    // Process each subject - for CAT, typically one mark per subject
    const processedMarksBySubject = {};
    for (const [subjId, marksArr] of Object.entries(marksBySubject)) {
      // Use the first mark (CAT typically has one mark per subject)
      const m = marksArr[0];
      const subj = subjectsById.get(subjId);
      if (!subj) continue;
      const percentage = (m.score / m.maxMarks) * 100;
      const grade = percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F';
      processedMarksBySubject[subjId] = {
        score: m.score,
        maxMarks: m.maxMarks,
        percentage,
        grade,
        status: 'COMPLETE',
      };
    }

    if (Object.keys(processedMarksBySubject).length === 0) {
      failures.push({ student: sid, error: 'No valid subject marks for this CAT' });
      continue;
    }

    try {
      const payload = buildPeriodPayload({
        catAssessment: cat,
        student,
        cls,
        year,
        termDoc: await Term.findById(term).lean(),
        school: await School.findById(school).lean(),
        subjectsById,
        marksBySubject: processedMarksBySubject,
        bands,
      });

      let card = await ReportCard.findOne({
        school, academicYear, term, class: classId, student: enr.student,
        periodType: 'CAT', catAssessment: cat._id,
      });

      if (!card) {
        card = await ReportCard.create({
          school, academicYear, term, class: classId, student: enr.student,
          enrollment: enr._id, resultType: 'PERIOD', periodType: 'CAT',
          catAssessment: cat._id, termsIncluded: [cat.term],
          status: 'GENERATED', currentVersion: 1, isStale: false,
          sourceTermResult: null, sourceConfigHash: null,
          generatedBy: generatedBy || null, generatedAt: new Date(),
        });
      } else {
        card.set({
          status: 'GENERATED', currentVersion: card.currentVersion + 1, isStale: false,
          generatedBy: generatedBy || null, generatedAt: new Date(),
          reviewedBy: null, reviewedAt: null, reviewNote: null,
          approvedBy: null, approvedAt: null, approvalNote: null,
          publishedBy: null, publishedAt: null,
        });
        await card.save();
      }

      const version = await ReportVersion.create({
        reportCard: card._id, school, academicYear, term, class: classId,
        student: enr.student, version: card.currentVersion, payload,
        status: 'GENERATED', generatedBy: generatedBy || null, generatedAt: new Date(),
      });

      results.push({ card, version });
    } catch (err) {
      failures.push({ student: sid, error: err.message });
    }
  }

  const summary = {
    students: enrollments.length,
    succeeded: results.length,
    failed: failures.length,
    resultType: 'PERIOD',
    periodType: 'CAT',
    complete: results.length,
    incomplete: 0,
  };

  return { results, failures, summary, success: failures.length === 0, resultType: 'PERIOD', periodType: 'CAT' };
};

module.exports.generatePeriodReports = generatePeriodReports;




