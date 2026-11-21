'use strict';

const studentService = require('../services/studentService');
const auditService = require('../services/auditService');

const createStudent = async (req, res, next) => {
  try {
    const { admissionNumber, level, firstName, middleName, lastName, dateOfBirth, gender, guardianName, guardianPhone, guardianEmail, status } = req.body;
    const school = req.user.school._id;
    const doc = await studentService.create({ school, admissionNumber, level, firstName, middleName, lastName, dateOfBirth, gender, guardianName, guardianPhone, guardianEmail, status, createdBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'STUDENT_CREATED', entityType: 'Student', entityId: doc._id, metadata: { admissionNumber: doc.admissionNumber, firstName, lastName, level }, req });
    res.status(201).json({ student: doc });
  } catch (err) { next(err); }
};

const listStudents = async (req, res, next) => {
  try {
    const docs = await studentService.list(req.user.school._id, { status: req.query.status });
    res.json({ students: docs });
  } catch (err) { next(err); }
};

const getStudent = async (req, res, next) => {
  try {
    const doc = await studentService.getById(req.params.id, req.user.school._id);
    res.json({ student: doc });
  } catch (err) { next(err); }
};

const updateStudent = async (req, res, next) => {
  try {
    const { firstName, middleName, lastName, dateOfBirth, gender, guardianName, guardianPhone, guardianEmail, status } = req.body;
    const doc = await studentService.update(req.params.id, req.user.school._id, { firstName, middleName, lastName, dateOfBirth, gender, guardianName, guardianPhone, guardianEmail, status }, req.user._id);
    await auditService.log({ actor: req.user, action: 'STUDENT_UPDATED', entityType: 'Student', entityId: doc._id, metadata: { updatedFields: Object.keys(req.body) }, req });
    res.json({ student: doc });
  } catch (err) { next(err); }
};

const deleteStudent = async (req, res, next) => {
  try {
    const doc = await studentService.getById(req.params.id, req.user.school._id);
    await studentService.remove(req.params.id, req.user.school._id);
    await auditService.log({ actor: req.user, action: 'STUDENT_DELETED', entityType: 'Student', entityId: doc._id, metadata: { admissionNumber: doc.admissionNumber }, req });
    res.json({ message: 'Student deleted' });
  } catch (err) { next(err); }
};

module.exports = { createStudent, listStudents, getStudent, updateStudent, deleteStudent };
