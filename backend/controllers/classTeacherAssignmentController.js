'use strict';

const classTeacherAssignmentService = require('../services/classTeacherAssignmentService');
const auditService = require('../services/auditService');

const createClassTeacherAssignment = async (req, res, next) => {
  try {
    const { teacher, academicYear, term, class: classId, status } = req.body;
    const school = req.user.school._id;
    const doc = await classTeacherAssignmentService.create({ school, teacher, academicYear, term, class: classId, status, assignedBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'CLASS_TEACHER_ASSIGNMENT_CREATED', entityType: 'ClassTeacherAssignment', entityId: doc._id, metadata: { teacher, academicYear, term, class: classId }, req });
    res.status(201).json({ assignment: doc });
  } catch (err) { next(err); }
};

const listClassTeacherAssignments = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const { academicYear, term, class: classId, status } = req.query;

    // CLASS_TEACHER can only see their own assignments
    const teacher = req.user.role === 'CLASS_TEACHER'
      ? req.user._id
      : req.query.teacher;

    const docs = await classTeacherAssignmentService.list(school, { teacher, academicYear, term, class: classId, status });
    res.json({ assignments: docs });
  } catch (err) { next(err); }
};

const getClassTeacherAssignment = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const doc = await classTeacherAssignmentService.getById(req.params.id, school);

    if (req.user.role === 'CLASS_TEACHER') {
      if (doc.teacher._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ assignment: doc });
  } catch (err) { next(err); }
};

const updateClassTeacherAssignment = async (req, res, next) => {
  try {
    const { status } = req.body;
    const doc = await classTeacherAssignmentService.update(req.params.id, req.user.school._id, { status }, req.user._id);
    await auditService.log({ actor: req.user, action: 'CLASS_TEACHER_ASSIGNMENT_UPDATED', entityType: 'ClassTeacherAssignment', entityId: doc._id, metadata: { status }, req });
    res.json({ assignment: doc });
  } catch (err) { next(err); }
};

module.exports = { createClassTeacherAssignment, listClassTeacherAssignments, getClassTeacherAssignment, updateClassTeacherAssignment };
