'use strict';

const classService = require('../services/classService');
const classTeacherAssignmentService = require('../services/classTeacherAssignmentService');
const teacherAssignmentService = require('../services/teacherAssignmentService');
const auditService = require('../services/auditService');

const createClass = async (req, res, next) => {
  try {
    const { academicYear, name, code, level, section, stream, capacity, description, status } = req.body;
    const school = req.user.school._id;
    const doc = await classService.create({ school, academicYear, name, code, level, section, stream, capacity, description, status, createdBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'CLASS_CREATED', entityType: 'Class', entityId: doc._id, metadata: { name, code, academicYear }, req });
    res.status(201).json({ class: doc });
  } catch (err) { next(err); }
};

const bulkCreateClasses = async (req, res, next) => {
  try {
    const { academicYear, classes } = req.body;
    const school = req.user.school._id;
    const results = await classService.bulkCreate({ school, academicYear, classes, createdBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'CLASSES_BULK_CREATED', entityType: 'Class', entityId: null, metadata: { academicYear, count: results.created.length }, req });
    res.status(201).json(results);
  } catch (err) { next(err); }
};

const listClasses = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const role = req.user.role;

    if (role === 'CLASS_TEACHER') {
      // Scope to assigned classes only
      const assignments = await classTeacherAssignmentService.getTeacherClassAssignments(req.user._id, school);
      const classIds = assignments.map((a) => a.class._id.toString());
      const all = await classService.list(school, { academicYear: req.query.academicYear });
      const filtered = all.filter((c) => classIds.includes(c._id.toString()));
      return res.json({ classes: filtered });
    }

    if (role === 'TEACHER') {
      const assignments = await teacherAssignmentService.getTeacherAssignments(req.user._id, school);
      const classIds = [...new Set(assignments.map((a) => a.class._id.toString()))];
      const all = await classService.list(school, { academicYear: req.query.academicYear });
      const filtered = all.filter((c) => classIds.includes(c._id.toString()));
      return res.json({ classes: filtered });
    }

    const docs = await classService.list(school, { academicYear: req.query.academicYear, status: req.query.status });
    res.json({ classes: docs });
  } catch (err) { next(err); }
};

const getClass = async (req, res, next) => {
  try {
    const school = req.user.school._id;
    const doc = await classService.getById(req.params.id, school);

    // CLASS_TEACHER: verify they are assigned to this class
    if (req.user.role === 'CLASS_TEACHER') {
      const assignments = await classTeacherAssignmentService.getTeacherClassAssignments(req.user._id, school);
      const allowed = assignments.some((a) => a.class._id.toString() === req.params.id);
      if (!allowed) return res.status(403).json({ message: 'Access denied' });
    }

    // TEACHER: verify they have an assignment in this class
    if (req.user.role === 'TEACHER') {
      const assignments = await teacherAssignmentService.getTeacherAssignments(req.user._id, school);
      const allowed = assignments.some((a) => a.class._id.toString() === req.params.id);
      if (!allowed) return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ class: doc });
  } catch (err) { next(err); }
};

const updateClass = async (req, res, next) => {
  try {
    const { name, level, section, stream, capacity, description, status } = req.body;
    const doc = await classService.update(req.params.id, req.user.school._id, { name, level, section, stream, capacity, description, status }, req.user._id);
    await auditService.log({ actor: req.user, action: 'CLASS_UPDATED', entityType: 'Class', entityId: doc._id, metadata: { updatedFields: Object.keys(req.body) }, req });
    res.json({ class: doc });
  } catch (err) { next(err); }
};

const deleteClass = async (req, res, next) => {
  try {
    const result = await classService.deleteClass(req.params.id, req.user.school._id);
    await auditService.log({ actor: req.user, action: 'CLASS_DELETED', entityType: 'Class', entityId: result.deletedId, metadata: {}, req });
    res.json({ message: 'Class deleted', deletedId: result.deletedId });
  } catch (err) { next(err); }
};

module.exports = { createClass, bulkCreateClasses, listClasses, getClass, updateClass, deleteClass };
