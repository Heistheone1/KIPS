'use strict';

const teacherAssignmentService = require('../services/teacherAssignmentService');
const auditService = require('../services/auditService');

const createTeacherAssignment = async (req, res, next) => {
  try {
    const { teacher, academicYear, term, class: classId, subject, status } = req.body;
    const school = req.user.school._id;
    const doc = await teacherAssignmentService.create({ school, teacher, academicYear, term, class: classId, subject, status, assignedBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'TEACHER_ASSIGNMENT_CREATED', entityType: 'TeacherAssignment', entityId: doc._id, metadata: { teacher, academicYear, term, class: classId, subject }, req });
    res.status(201).json({ assignment: doc });
  } catch (err) { next(err); }
};

const listTeacherAssignments = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const { academicYear, term, class: classId, status } = req.query;

    // TEACHER can only see their own assignments
    const teacher = req.user.role === 'TEACHER'
      ? req.user._id
      : req.query.teacher;

    const docs = await teacherAssignmentService.list(school, { teacher, academicYear, term, class: classId, status });
    res.json({ assignments: docs });
  } catch (err) { next(err); }
};

const getTeacherAssignment = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const doc = await teacherAssignmentService.getById(req.params.id, school);

    // TEACHER can only see their own assignments
    if (req.user.role === 'TEACHER') {
      if (doc.teacher._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ assignment: doc });
  } catch (err) { next(err); }
};

const updateTeacherAssignment = async (req, res, next) => {
  try {
    const { status } = req.body;
    const doc = await teacherAssignmentService.update(req.params.id, req.user.school._id, { status }, req.user._id);
    await auditService.log({ actor: req.user, action: 'TEACHER_ASSIGNMENT_UPDATED', entityType: 'TeacherAssignment', entityId: doc._id, metadata: { status }, req });
    res.json({ assignment: doc });
  } catch (err) { next(err); }
};

const deleteTeacherAssignment = async (req, res, next) => {
  try {
    const result = await teacherAssignmentService.remove(req.params.id, req.user.school._id);
    await auditService.log({ actor: req.user, action: 'TEACHER_ASSIGNMENT_DELETED', entityType: 'TeacherAssignment', entityId: result.id, metadata: {}, req });
    res.json({ message: 'Teacher assignment deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { createTeacherAssignment, listTeacherAssignments, getTeacherAssignment, updateTeacherAssignment, deleteTeacherAssignment };
