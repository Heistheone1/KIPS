'use strict';

const Term = require('../models/Term');
const AcademicYear = require('../models/AcademicYear');

const assertSchoolOwnership = (doc, schoolId) => {
  if (doc.school.toString() !== schoolId.toString()) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
};

const create = async ({ school, academicYear: yearId, name, code, sequence, startDate, endDate, status = 'PLANNED', createdBy }) => {
  // Validate academic year belongs to school
  const year = await AcademicYear.findById(yearId);
  if (!year || year.school.toString() !== school.toString()) {
    const err = new Error('Academic year not found or does not belong to this school');
    err.statusCode = 400;
    throw err;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    const err = new Error('End date must be after start date');
    err.statusCode = 400;
    throw err;
  }

  // Term dates must fall within academic year
  if (start < new Date(year.startDate) || end > new Date(year.endDate)) {
    const err = new Error('Term dates must fall within the academic year date range');
    err.statusCode = 400;
    throw err;
  }

  // Check for overlapping terms in the same academic year
  const overlap = await Term.findOne({
    school,
    academicYear: yearId,
    $or: [
      { startDate: { $lt: end }, endDate: { $gt: start } },
    ],
  });
  if (overlap) {
    const err = new Error('Term dates overlap with an existing term in this academic year');
    err.statusCode = 409;
    throw err;
  }

  return Term.create({ school, academicYear: yearId, name, code, sequence, startDate, endDate, status, createdBy });
};

const list = async (schoolId, filters = {}) => {
  const query = { school: schoolId };
  if (filters.academicYear) query.academicYear = filters.academicYear;
  return Term.find(query).sort({ sequence: 1 });
};

const getById = async (id, schoolId) => {
  const doc = await Term.findById(id);
  if (!doc) {
    const err = new Error('Term not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);
  return doc;
};

const update = async (id, schoolId, updates, updatedBy) => {
  const doc = await getById(id, schoolId);

  if (updates.name !== undefined) doc.name = updates.name;
  if (updates.startDate !== undefined) doc.startDate = updates.startDate;
  if (updates.endDate !== undefined) doc.endDate = updates.endDate;
  if (updates.status !== undefined) doc.status = updates.status;
  doc.updatedBy = updatedBy;

  if (doc.endDate <= doc.startDate) {
    const err = new Error('End date must be after start date');
    err.statusCode = 400;
    throw err;
  }

  return doc.save();
};

module.exports = { create, list, getById, update };
