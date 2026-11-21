'use strict';

const subjectService = require('../services/subjectService');
const auditService = require('../services/auditService');

const createSubject = async (req, res, next) => {
  try {
    const { name, code, description, level, status } = req.body;
    const school = req.user.school._id;
    const doc = await subjectService.create({ school, name, code, description, level, status, createdBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'SUBJECT_CREATED', entityType: 'Subject', entityId: doc._id, metadata: { name, code, level }, req });
    res.status(201).json({ subject: doc });
  } catch (err) { next(err); }
};

const listSubjects = async (req, res, next) => {
  try {
    const docs = await subjectService.list(req.user.school._id, { status: req.query.status, level: req.query.level });
    res.json({ subjects: docs });
  } catch (err) { next(err); }
};

const getSubject = async (req, res, next) => {
  try {
    const doc = await subjectService.getById(req.params.id, req.user.school._id);
    res.json({ subject: doc });
  } catch (err) { next(err); }
};

const updateSubject = async (req, res, next) => {
  try {
    const { name, description, level, status } = req.body;
    const doc = await subjectService.update(req.params.id, req.user.school._id, { name, description, level, status }, req.user._id);
    await auditService.log({ actor: req.user, action: 'SUBJECT_UPDATED', entityType: 'Subject', entityId: doc._id, metadata: { updatedFields: Object.keys(req.body) }, req });
    res.json({ subject: doc });
  } catch (err) { next(err); }
};

module.exports = { createSubject, listSubjects, getSubject, updateSubject };
