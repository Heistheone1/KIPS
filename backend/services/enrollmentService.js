'use strict';

const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const AcademicYear = require('../models/AcademicYear');
const Class = require('../models/Class');

const assertSchoolOwnership = (doc, schoolId) => {
  if (doc.school.toString() !== schoolId.toString()) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
};

const create = async ({ school, student: studentId, academicYear: yearId, class: classId, enrollmentDate, status = 'ACTIVE', createdBy }) => {
  // Validate all entities belong to the same school
  const [student, year, cls] = await Promise.all([
    Student.findById(studentId),
    AcademicYear.findById(yearId),
    Class.findById(classId),
  ]);

  if (!student || student.school.toString() !== school.toString()) {
    const err = new Error('Student not found or does not belong to this school');
    err.statusCode = 400;
    throw err;
  }
  if (!year || year.school.toString() !== school.toString()) {
    const err = new Error('Academic year not found or does not belong to this school');
    err.statusCode = 400;
    throw err;
  }
  if (!cls || cls.school.toString() !== school.toString()) {
    const err = new Error('Class not found or does not belong to this school');
    err.statusCode = 400;
    throw err;
  }
  // Class must belong to the selected academic year
  if (cls.academicYear.toString() !== yearId.toString()) {
    const err = new Error('Class does not belong to the selected academic year');
    err.statusCode = 400;
    throw err;
  }

  // Prevent duplicate active enrollment for same student + academic year
  const existing = await Enrollment.findOne({
    school,
    student: studentId,
    academicYear: yearId,
    status: 'ACTIVE',
  });
  if (existing) {
    const err = new Error('Student already has an active enrollment for this academic year');
    err.statusCode = 409;
    throw err;
  }

  return Enrollment.create({ school, student: studentId, academicYear: yearId, class: classId, enrollmentDate: enrollmentDate || new Date(), status, createdBy });
};

const list = async (schoolId, filters = {}) => {
  const query = { school: schoolId };
  if (filters.academicYear) query.academicYear = filters.academicYear;
  if (filters.class) query.class = filters.class;
  if (filters.student) query.student = filters.student;
  if (filters.status) query.status = filters.status;

  const docs = await Enrollment.find(query).sort({ createdAt: -1 });

  // Manually resolve references since pg-odm populate is unreliable
  const studentIds = [...new Set(docs.map(d => d.student).filter(Boolean))];
  const yearIds = [...new Set(docs.map(d => d.academicYear).filter(Boolean))];
  const classIds = [...new Set(docs.map(d => d.class).filter(Boolean))];

  const [students, years, classes] = await Promise.all([
    studentIds.length ? Student.find({ _id: { $in: studentIds } }) : [],
    yearIds.length ? AcademicYear.find({ _id: { $in: yearIds } }) : [],
    classIds.length ? Class.find({ _id: { $in: classIds } }) : [],
  ]);

  const studentMap = new Map(students.map(s => [s._id, s]));
  const yearMap = new Map(years.map(y => [y._id, y]));
  const classMap = new Map(classes.map(c => [c._id, c]));

  return docs.map(doc => {
    const plain = doc.toObject ? doc.toObject() : doc;
    return {
      ...plain,
      student: plain.student ? studentMap.get(plain.student) : null,
      academicYear: plain.academicYear ? yearMap.get(plain.academicYear) : null,
      class: plain.class ? classMap.get(plain.class) : null,
    };
  });
};

const getById = async (id, schoolId) => {
  const doc = await Enrollment.findById(id);
  if (!doc) {
    const err = new Error('Enrollment not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);

  const plain = doc.toObject ? doc.toObject() : doc;

  const [student, year, cls] = await Promise.all([
    plain.student ? Student.findById(plain.student) : null,
    plain.academicYear ? AcademicYear.findById(plain.academicYear) : null,
    plain.class ? Class.findById(plain.class) : null,
  ]);

  return {
    ...plain,
    student: student || null,
    academicYear: year || null,
    class: cls || null,
  };
};

const update = async (id, schoolId, updates, updatedBy) => {
  const doc = await Enrollment.findById(id);
  if (!doc) {
    const err = new Error('Enrollment not found');
    err.statusCode = 404;
    throw err;
  }
  assertSchoolOwnership(doc, schoolId);

  // If changing class, validate it belongs to the same school + academic year
  if (updates.class) {
    const cls = await Class.findById(updates.class);
    if (!cls || cls.school.toString() !== schoolId.toString()) {
      const err = new Error('Class not found or does not belong to this school');
      err.statusCode = 400;
      throw err;
    }
    if (cls.academicYear.toString() !== doc.academicYear.toString()) {
      const err = new Error('Class does not belong to the enrollment academic year');
      err.statusCode = 400;
      throw err;
    }
    doc.class = updates.class;
  }

  if (updates.enrollmentDate !== undefined) doc.enrollmentDate = updates.enrollmentDate;
  if (updates.status !== undefined) doc.status = updates.status;
  doc.updatedBy = updatedBy;

  return doc.save();
};

module.exports = { create, list, getById, update };
