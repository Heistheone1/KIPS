'use strict';

const { Student, Enrollment } = require('../models_pg');

const assertSchoolOwnership = (doc, schoolId) => {
  if ((doc.schoolId || doc.school)?.toString() !== schoolId.toString()) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
};

const create = async ({ school, admissionNumber, firstName, middleName, lastName, dateOfBirth, gender, guardianName, guardianPhone, guardianEmail, status = 'ACTIVE', createdBy }) => {
  return Student.create({ schoolId: school, admissionNumber, firstName, middleName, lastName, dateOfBirth, gender, guardianName, guardianPhone, guardianEmail, status, createdBy });
};

const list = async (schoolId, filters = {}) => {
  const where = { schoolId };
  if (filters.status) where.status = filters.status;
  return Student.findAll({ where, order: [['lastName', 'ASC'], ['firstName', 'ASC']] });
};

const getById = async (id, schoolId) => {
  const doc = await Student.findByPk(id);
  if (!doc) {
    const err = new Error('Student not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);
  return doc;
};

const update = async (id, schoolId, updates, updatedBy) => {
  const doc = await Student.findByPk(id);
  if (!doc) {
    const err = new Error('Student not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);

  const fields = ['firstName', 'middleName', 'lastName', 'dateOfBirth', 'gender', 'guardianName', 'guardianPhone', 'guardianEmail', 'status'];
  for (const f of fields) {
    if (updates[f] !== undefined) doc[f] = updates[f];
  }
  doc.updatedBy = updatedBy;
  return doc.save();
};

module.exports = { create, list, getById, update };
