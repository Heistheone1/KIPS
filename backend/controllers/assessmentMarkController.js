'use strict';

const assessmentMarkService = require('../services/assessmentMarkService');
const assessmentService = require('../services/assessmentService');
const auditService = require('../services/auditService');

const isStaff = (role) => role === 'TEACHER' || role === 'CLASS_TEACHER';

const scopeOf = (doc) => {
  if (!doc) return { academicYear: null, term: null, class: null, subject: null };
  return {
    academicYear: doc.academicYear?._id || doc.academicYear,
    term: doc.term?._id || doc.term,
    class: doc.class?._id || doc.class,
    subject: doc.subject?._id || doc.subject,
  };
};

/**
 * Object-level authorization for mark operations.
 * TEACHER / CLASS_TEACHER must hold an active TeacherAssignment matching the
 * assessment's exact academicYear+term+class+subject tuple.
 * Management actions (recording marks) always require a teaching assignment.
 */
const assertTeacherMarkScope = async (user, assessment, school) => {
  if (isStaff(user.role)) {
    await assessmentService.assertTeacherAssignmentScope(user._id, school, scopeOf(assessment));
  }
};

const recordMark = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const { assessmentId, studentId, score, entered, reason } = req.body;

    // Load assessment to check scope
    const assessment = await assessmentService.getById(assessmentId, school);
    await assertTeacherMarkScope(req.user, assessment, school);

    const { mark, corrected, created, correction } = await assessmentMarkService.recordMark({
      school, assessmentId, studentId,
      score,
      entered: entered === true,
      recordedBy: req.user._id,
      reason,
    });

    if (created) {
      await auditService.log({
        actor: req.user, action: 'MARK_CREATED',
        entityType: 'AssessmentMark', entityId: mark._id,
        metadata: { assessmentId, studentId, score: mark.score, entered: mark.entered }, req,
      });
    } else if (corrected) {
      const metadata = {
        assessmentId, studentId,
        oldScore: correction.oldScore, newScore: correction.newScore,
        oldEntered: correction.oldEntered, newEntered: correction.newEntered,
        reason: correction.reason,
      };
      // MARK_UPDATED records the current-state change; MARK_CORRECTED records
      // the immutable history entry that was written for it.
      await auditService.log({ actor: req.user, action: 'MARK_UPDATED', entityType: 'AssessmentMark', entityId: mark._id, metadata, req });
      await auditService.log({ actor: req.user, action: 'MARK_CORRECTED', entityType: 'MarkCorrection', entityId: correction._id, metadata, req });
    }

    res.status(201).json({ mark, corrected, created });
  } catch (err) { next(err); }
};

const bulkRecordMarks = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const { assessmentId, marks } = req.body;

    const assessment = await assessmentService.getById(assessmentId, school);
    await assertTeacherMarkScope(req.user, assessment, school);

    const result = await assessmentMarkService.bulkRecordMarks({
      school, assessmentId, marks, recordedBy: req.user._id,
    });

    await auditService.log({
      actor: req.user,
      action: result.results.some((r) => r.corrected) ? 'MARK_CORRECTED' : 'MARK_CREATED',
      entityType: 'Assessment', entityId: assessmentId,
      metadata: { count: marks.length, successCount: result.results.length, errorCount: result.errors.length }, req,
    });

    res.json(result);
  } catch (err) { next(err); }
};

/**
 * List marks. Teachers are restricted to assessments inside their exact
 * assignment scope (or class-teacher class for read access).
 * Without an `assessment` filter, teachers only see marks from their own scope.
 */
const listMarks = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const { assessment: assessmentId, student } = req.query;

    if (isStaff(req.user.role)) {
      const scope = await assessmentService.getTeacherScope(req.user._id, school);
      if (assessmentId) {
        const assessment = await assessmentService.getById(assessmentId, school);
        if (!assessmentService.matchesReadScope(scope, scopeOf(assessment))) {
          return res.status(403).json({ message: 'Access denied' });
        }
        const marks = await assessmentMarkService.listMarks(school, { assessment: assessmentId, student });
        return res.json({ marks });
      }

      // No specific assessment: restrict to marks from assessments in scope
      const assessments = await assessmentService.list(school, {});
      const allowedIds = assessments
        .filter((a) => assessmentService.matchesReadScope(scope, scopeOf(a)))
        .map((a) => a._id);
      const marks = await assessmentMarkService.listMarks(school, { assessment: { $in: allowedIds }, student });
      return res.json({ marks });
    }

    const marks = await assessmentMarkService.listMarks(school, { assessment: assessmentId, student });
    res.json({ marks });
  } catch (err) { next(err); }
};

const getMark = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const mark = await assessmentMarkService.getMark(req.params.id, school);

    if (isStaff(req.user.role)) {
      const assessment = await assessmentService.getById(mark.assessment._id.toString(), school);
      const scope = await assessmentService.getTeacherScope(req.user._id, school);
      if (!assessmentService.matchesReadScope(scope, scopeOf(assessment))) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ mark });
  } catch (err) { next(err); }
};

const getMarkHistory = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const mark = await assessmentMarkService.getMark(req.params.id, school);

    // Object-level read scope for teachers (same rule as viewing the mark)
    if (isStaff(req.user.role)) {
      const assessment = await assessmentService.getById(mark.assessment._id.toString(), school);
      const scope = await assessmentService.getTeacherScope(req.user._id, school);
      if (!assessmentService.matchesReadScope(scope, scopeOf(assessment))) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const history = await assessmentMarkService.getMarkHistory(req.params.id, school);
    res.json({ history });
  } catch (err) { next(err); }
};

const getCorrectionsByAssessment = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const corrections = await assessmentMarkService.getCorrectionsByAssessment(req.params.assessmentId, school);
    res.json({ corrections });
  } catch (err) { next(err); }
};

module.exports = {
  recordMark,
  bulkRecordMarks,
  listMarks,
  getMark,
  getMarkHistory,
  getCorrectionsByAssessment,
};
