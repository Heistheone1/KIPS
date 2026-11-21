'use strict';

const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const ASSESSMENT_TYPES = ['TEST', 'CAT', 'QUIZ', 'HOMEWORK', 'MID_TERM', 'EXAM', 'END_OF_TERM'];
const ASSESSMENT_STATUSES = ['DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED'];

// ─── Assessment ───────────────────────────────────────────────────────────────

const createAssessmentSchema = Joi.object({
  academicYear: objectId.required().messages({ 'any.required': 'Academic year ID is required' }),
  term: objectId.required().messages({ 'any.required': 'Term ID is required' }),
  class: objectId.required().messages({ 'any.required': 'Class ID is required' }),
  subject: objectId.required().messages({ 'any.required': 'Subject ID is required' }),
  type: Joi.string().valid(...ASSESSMENT_TYPES).required().messages({
    'any.only': `Type must be one of: ${ASSESSMENT_TYPES.join(', ')}`,
    'any.required': 'Assessment type is required',
  }),
  name: Joi.string().trim().min(1).max(120).required(),
  maxMarks: Joi.number().positive().required().messages({
    'number.positive': 'Max marks must be greater than 0',
    'any.required': 'Max marks is required',
  }),
  weight: Joi.number().min(0).max(100).required().messages({
    'number.min': 'Weight must be >= 0',
    'number.max': 'Weight must be <= 100',
    'any.required': 'Weight is required',
  }),
  status: Joi.string().valid(...ASSESSMENT_STATUSES).default('DRAFT'),
  startDate: Joi.date().iso().optional().allow(null),
  endDate: Joi.date().iso().optional().allow(null),
  dueDate: Joi.date().iso().optional().allow(null),
});

const updateAssessmentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).optional(),
  type: Joi.string().valid(...ASSESSMENT_TYPES).optional(),
  maxMarks: Joi.number().positive().optional(),
  weight: Joi.number().min(0).max(100).optional(),
  status: Joi.string().valid(...ASSESSMENT_STATUSES).optional(),
  startDate: Joi.date().iso().optional().allow(null),
  dueDate: Joi.date().iso().optional().allow(null),
});

// ─── Assessment Mark ──────────────────────────────────────────────────────────

const recordMarkSchema = Joi.object({
  assessmentId: objectId.required().messages({ 'any.required': 'Assessment ID is required' }),
  studentId: objectId.required().messages({ 'any.required': 'Student ID is required' }),
  // score is required when entered = true, optional when entered = false
  score: Joi.number().min(0).optional().allow(null),
  entered: Joi.boolean().required().messages({ 'any.required': 'entered flag is required' }),
  reason: Joi.string().trim().max(500).optional().allow('', null),
});

const bulkMarkItemSchema = Joi.object({
  studentId: objectId.required(),
  score: Joi.number().min(0).optional().allow(null),
  entered: Joi.boolean().required(),
  reason: Joi.string().trim().max(500).optional().allow('', null),
});

const bulkRecordMarksSchema = Joi.object({
  assessmentId: objectId.required().messages({ 'any.required': 'Assessment ID is required' }),
  marks: Joi.array().items(bulkMarkItemSchema).min(1).required().messages({
    'any.required': 'Marks array is required',
    'array.min': 'At least one mark is required',
  }),
});

module.exports = {
  createAssessmentSchema,
  updateAssessmentSchema,
  recordMarkSchema,
  bulkRecordMarksSchema,
  ASSESSMENT_TYPES,
  ASSESSMENT_STATUSES,
};
