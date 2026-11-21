'use strict';

const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

// ─── Academic Year ────────────────────────────────────────────────────────────

const createAcademicYearSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  code: Joi.string().trim().uppercase().alphanum().min(2).max(20).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
    'date.greater': 'End date must be after start date',
  }),
  status: Joi.string().valid('PLANNED', 'ACTIVE', 'CLOSED').default('PLANNED'),
});

const updateAcademicYearSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  status: Joi.string().valid('PLANNED', 'ACTIVE', 'CLOSED').optional(),
});

// ─── Term ─────────────────────────────────────────────────────────────────────

const createTermSchema = Joi.object({
  academicYear: objectId.required().messages({ 'any.required': 'Academic year ID is required' }),
  name: Joi.string().trim().min(2).max(60).required(),
  code: Joi.string().trim().uppercase().alphanum().min(2).max(20).required(),
  sequence: Joi.number().integer().min(1).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
    'date.greater': 'End date must be after start date',
  }),
  status: Joi.string().valid('PLANNED', 'ACTIVE', 'CLOSED').default('PLANNED'),
});

const updateTermSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  status: Joi.string().valid('PLANNED', 'ACTIVE', 'CLOSED').optional(),
});

// ─── Class ────────────────────────────────────────────────────────────────────

const createClassSchema = Joi.object({
  academicYear: objectId.required().messages({ 'any.required': 'Academic year ID is required' }),
  name: Joi.string().trim().min(1).max(60).required(),
  code: Joi.string().trim().uppercase().alphanum().min(1).max(20).required(),
  level: Joi.string().trim().max(20).optional().allow(''),
  section: Joi.string().trim().max(20).optional().allow(''),
  stream: Joi.string().trim().max(20).optional().allow(''),
  capacity: Joi.number().integer().min(1).optional().allow(null),
  description: Joi.string().trim().max(500).optional().allow('', null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'CLOSED').default('ACTIVE'),
});

const updateClassSchema = Joi.object({
  name: Joi.string().trim().min(1).max(60).optional(),
  level: Joi.string().trim().max(20).optional().allow(''),
  section: Joi.string().trim().max(20).optional().allow(''),
  stream: Joi.string().trim().max(20).optional().allow(''),
  capacity: Joi.number().integer().min(1).optional().allow(null),
  description: Joi.string().trim().max(500).optional().allow('', null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'CLOSED').optional(),
});

// ─── Student ──────────────────────────────────────────────────────────────────

const createStudentSchema = Joi.object({
  admissionNumber: Joi.string().trim().min(1).max(30).required(),
  level: Joi.string().valid('NURSERY', 'PRIMARY').optional().allow(null),
  firstName: Joi.string().trim().min(1).max(60).required(),
  middleName: Joi.string().trim().max(60).optional().allow('', null),
  lastName: Joi.string().trim().min(1).max(60).required(),
  dateOfBirth: Joi.date().iso().optional().allow(null),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').optional().allow(null),
  guardianName: Joi.string().trim().max(120).optional().allow('', null),
  guardianPhone: Joi.string().trim().max(20).optional().allow('', null),
  guardianEmail: Joi.string().email().lowercase().trim().max(120).optional().allow('', null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN').default('ACTIVE'),
});

const updateStudentSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(60).optional(),
  middleName: Joi.string().trim().max(60).optional().allow('', null),
  lastName: Joi.string().trim().min(1).max(60).optional(),
  dateOfBirth: Joi.date().iso().optional().allow(null),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').optional().allow(null),
  guardianName: Joi.string().trim().max(120).optional().allow('', null),
  guardianPhone: Joi.string().trim().max(20).optional().allow('', null),
  guardianEmail: Joi.string().email().lowercase().trim().max(120).optional().allow('', null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN').optional(),
});

// ─── Enrollment ───────────────────────────────────────────────────────────────

const createEnrollmentSchema = Joi.object({
  student: objectId.required().messages({ 'any.required': 'Student ID is required' }),
  academicYear: objectId.required().messages({ 'any.required': 'Academic year ID is required' }),
  class: objectId.required().messages({ 'any.required': 'Class ID is required' }),
  enrollmentDate: Joi.date().iso().optional(),
  status: Joi.string().valid('ACTIVE', 'COMPLETED', 'TRANSFERRED', 'WITHDRAWN', 'INACTIVE').default('ACTIVE'),
});

const updateEnrollmentSchema = Joi.object({
  class: objectId.optional(),
  enrollmentDate: Joi.date().iso().optional(),
  status: Joi.string().valid('ACTIVE', 'COMPLETED', 'TRANSFERRED', 'WITHDRAWN', 'INACTIVE').optional(),
});

// ─── Subject ──────────────────────────────────────────────────────────────────

const createSubjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  code: Joi.string().trim().uppercase().min(1).max(20).required(),
  description: Joi.string().trim().max(500).optional().allow('', null),
  level: Joi.string().valid('NURSERY', 'PRIMARY', 'ALL').optional().allow(null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').default('ACTIVE'),
});

const updateSubjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().max(500).optional().allow('', null),
  level: Joi.string().valid('NURSERY', 'PRIMARY', 'ALL').optional().allow(null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
});

// ─── Teacher Assignment ───────────────────────────────────────────────────────

const createTeacherAssignmentSchema = Joi.object({
  teacher: objectId.required().messages({ 'any.required': 'Teacher ID is required' }),
  academicYear: objectId.required().messages({ 'any.required': 'Academic year ID is required' }),
  term: objectId.required().messages({ 'any.required': 'Term ID is required' }),
  class: objectId.required().messages({ 'any.required': 'Class ID is required' }),
  subject: objectId.required().messages({ 'any.required': 'Subject ID is required' }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'CANCELLED').default('ACTIVE'),
});

const updateTeacherAssignmentSchema = Joi.object({
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'CANCELLED').optional(),
});

// ─── Class Teacher Assignment ─────────────────────────────────────────────────

const createClassTeacherAssignmentSchema = Joi.object({
  teacher: objectId.required().messages({ 'any.required': 'Teacher ID is required' }),
  academicYear: objectId.required().messages({ 'any.required': 'Academic year ID is required' }),
  term: objectId.required().messages({ 'any.required': 'Term ID is required' }),
  class: objectId.required().messages({ 'any.required': 'Class ID is required' }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'CANCELLED').default('ACTIVE'),
});

const updateClassTeacherAssignmentSchema = Joi.object({
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'CANCELLED').optional(),
});

module.exports = {
  createAcademicYearSchema,
  updateAcademicYearSchema,
  createTermSchema,
  updateTermSchema,
  createClassSchema,
  updateClassSchema,
  createStudentSchema,
  updateStudentSchema,
  createEnrollmentSchema,
  updateEnrollmentSchema,
  createSubjectSchema,
  updateSubjectSchema,
  createTeacherAssignmentSchema,
  updateTeacherAssignmentSchema,
  createClassTeacherAssignmentSchema,
  updateClassTeacherAssignmentSchema,
};
