'use strict';

const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const Term = require('../models/Term');
const Class = require('../models/Class');

const assertSchoolOwnership = (doc, schoolId) => {
  if (doc.school.toString() !== schoolId.toString()) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
};

const create = async ({ school, teacher: teacherId, academicYear: yearId, term: termId, class: classId, status = 'ACTIVE', assignedBy }) => {
  const [teacher, year, term, cls] = await Promise.all([
    User.findById(teacherId),
    AcademicYear.findById(yearId),
    Term.findById(termId),
    Class.findById(classId),
  ]);

  if (!teacher || teacher.school.toString() !== school.toString()) {
    const err = new Error('Teacher not found or does not belong to this school');
    err.statusCode = 400;
    throw err;
  }
  if (!['TEACHER'].includes(teacher.role)) {
    const err = new Error('User must have role TEACHER to be assigned as class teacher');
    err.statusCode = 400;
    throw err;
  }
  if (!year || year.school.toString() !== school.toString()) {
    const err = new Error('Academic year not found or does not belong to this school');
    err.statusCode = 400;
    throw err;
  }
  if (!term || term.school.toString() !== school.toString() || term.academicYear.toString() !== yearId.toString()) {
    const err = new Error('Term not found or does not belong to this school/academic year');
    err.statusCode = 400;
    throw err;
  }
  if (!cls || cls.school.toString() !== school.toString() || cls.academicYear.toString() !== yearId.toString()) {
    const err = new Error('Class not found or does not belong to this school/academic year');
    err.statusCode = 400;
    throw err;
  }

  // Prevent conflicting active class-teacher for same class + term
  const existing = await ClassTeacherAssignment.findOne({
    school,
    class: classId,
    academicYear: yearId,
    term: termId,
    status: 'ACTIVE',
  });
  if (existing) {
    const err = new Error('An active class teacher assignment already exists for this class and term');
    err.statusCode = 409;
    throw err;
  }

  return ClassTeacherAssignment.create({ school, teacher: teacherId, academicYear: yearId, term: termId, class: classId, status, assignedBy });
};

const list = async (schoolId, filters = {}) => {
  const query = { school: schoolId };
  if (filters.teacher) query.teacher = filters.teacher;
  if (filters.academicYear) query.academicYear = filters.academicYear;
  if (filters.term) query.term = filters.term;
  if (filters.class) query.class = filters.class;
  if (filters.status) query.status = filters.status;

  const docs = await ClassTeacherAssignment.find(query).sort({ createdAt: -1 });

  const teacherIds = [...new Set(docs.map(d => d.teacher).filter(Boolean))];
  const yearIds = [...new Set(docs.map(d => d.academicYear).filter(Boolean))];
  const termIds = [...new Set(docs.map(d => d.term).filter(Boolean))];
  const classIds = [...new Set(docs.map(d => d.class).filter(Boolean))];

  const [teachers, years, terms, classes] = await Promise.all([
    teacherIds.length ? User.find({ _id: { $in: teacherIds } }) : [],
    yearIds.length ? AcademicYear.find({ _id: { $in: yearIds } }) : [],
    termIds.length ? Term.find({ _id: { $in: termIds } }) : [],
    classIds.length ? Class.find({ _id: { $in: classIds } }) : [],
  ]);

  const teacherMap = new Map(teachers.map(t => [t._id, t]));
  const yearMap = new Map(years.map(y => [y._id, y]));
  const termMap = new Map(terms.map(t => [t._id, t]));
  const classMap = new Map(classes.map(c => [c._id, c]));

  return docs.map(doc => {
    const plain = doc.toObject ? doc.toObject() : doc;
    return {
      ...plain,
      teacher: plain.teacher ? teacherMap.get(plain.teacher) : null,
      academicYear: plain.academicYear ? yearMap.get(plain.academicYear) : null,
      term: plain.term ? termMap.get(plain.term) : null,
      class: plain.class ? classMap.get(plain.class) : null,
    };
  });
};

const getById = async (id, schoolId) => {
  const doc = await ClassTeacherAssignment.findById(id);
  if (!doc) {
    const err = new Error('Class teacher assignment not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);

  const plain = doc.toObject ? doc.toObject() : doc;

  const [teacher, year, term, cls] = await Promise.all([
    plain.teacher ? User.findById(plain.teacher) : null,
    plain.academicYear ? AcademicYear.findById(plain.academicYear) : null,
    plain.term ? Term.findById(plain.term) : null,
    plain.class ? Class.findById(plain.class) : null,
  ]);

  return {
    ...plain,
    teacher: teacher || null,
    academicYear: year || null,
    term: term || null,
    class: cls || null,
  };
};

const update = async (id, schoolId, updates, updatedBy) => {
  const doc = await ClassTeacherAssignment.findById(id);
  if (!doc) {
    const err = new Error('Class teacher assignment not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);

  if (updates.status !== undefined) doc.status = updates.status;

  return doc.save();
};

// Get class teacher assignments for a specific teacher (used for authorization)
const getTeacherClassAssignments = async (teacherId, schoolId, filters = {}) => {
  const query = { school: schoolId, teacher: teacherId, status: 'ACTIVE' };
  if (filters.academicYear) query.academicYear = filters.academicYear;

  const docs = await ClassTeacherAssignment.find(query);

  const yearIds = [...new Set(docs.map(d => d.academicYear).filter(Boolean))];
  const termIds = [...new Set(docs.map(d => d.term).filter(Boolean))];
  const classIds = [...new Set(docs.map(d => d.class).filter(Boolean))];

  const [years, terms, classes] = await Promise.all([
    yearIds.length ? AcademicYear.find({ _id: { $in: yearIds } }) : [],
    termIds.length ? Term.find({ _id: { $in: termIds } }) : [],
    classIds.length ? Class.find({ _id: { $in: classIds } }) : [],
  ]);

  const yearMap = new Map(years.map(y => [y._id, y]));
  const termMap = new Map(terms.map(t => [t._id, t]));
  const classMap = new Map(classes.map(c => [c._id, c]));

  return docs.map(doc => {
    const plain = doc.toObject ? doc.toObject() : doc;
    return {
      ...plain,
      academicYear: plain.academicYear ? yearMap.get(plain.academicYear) : null,
      term: plain.term ? termMap.get(plain.term) : null,
      class: plain.class ? classMap.get(plain.class) : null,
    };
  });
};

module.exports = { create, list, getById, update, getTeacherClassAssignments };
