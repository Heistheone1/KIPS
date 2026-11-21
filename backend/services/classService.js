'use strict';

const Class = require('../models/Class');
const AcademicYear = require('../models/AcademicYear');

const assertSchoolOwnership = (doc, schoolId) => {
  if (!doc || !doc.school || doc.school.toString() !== schoolId.toString()) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
};

const create = async ({ school, academicYear: yearId, name, code, level, section, stream, capacity, description, status = 'ACTIVE', createdBy }) => {
  const year = await AcademicYear.findById(yearId);
  if (!year || year.school.toString() !== school.toString()) {
    const err = new Error('Academic year not found or does not belong to this school');
    err.statusCode = 400;
    throw err;
  }
  return Class.create({ school, academicYear: yearId, name, code, level, section, stream, capacity, description, status, createdBy });
};

const bulkCreate = async ({ school, academicYear: yearId, classes, createdBy }) => {
  const year = await AcademicYear.findById(yearId);
  if (!year || year.school.toString() !== school.toString()) {
    const err = new Error('Academic year not found or does not belong to this school');
    err.statusCode = 400;
    throw err;
  }
  const results = { created: [], skipped: [] };
  for (const cls of classes) {
    try {
      const doc = await Class.create({ school, academicYear: yearId, ...cls, status: 'ACTIVE', createdBy });
      results.created.push(doc);
    } catch (err) {
      if (err.code === 11000) results.skipped.push(cls.code);
      else throw err;
    }
  }
  return results;
};

const list = async (schoolId, filters = {}) => {
  const query = { school: schoolId };
  if (filters.academicYear) query.academicYear = filters.academicYear;
  if (filters.status) query.status = filters.status;

  const docs = await Class.find(query).sort({ name: 1 });

  const yearIds = [...new Set(docs.map(d => d.academicYear).filter(Boolean))];
  const years = yearIds.length ? await AcademicYear.find({ _id: { $in: yearIds } }) : [];
  const yearMap = new Map(years.map(y => [y._id, y]));

  return docs.map(doc => {
    const plain = doc.toObject ? doc.toObject() : doc;
    return {
      ...plain,
      academicYear: plain.academicYear ? yearMap.get(plain.academicYear) : null,
    };
  });
};

const getById = async (id, schoolId) => {
  const doc = await Class.findById(id);
  if (!doc) {
    const err = new Error('Class not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);

  const plain = doc.toObject ? doc.toObject() : doc;

  const year = plain.academicYear ? await AcademicYear.findById(plain.academicYear) : null;

  return {
    ...plain,
    academicYear: year || null,
  };
};

const update = async (id, schoolId, updates, updatedBy) => {
  const doc = await Class.findById(id);
  if (!doc) {
    const err = new Error('Class not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);

  if (updates.name        !== undefined) doc.name        = updates.name;
  if (updates.level       !== undefined) doc.level       = updates.level;
  if (updates.section     !== undefined) doc.section     = updates.section;
  if (updates.stream      !== undefined) doc.stream      = updates.stream;
  if (updates.capacity    !== undefined) doc.capacity    = updates.capacity;
  if (updates.description !== undefined) doc.description = updates.description;
  if (updates.status      !== undefined) doc.status      = updates.status;
  doc.updatedBy = updatedBy;

  return doc.save();
};

const deleteClass = async (id, schoolId) => {
  const doc = await Class.findById(id);
  if (!doc) {
    const err = new Error('Class not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);

  // Prevent deletion if active enrollments exist
  const Enrollment = require('../models/Enrollment');
  const enrollments = await Enrollment.find({ class: id, status: 'ACTIVE' });
  if (enrollments.length > 0) {
    const err = new Error('Cannot delete class with active enrollments');
    err.statusCode = 400;
    throw err;
  }

  await Class.findByIdAndDelete(id);
  return { deletedId: id };
};

module.exports = { create, bulkCreate, list, getById, update, deleteClass };
