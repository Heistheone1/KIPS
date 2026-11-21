'use strict';

const assessmentService = require('../services/assessmentService');
const auditService = require('../services/auditService');
const Assessment = require('../models/Assessment');
const { MISSING_MARK_POLICIES, policyConfig, DISPLAY_PRECISION } = require('../services/markEngine');

const ALL_ROLES = ['ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'];
const WRITE_ROLES = ['ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'];

/**
 * Assessment metadata (types, statuses, missing-mark policies).
 * Sourced from the model + mark engine so React never hardcodes them.
 */
const getAssessmentMeta = (req, res) => {
  res.json({
    types: Assessment.TYPES,
    statuses: Assessment.STATUSES,
    missingMarkPolicies: MISSING_MARK_POLICIES,
    defaultMissingPolicy: policyConfig.defaultMissingPolicy,
    displayPrecision: DISPLAY_PRECISION,
  });
};

// Scope tuple from an assessment document (populated or raw ids both work)
const scopeOf = (doc) => ({
  academicYear: doc.academicYear ? (doc.academicYear._id || doc.academicYear) : null,
  term: doc.term ? (doc.term._id || doc.term) : null,
  class: doc.class ? (doc.class._id || doc.class) : null,
  subject: doc.subject ? (doc.subject._id || doc.subject) : null,
});

const isStaff = (role) => role === 'TEACHER' || role === 'CLASS_TEACHER';

const createAssessment = async (req, res, next) => {
  try {
    const { academicYear, term, class: classId, subject, type, name, maxMarks, weight, status, startDate, dueDate } = req.body;
    const school = req.user.school._id;
    const role = req.user.role;

    // TEACHER / CLASS_TEACHER: must have active assignment for this scope
    if (isStaff(role)) {
      await assessmentService.assertTeacherAssignmentScope(req.user._id, school, {
        academicYear, term, class: classId, subject,
      });
    }

    const doc = await assessmentService.create({
      school, academicYear, term, class: classId, subject,
      type, name, maxMarks, weight, status, startDate, dueDate,
      createdBy: req.user._id,
    });

    await auditService.log({
      actor: req.user, action: 'ASSESSMENT_CREATED',
      entityType: 'Assessment', entityId: doc._id,
      metadata: { name, type, class: classId, subject, term, academicYear, weight, maxMarks }, req,
    });

    res.status(201).json({ assessment: doc });
  } catch (err) { next(err); }
};

const listAssessments = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const role = req.user.role;
    const { academicYear, term, class: classId, subject, status, type } = req.query;

    const filters = { school };
    if (academicYear) filters.academicYear = academicYear;
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (term) filters.term = term;
    if (classId) filters.class = classId;
    if (subject) filters.subject = subject;

    // TEACHER / CLASS_TEACHER: filter to exact assignment tuples (no tuple-crossing)
    if (isStaff(role)) {
      const scope = await assessmentService.getTeacherScope(req.user._id, school);
      const docs = await assessmentService.list(school, filters);
      const filtered = docs.filter((a) => assessmentService.matchesReadScope(scope, scopeOf(a)));
      return res.json({ assessments: filtered });
    }

    const docs = await assessmentService.list(school, filters);
    res.json({ assessments: docs });
  } catch (err) { next(err); }
};

const getAssessment = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const doc = await assessmentService.getById(req.params.id, school);

    // TEACHER / CLASS_TEACHER: verify read scope (assignment or class-teacher class)
    if (isStaff(req.user.role)) {
      const scope = await assessmentService.getTeacherScope(req.user._id, school);
      if (!assessmentService.matchesReadScope(scope, scopeOf(doc))) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ assessment: doc });
  } catch (err) { next(err); }
};

const updateAssessment = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const role = req.user.role;

    // Load first to check scope for teachers
    const existing = await assessmentService.getById(req.params.id, school);

    // Management (any update) requires a matching TEACHING assignment —
    // class-teacher read scope alone is never enough to modify.
    if (isStaff(role)) {
      await assessmentService.assertTeacherAssignmentScope(req.user._id, school, scopeOf(existing));
    }

    const { name, type, maxMarks, weight, status, startDate, dueDate } = req.body;
    const statusChanged = status !== undefined && status !== existing.status;
    const doc = await assessmentService.update(req.params.id, school, { name, type, maxMarks, weight, status, startDate, dueDate }, req.user._id);

    await auditService.log({
      actor: req.user,
      action: statusChanged ? 'ASSESSMENT_STATUS_CHANGED' : 'ASSESSMENT_UPDATED',
      entityType: 'Assessment', entityId: doc._id,
      metadata: statusChanged
        ? { oldStatus: existing.status, newStatus: doc.status }
        : { updatedFields: Object.keys(req.body), status: doc.status },
      req,
    });

    res.json({ assessment: doc });
  } catch (err) { next(err); }
};

module.exports = { createAssessment, listAssessments, getAssessment, updateAssessment, getAssessmentMeta, ALL_ROLES, WRITE_ROLES };
