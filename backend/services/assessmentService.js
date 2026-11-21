'use strict';

const Assessment = require('../models/Assessment');
const AcademicYear = require('../models/AcademicYear');
const Term = require('../models/Term');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const TeacherAssignment = require('../models/TeacherAssignment');
const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');
const { validateAssessmentWeights } = require('./markEngine');

const assertSchoolOwnership = (doc, schoolId) => {
  if (doc.school.toString() !== schoolId.toString()) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
};

const err400 = (msg) => { const e = new Error(msg); e.statusCode = 400; return e; };
const err403 = (msg) => { const e = new Error(msg); e.statusCode = 403; return e; };
const err404 = (msg) => { const e = new Error(msg); e.statusCode = 404; return e; };

/**
 * Validate that all referenced entities exist and belong to the same school/year.
 */
const validateAcademicScope = async (school, { academicYear: yearId, term: termId, class: classId, subject: subjectId }) => {
  const [year, term, cls, subject] = await Promise.all([
    AcademicYear.findById(yearId),
    Term.findById(termId),
    Class.findById(classId),
    Subject.findById(subjectId),
  ]);

  if (!year || year.school.toString() !== school.toString())
    throw err400('Academic year not found or does not belong to this school');
  if (!term || term.school.toString() !== school.toString())
    throw err400('Term not found or does not belong to this school');
  if (term.academicYear.toString() !== yearId.toString())
    throw err400('Term does not belong to the selected academic year');
  if (!cls || cls.school.toString() !== school.toString())
    throw err400('Class not found or does not belong to this school');
  if (cls.academicYear.toString() !== yearId.toString())
    throw err400('Class does not belong to the selected academic year');
  if (!subject || subject.school.toString() !== school.toString())
    throw err400('Subject not found or does not belong to this school');
};

/**
 * Verify a teacher has an active TeacherAssignment for the given scope.
 * This is the authoritative object-level authorization check for teachers.
 */
const assertTeacherAssignmentScope = async (teacherId, school, { academicYear, term, class: classId, subject }) => {
  const assignment = await TeacherAssignment.findOne({
    school,
    teacher: teacherId,
    academicYear,
    term,
    class: classId,
    subject,
    status: 'ACTIVE',
  });
  if (!assignment) {
    throw err403('You do not have an active teaching assignment for this class/subject/term');
  }
  return assignment;
};

/**
 * Validate combined assessment weights for a class+term+subject scope.
 * When summing, `excludeId` (an existing assessment) is omitted so weight
 * edits don't count the assessment against itself.
 * Invalid weight configurations are REJECTED, never silently normalised.
 */
const assertValidWeightConfig = async (school, { academicYear, term, class: classId, subject, weight, excludeId = null }) => {
  const query = { school, academicYear, term, class: classId, subject };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await Assessment.find(query).select('weight').lean();
  const combined = [...existing.map((a) => ({ weight: a.weight })), { weight }];
  const result = validateAssessmentWeights(combined);
  if (!result.valid) {
    throw err400(`Invalid assessment weight configuration: ${result.message}`);
  }
  return result.total;
};

/**
 * Read-scope tuples for a teacher (TEACHER or CLASS_TEACHER).
 * Returns arrays of { academicYear, term, class, subject? } from active
 * TeacherAssignments, plus class-only read scope from active
 * ClassTeacherAssignments (read-only; management still needs a
 * TeacherAssignment).
 *
 * This exists so list/read endpoints can perform exact tuple matching
 * instead of independent set membership (which would allow tuple-crossing).
 */
const getTeacherScope = async (teacherId, school) => {
  const [teaching, classTeaching] = await Promise.all([
    TeacherAssignment.find({ school, teacher: teacherId, status: 'ACTIVE' })
      .select('academicYear term class subject')
      .lean(),
    ClassTeacherAssignment.find({ school, teacher: teacherId, status: 'ACTIVE' })
      .select('academicYear term class')
      .lean(),
  ]);
  return { teaching, classTeaching };
};

/**
 * True if the given assessment tuple matches any active teaching assignment.
 */
const matchesTeachingScope = (scope, { academicYear, term, class: classId, subject }) => {
  if (academicYear == null || term == null || classId == null || subject == null) return false;
  const y = academicYear.toString();
  const t = term.toString();
  const c = classId.toString();
  const s = subject.toString();
  return scope.teaching.some((a) =>
    a.academicYear.toString() === y &&
    a.term.toString() === t &&
    a.class.toString() === c &&
    a.subject.toString() === s
  );
};

/**
 * True if the assessment is readable: any teaching match, or (CLASS_TEACHER)
 * a class-teacher assignment covering the class+year+term.
 * Class teachers get READ access to their assigned class, but management
 * still requires a matching TeacherAssignment (checked separately).
 */
const matchesReadScope = (scope, { academicYear, term, class: classId, subject }) => {
  if (matchesTeachingScope(scope, { academicYear, term, class: classId, subject })) return true;
  if (academicYear == null || term == null || classId == null) return false;
  const y = academicYear.toString();
  const t = term.toString();
  const c = classId.toString();
  return scope.classTeaching.some((a) =>
    a.academicYear.toString() === y &&
    a.term.toString() === t &&
    a.class.toString() === c
  );
};

