'use strict';

const AssessmentMark = require('../models/AssessmentMark');
const MarkCorrection = require('../models/MarkCorrection');
const Assessment = require('../models/Assessment');
const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const User = require('../models/User');
const { validateMark, normalizeMark, policyConfig } = require('./markEngine');

const err400 = (msg) => { const e = new Error(msg); e.statusCode = 400; return e; };
const err403 = (msg) => { const e = new Error(msg); e.statusCode = 403; return e; };
const err404 = (msg) => { const e = new Error(msg); e.statusCode = 404; return e; };

const assertSchoolOwnership = (doc, schoolId) => {
  if (doc.school.toString() !== schoolId.toString()) {
    throw err403('Access denied');
  }
};

/**
 * Validate that the student is enrolled in the assessment's class for the academic year.
 * Enrollment is the authoritative placement record — not student.classId.
 */
const assertStudentEnrolled = async (studentId, school, assessment) => {
  const student = await Student.findById(studentId);
  if (!student || student.school.toString() !== school.toString()) {
    throw err400('Student not found or does not belong to this school');
  }

  const enrollment = await Enrollment.findOne({
    school,
    student: studentId,
    academicYear: assessment.academicYear,
    class: assessment.class,
    status: 'ACTIVE',
  });

  if (!enrollment) {
    throw err400('Student is not actively enrolled in the assessment class for this academic year');
  }

  return enrollment;
};

/**
 * Record or update a mark for a student on an assessment.
 * Creates MarkCorrection history if the mark already exists.
 *
 * NOTE on transactions:
 *   MongoDB transactions require a replica set. In a standalone development
 *   MongoDB instance, transactions are not available. The implementation below
 *   performs the operations sequentially in the safest order:
 *   1. Validate
 *   2. Create correction history (if updating)
 *   3. Update/create the mark
 *   4. Audit
 *   If step 3 fails after step 2, the correction record exists without a
 *   corresponding mark update. This is a known limitation of standalone MongoDB.
 *   In production with a replica set, wrap in a session transaction.
 */
const recordMark = async ({ school, assessmentId, studentId, score, entered, recordedBy, reason }) => {
  // Load and validate assessment
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment || assessment.school.toString() !== school.toString()) {
    throw err404('Assessment not found or does not belong to this school');
  }
  if (assessment.status === 'CANCELLED') {
    throw err400('Cannot record marks for a cancelled assessment');
  }

  // Validate enrollment
  await assertStudentEnrolled(studentId, school, assessment);

  // Canonical shape: real zero stays 0/entered=true; missing becomes null/entered=false
  let normalized;
  try {
    normalized = normalizeMark(score, entered === true);
  } catch (e) {
    throw err400(e.message);
  }

  // Validate score if mark is being entered
  if (normalized.entered === true) {
    const validation = validateMark(normalized.score, assessment.maxMarks);
    if (!validation.valid) throw err400(validation.message);
  }

  // Check for existing mark
  const existing = await AssessmentMark.findOne({ assessment: assessmentId, student: studentId });

  if (existing) {
    const changed = existing.score !== normalized.score || existing.entered !== normalized.entered;

    // No actual change — return current state without fabricating history
    if (!changed) return { mark: existing, corrected: false, created: false };

    // When configured, corrections require a reason
    if (policyConfig.requireCorrectionReason && !reason) {
      throw err400('A reason is required to correct an existing mark');
    }

    // Create correction history BEFORE modifying the current mark
    const correction = await MarkCorrection.create({
      school,
      assessmentMark: existing._id,
      student: studentId,
      assessment: assessmentId,
      oldScore: existing.score,
      newScore: normalized.score,
      oldEntered: existing.entered,
      newEntered: normalized.entered,
      reason: reason || null,
      correctedBy: recordedBy,
      correctedAt: new Date(),
    });

    // Update the existing mark
    existing.score = normalized.score;
    existing.entered = normalized.entered;
    existing.updatedBy = recordedBy;
    await existing.save();
    // Phase 4: a changed mark invalidates derived results for this scope.
    // Best-effort flag (never blocks the mark write); authorised generation
    // recomputes ONLY the affected scope.
    try {
      const rs = require('./resultService');
      await rs.markStaleForAssessment(assessment);
    } catch (e) { console.error('[Results] stale-flag failed:', e.message); }
    return { mark: existing, corrected: true, created: false, correction };
  }

  // Create new mark
  const mark = await AssessmentMark.create({
    school,
    assessment: assessmentId,
    student: studentId,
    score: normalized.score,
    entered: normalized.entered,
    recordedBy,
  });
  try {
    const rs2 = require('./resultService');
    await rs2.markStaleForAssessment(assessment);
  } catch (e) { console.error('[Results] stale-flag failed:', e.message); }
  return { mark, corrected: false, created: true };
};

/**
 * Bulk record marks for multiple students on one assessment.
 * Each item: { studentId, score, entered, reason }
 */
