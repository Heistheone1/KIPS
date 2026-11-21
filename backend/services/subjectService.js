'use strict';

const Subject = require('../models/Subject');

const assertSchoolOwnership = (doc, schoolId) => {
  if (doc.school.toString() !== schoolId.toString()) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
};

const create = async ({ school, name, code, description, level, status = 'ACTIVE', createdBy }) => {
  return Subject.create({ school, name, code, description, level, status, createdBy });
};

const list = async (schoolId, filters = {}) => {
  const query = { school: schoolId };
  if (filters.status) query.status = filters.status;
  if (filters.level) query.level = filters.level;
  return Subject.find(query).sort({ level: 1, name: 1 });
};

const getById = async (id, schoolId) => {
  const doc = await Subject.findById(id);
  if (!doc) {
    const err = new Error('Subject not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);
  return doc;
};

const update = async (id, schoolId, updates, updatedBy) => {
  const doc = await Subject.findById(id);
  if (!doc) {
    const err = new Error('Subject not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);

  if (updates.name        !== undefined) doc.name        = updates.name;
  if (updates.description !== undefined) doc.description = updates.description;
  if (updates.level       !== undefined) doc.level       = updates.level;
  if (updates.status      !== undefined) doc.status      = updates.status;
  doc.updatedBy = updatedBy;

  return doc.save();
};

module.exports = { create, list, getById, update };
