'use strict';

const enrollmentService = require('../services/enrollmentService');
const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');
const auditService = require('../services/auditService');

const createEnrollment = async (req, res, next) => {
  try {
    const { student, academicYear, class: classId, enrollmentDate, status } = req.body;
    const school = req.user.school._id;

    // CLASS_TEACHER can only enroll students in their assigned class
    if (req.user.role === 'CLASS_TEACHER') {
      const assignment = await ClassTeacherAssignment.findOne({
        teacher: req.user._id,
        class: classId,
        status: 'ACTIVE',
      });
      if (!assignment) {
        return res.status(403).json({ message: 'You are not the class teacher for this class' });
      }
    }

    const doc = await enrollmentService.create({ school, student, academicYear, class: classId, enrollmentDate, status, createdBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'ENROLLMENT_CREATED', entityType: 'Enrollment', entityId: doc._id, metadata: { student, academicYear, class: classId }, req });
    res.status(201).json({ enrollment: doc });
  } catch (err) { next(err); }
};

const listEnrollments = async (req, res, next) => {
  try {
    const { academicYear, class: classId, student, status } = req.query;
    const docs = await enrollmentService.list(req.user.school._id, { academicYear, class: classId, student, status });
    res.json({ enrollments: docs });
  } catch (err) { next(err); }
};

const getEnrollment = async (req, res, next) => {
  try {
    const doc = await enrollmentService.getById(req.params.id, req.user.school._id);
    res.json({ enrollment: doc });
  } catch (err) { next(err); }
};

const updateEnrollment = async (req, res, next) => {
  try {
    const { class: classId, enrollmentDate, status } = req.body;
    const doc = await enrollmentService.update(req.params.id, req.user.school._id, { class: classId, enrollmentDate, status }, req.user._id);
    await auditService.log({ actor: req.user, action: 'ENROLLMENT_UPDATED', entityType: 'Enrollment', entityId: doc._id, metadata: { updatedFields: Object.keys(req.body) }, req });
    res.json({ enrollment: doc });
  } catch (err) { next(err); }
};

module.exports = { createEnrollment, listEnrollments, getEnrollment, updateEnrollment };
