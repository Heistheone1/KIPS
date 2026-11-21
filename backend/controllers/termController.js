'use strict';

const termService = require('../services/termService');
const auditService = require('../services/auditService');

const createTerm = async (req, res, next) => {
  try {
    const { academicYear, name, code, sequence, startDate, endDate, status } = req.body;
    const school = req.user.school._id;
    const doc = await termService.create({ school, academicYear, name, code, sequence, startDate, endDate, status, createdBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'TERM_CREATED', entityType: 'Term', entityId: doc._id, metadata: { name, code, academicYear }, req });
    res.status(201).json({ term: doc });
  } catch (err) { next(err); }
};

const listTerms = async (req, res, next) => {
  try {
    const docs = await termService.list(req.user.school._id, { academicYear: req.query.academicYear });
    res.json({ terms: docs });
  } catch (err) { next(err); }
};

const getTerm = async (req, res, next) => {
  try {
    const doc = await termService.getById(req.params.id, req.user.school._id);
    res.json({ term: doc });
  } catch (err) { next(err); }
};

const updateTerm = async (req, res, next) => {
  try {
    const { name, startDate, endDate, status } = req.body;
    const doc = await termService.update(req.params.id, req.user.school._id, { name, startDate, endDate, status }, req.user._id);
    await auditService.log({ actor: req.user, action: 'TERM_UPDATED', entityType: 'Term', entityId: doc._id, metadata: { updatedFields: Object.keys(req.body) }, req });
    res.json({ term: doc });
  } catch (err) { next(err); }
};

module.exports = { createTerm, listTerms, getTerm, updateTerm };