const bulkRecordMarks = async ({ school, assessmentId, marks, recordedBy }) => {
  const results = [];
  const errors = [];

  for (const item of marks) {
    try {
      const { mark, corrected } = await recordMark({
        school,
        assessmentId,
        studentId: item.studentId,
        score: item.score,
        entered: item.entered,
        recordedBy,
        reason: item.reason,
      });
      results.push({ studentId: item.studentId, mark, corrected });
    } catch (err) {
      errors.push({ studentId: item.studentId, error: err.message });
    }
  }

  return { results, errors };
};

const listMarks = async (schoolId, filters = {}) => {
  const query = { school: schoolId };
  if (filters.assessment) query.assessment = filters.assessment;
  if (filters.student) query.student = filters.student;

  const docs = await AssessmentMark.find(query).sort({ createdAt: 1 });

  const studentIds = [...new Set(docs.map(d => d.student).filter(Boolean))];
  const assessmentIds = [...new Set(docs.map(d => d.assessment).filter(Boolean))];
  const recordedByIds = [...new Set(docs.map(d => d.recordedBy).filter(Boolean))];

  const [students, assessments, recordedBys] = await Promise.all([
    studentIds.length ? Student.find({ _id: { $in: studentIds } }) : [],
    assessmentIds.length ? Assessment.find({ _id: { $in: assessmentIds } }) : [],
    recordedByIds.length ? User.find({ _id: { $in: recordedByIds } }) : [],
  ]);

  const studentMap = new Map(students.map(s => [s._id, s]));
  const assessmentMap = new Map(assessments.map(a => [a._id, a]));
  const recordedByMap = new Map(recordedBys.map(u => [u._id, u]));

  return docs.map(doc => {
    const plain = doc.toObject ? doc.toObject() : doc;
    return {
      ...plain,
      student: plain.student ? studentMap.get(plain.student) : null,
      assessment: plain.assessment ? assessmentMap.get(plain.assessment) : null,
      recordedBy: plain.recordedBy ? recordedByMap.get(plain.recordedBy) : null,
    };
  });
};

const getMark = async (id, schoolId) => {
  const doc = await AssessmentMark.findById(id);
  if (!doc) throw err404('Mark not found');
  assertSchoolOwnership(doc, schoolId);

  const plain = doc.toObject ? doc.toObject() : doc;

  const [student, assessment, recordedBy] = await Promise.all([
    plain.student ? Student.findById(plain.student) : null,
    plain.assessment ? Assessment.findById(plain.assessment) : null,
    plain.recordedBy ? User.findById(plain.recordedBy) : null,
  ]);

  return {
    ...plain,
    student: student || null,
    assessment: assessment || null,
    recordedBy: recordedBy || null,
  };
};

const getMarkHistory = async (markId, schoolId) => {
  const mark = await AssessmentMark.findById(markId);
  if (!mark) throw err404('Mark not found');
  assertSchoolOwnership(mark, schoolId);

  const corrections = await MarkCorrection.find({ assessmentMark: markId }).sort({ correctedAt: -1 });

  const correctedByIds = [...new Set(corrections.map(c => c.correctedBy).filter(Boolean))];
  const correctedBys = correctedByIds.length ? await User.find({ _id: { $in: correctedByIds } }) : [];
  const correctedByMap = new Map(correctedBys.map(u => [u._id, u]));

  return corrections.map(c => {
    const plain = c.toObject ? c.toObject() : c;
    return {
      ...plain,
      correctedBy: plain.correctedBy ? correctedByMap.get(plain.correctedBy) : null,
    };
  });
};

const getCorrectionsByAssessment = async (assessmentId, schoolId) => {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment || assessment.school.toString() !== schoolId.toString()) {
    throw err404('Assessment not found');
  }
  const corrections = await MarkCorrection.find({ assessment: assessmentId, school: schoolId }).sort({ correctedAt: -1 });

  const studentIds = [...new Set(corrections.map(c => c.student).filter(Boolean))];
  const correctedByIds = [...new Set(corrections.map(c => c.correctedBy).filter(Boolean))];

  const [students, correctedBys] = await Promise.all([
    studentIds.length ? Student.find({ _id: { $in: studentIds } }) : [],
    correctedByIds.length ? User.find({ _id: { $in: correctedByIds } }) : [],
  ]);

  const studentMap = new Map(students.map(s => [s._id, s]));
  const correctedByMap = new Map(correctedBys.map(u => [u._id, u]));

  return corrections.map(c => {
    const plain = c.toObject ? c.toObject() : c;
    return {
      ...plain,
      student: plain.student ? studentMap.get(plain.student) : null,
      correctedBy: plain.correctedBy ? correctedByMap.get(plain.correctedBy) : null,
    };
  });
};

module.exports = {
  recordMark,
  bulkRecordMarks,
  listMarks,
  getMark,
  getMarkHistory,
  getCorrectionsByAssessment,
  assertStudentEnrolled,
};