const create = async ({ school, academicYear, term, class: classId, subject, type, name, maxMarks, weight, status, startDate, dueDate, createdBy }) => {
  await validateAcademicScope(school, { academicYear, term, class: classId, subject });

  if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
    throw err400('Due date cannot be before start date');
  }

  // Reject invalid weight configurations (never silently normalise)
  await assertValidWeightConfig(school, { academicYear, term, class: classId, subject, weight });

  return Assessment.create({
    school, academicYear, term, class: classId, subject,
    type, name, maxMarks, weight, status: status || 'DRAFT',
    startDate: startDate || null, dueDate: dueDate || null,
    createdBy,
  });
};

const list = async (schoolId, filters = {}) => {
  const query = { school: schoolId };
  if (filters.academicYear) query.academicYear = filters.academicYear;
  if (filters.term) query.term = filters.term;
  if (filters.class) query.class = filters.class;
  if (filters.subject) query.subject = filters.subject;
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;

  const docs = await Assessment.find(query).sort({ createdAt: -1 });

  const yearIds = [...new Set(docs.map(d => d.academicYear).filter(Boolean))];
  const termIds = [...new Set(docs.map(d => d.term).filter(Boolean))];
  const classIds = [...new Set(docs.map(d => d.class).filter(Boolean))];
  const subjectIds = [...new Set(docs.map(d => d.subject).filter(Boolean))];

  const [years, terms, classes, subjects] = await Promise.all([
    yearIds.length ? AcademicYear.find({ _id: { $in: yearIds } }) : [],
    termIds.length ? Term.find({ _id: { $in: termIds } }) : [],
    classIds.length ? Class.find({ _id: { $in: classIds } }) : [],
    subjectIds.length ? Subject.find({ _id: { $in: subjectIds } }) : [],
  ]);

  const yearMap = new Map(years.map(y => [y._id, y]));
  const termMap = new Map(terms.map(t => [t._id, t]));
  const classMap = new Map(classes.map(c => [c._id, c]));
  const subjectMap = new Map(subjects.map(s => [s._id, s]));

  return docs.map(doc => {
    const plain = doc.toObject ? doc.toObject() : doc;
    return {
      ...plain,
      academicYear: plain.academicYear ? yearMap.get(plain.academicYear) : null,
      term: plain.term ? termMap.get(plain.term) : null,
      class: plain.class ? classMap.get(plain.class) : null,
      subject: plain.subject ? subjectMap.get(plain.subject) : null,
    };
  });
};

const getById = async (id, schoolId) => {
  const doc = await Assessment.findById(id);
  if (!doc) throw err404('Assessment not found');
  assertSchoolOwnership(doc, schoolId);

  const plain = doc.toObject ? doc.toObject() : doc;

  const [year, term, cls, subject] = await Promise.all([
    plain.academicYear ? AcademicYear.findById(plain.academicYear) : null,
    plain.term ? Term.findById(plain.term) : null,
    plain.class ? Class.findById(plain.class) : null,
    plain.subject ? Subject.findById(plain.subject) : null,
  ]);

  return {
    ...plain,
    academicYear: year || null,
    term: term || null,
    class: cls || null,
    subject: subject || null,
  };
};

const update = async (id, schoolId, updates, updatedBy) => {
  const doc = await Assessment.findById(id);
  if (!doc) throw err404('Assessment not found');
  assertSchoolOwnership(doc, schoolId);

  const allowed = ['name', 'type', 'maxMarks', 'weight', 'status', 'startDate', 'dueDate'];

  // CLOSED / CANCELLED assessments are frozen: only status transitions are
  // permitted (e.g. ADMIN reopening or cancelling), never field edits.
  const frozen = doc.status === 'CLOSED' || doc.status === 'CANCELLED';
  if (frozen) {
    const hasFieldEdits = allowed.some((f) => f !== 'status' && updates[f] !== undefined);
    if (hasFieldEdits) {
      throw err400('Cannot modify a closed or cancelled assessment');
    }
  }

  for (const f of allowed) {
    if (updates[f] !== undefined) doc[f] = updates[f];
  }
  doc.updatedBy = updatedBy;

  if (doc.startDate && doc.dueDate && new Date(doc.dueDate) < new Date(doc.startDate)) {
    throw err400('Due date cannot be before start date');
  }

  // Reject invalid weight configurations when weight changed (never silently normalise)
  if (updates.weight !== undefined) {
    await assertValidWeightConfig(schoolId, {
      academicYear: doc.academicYear,
      term: doc.term,
      class: doc.class,
      subject: doc.subject,
      weight: doc.weight,
      excludeId: doc._id,
    });
  }

  return doc.save();
};

module.exports = {
  create,
  list,
  getById,
  update,
  validateAcademicScope,
  assertTeacherAssignmentScope,
  assertValidWeightConfig,
  getTeacherScope,
  matchesTeachingScope,
  matchesReadScope,
};
