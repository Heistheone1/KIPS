'use strict';

const Student = require('../models/Student');
const AcademicYear = require('../models/AcademicYear');

const LEVEL_CODE = { NURSERY: '01', PRIMARY: '02' };

const assertSchoolOwnership = (doc, schoolId) => {
  if (!doc || !doc.school || doc.school.toString() !== schoolId.toString()) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
};

const generateAdmissionNumber = async (schoolId, level) => {
  // Resolve the active academic year code for the school
  let yearCode = '202627';
  try {
    const activeYear = await AcademicYear.findOne({ school: schoolId, status: 'ACTIVE' });
    if (activeYear && activeYear.code) {
      yearCode = String(activeYear.code).replace(/[^0-9]/g, '').slice(0, 6) || '202627';
    }
  } catch (_) {
    // fall back to default
  }

  const levelCode = LEVEL_CODE[level] || LEVEL_CODE.PRIMARY;
  const prefix = `${yearCode}${levelCode}`;

  // Count existing students with same school + prefix to get next sequence
  const existing = await Student.find({ school: schoolId });
  let maxSeq = 0;
  for (const s of existing) {
    const adm = s.admissionNumber || '';
    if (adm.startsWith(prefix)) {
      const seq = parseInt(adm.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}${nextSeq}`;
};

const create = async ({ school, admissionNumber, level, firstName, middleName, lastName, dateOfBirth, gender, guardianName, guardianPhone, guardianEmail, status = 'ACTIVE', createdBy }) => {
  let finalAdmissionNumber = admissionNumber;
  if (!finalAdmissionNumber || finalAdmissionNumber.trim() === '') {
    finalAdmissionNumber = await generateAdmissionNumber(school, level);
  }
  return Student.create({ school, admissionNumber: finalAdmissionNumber, level, firstName, middleName, lastName, dateOfBirth, gender, guardianName, guardianPhone, guardianEmail, status, createdBy });
};

const list = async (schoolId, filters = {}) => {
  const query = { school: schoolId };
  if (filters.status) query.status = filters.status;
  return Student.find(query).sort({ lastName: 1, firstName: 1 });
};

const getById = async (id, schoolId) => {
  const doc = await Student.findById(id);
  if (!doc) {
    const err = new Error('Student not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);
  return doc;
};

const update = async (id, schoolId, updates, updatedBy) => {
  const doc = await Student.findById(id);
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

const remove = async (id, schoolId) => {
  const doc = await Student.findById(id);
  if (!doc) {
    const err = new Error('Student not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);
  await Student.findByIdAndDelete(id);
};

module.exports = { create, list, getById, update, remove };
