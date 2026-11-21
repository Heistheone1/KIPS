'use strict';

const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

// ─── Reports ───────────────────────────────────────────────────────────────

const generateReportsSchema = Joi.object({
  academicYear: objectId.required().messages({ 'any.required': 'Academic year ID is required' }),
  term: objectId.required().messages({ 'any.required': 'Term ID is required' }),
  class: objectId.required().messages({ 'any.required': 'Class ID is required' }),
});

const reportIdParamSchema = Joi.object({
  id: objectId.required().messages({ 'any.required': 'Report ID is required' }),
});

const reportVersionParamSchema = Joi.object({
  id: objectId.required().messages({ 'any.required': 'Report ID is required' }),
  version: Joi.number().integer().min(1).required().messages({
    'any.required': 'Version number is required',
    'number.min': 'Version must be at least 1',
  }),
});

const reportTransitionSchema = Joi.object({
  note: Joi.string().trim().max(500).optional().allow('', null),
});

const reportInvalidateSchema = Joi.object({
  reason: Joi.string().trim().max(500).optional().allow('', null),
});

const listReportsSchema = Joi.object({
  academicYear: objectId.optional(),
  term: objectId.optional(),
  class: objectId.optional(),
  student: objectId.optional(),
  status: Joi.string().valid('GENERATED', 'REVIEWED', 'APPROVED', 'PUBLISHED').optional(),
  stale: Joi.string().valid('true', 'false').optional(),
  periodType: Joi.string().valid('CAT', 'MID_TERM', 'QUIZ', 'TEST').optional(),
  catAssessment: objectId.optional(),
});

const generatePeriodReportsSchema = Joi.object({
  academicYear: objectId.required().messages({ 'any.required': 'Academic year ID is required' }),
  term: objectId.required().messages({ 'any.required': 'Term ID is required' }),
  class: objectId.required().messages({ 'any.required': 'Class ID is required' }),
  catAssessment: objectId.required().messages({ 'any.required': 'CAT assessment ID is required' }),
  periodType: Joi.string().valid('CAT', 'MID_TERM', 'QUIZ', 'TEST').default('CAT'),
});

module.exports = {
  generateReportsSchema,
  reportIdParamSchema,
  reportVersionParamSchema,
  reportTransitionSchema,
  reportInvalidateSchema,
  listReportsSchema,
  generatePeriodReportsSchema,
};
