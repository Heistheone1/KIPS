'use strict';

const AcademicYear = require('../models/AcademicYear');

const assertSchoolOwnership = (doc, schoolId) => {
  if (doc.school.toString() !== schoolId.toString()) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
};

const create = async ({ school, name, code, startDate, endDate, status = 'PLANNED', createdBy }) => {
  if (new Date(endDate) <= new Date(startDate)) {
    const err = new Error('End date must be after start date');
    err.statusCode = 400;
    throw err;
  }

  // Prevent multiple ACTIVE academic years for the same school
  if (status === 'ACTIVE') {
    const existing = await AcademicYear.findOne({ school, status: 'ACTIVE' });
    if (existing) {
      const err = new Error('An active academic year already exists for this school');
      err.statusCode = 409;
      throw err;
    }
  }

  return AcademicYear.create({ school, name, code, startDate, endDate, status, createdBy });
};

const list = async (schoolId) => {
  return AcademicYear.find({ school: schoolId }).sort({ startDate: -1 });
};

const getById = async (id, schoolId) => {
  const doc = await AcademicYear.findById(id);
  if (!doc) {
    const err = new Error('Academic year not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);
  return doc;
};

const update = async (id, schoolId, updates, updatedBy) => {
  const doc = await getById(id, schoolId);

  if (updates.status === 'ACTIVE' && doc.status !== 'ACTIVE') {
    const existing = await AcademicYear.findOne({ school: schoolId, status: 'ACTIVE', _id: { $ne: id } });
    if (existing) {
      const err = new Error('An active academic year already exists for this school');
      err.statusCode = 409;
      throw err;
    }
  }

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
