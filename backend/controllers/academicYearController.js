'use strict';

const academicYearService = require('../services/academicYearService');
const auditService = require('../services/auditService');

const createAcademicYear = async (req, res, next) => {
  try {
    const { name, code, startDate, endDate, status } = req.body;
    const school = req.user.school._id;
    const doc = await academicYearService.create({ school, name, code, startDate, endDate, status, createdBy: req.user._id });
    await auditService.log({ actor: req.user, action: 'ACADEMIC_YEAR_CREATED', entityType: 'AcademicYear', entityId: doc._id, metadata: { name, code }, req });
    res.status(201).json({ academicYear: doc });
  } catch (err) { next(err); }
};

const listAcademicYears = async (req, res, next) => {
  try {
    const docs = await academicYearService.list(req.user.school._id);
    res.json({ academicYears: docs });
  } catch (err) { next(err); }
};

const getAcademicYear = async (req, res, next) => {
  try {
    const doc = await academicYearService.getById(req.params.id, req.user.school._id);
    res.json({ academicYear: doc });
  } catch (err) { next(err); }
};

const updateAcademicYear = async (req, res, next) => {
  try {
    const { name, startDate, endDate, status } = req.body;
    const doc = await academicYearService.update(req.params.id, req.user.school._id, { name, startDate, endDate, status }, req.user._id);
    await auditService.log({ actor: req.user, action: 'ACADEMIC_YEAR_UPDATED', entityType: 'AcademicYear', entityId: doc._id, metadata: { updatedFields: Object.keys(req.body) }, req });
    res.json({ academicYear: doc });
  } catch (err) { next(err); }
};

module.exports = { createAcademicYear, listAcademicYears, getAcademicYear, updateAcademicYear };
