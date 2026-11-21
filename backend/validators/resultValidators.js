'use strict';

const Joi = require('joi');
const { MISSING_MARK_POLICIES } = require('../services/markEngine');

const objectId = Joi.string().hex().length(24);
const SCALE_GRADES = ['A', 'B', 'C', 'D', 'E', 'F'];

// ─── Result generation ─────────────────────────────────────────────────────

const generateSubjectResultsSchema = Joi.object({
  academicYear: objectId.required().messages({ 'any.required': 'Academic year ID is required' }),
  term: objectId.required().messages({ 'any.required': 'Term ID is required' }),
  class: objectId.required().messages({ 'any.required': 'Class ID is required' }),
  subject: objectId.required().messages({ 'any.required': 'Subject ID is required' }),
  missingPolicy: Joi.string().valid(...MISSING_MARK_POLICIES).optional(),
});

const generateTermResultsSchema = Joi.object({
  academicYear: objectId.required().messages({ 'any.required': 'Academic year ID is required' }),
  term: objectId.required().messages({ 'any.required': 'Term ID is required' }),
  class: objectId.required().messages({ 'any.required': 'Class ID is required' }),
  missingPolicy: Joi.string().valid(...MISSING_MARK_POLICIES).optional(),
});

const recalculateScopeSchema = Joi.object({
  academicYear: objectId.required(),
  term: objectId.required(),
  class: objectId.required(),
  subject: objectId.optional(),
});

// ─── Reads (query) ─────────────────────────────────────────────────────────

const listSubjectResultsSchema = Joi.object({
  academicYear: objectId.optional(),
  term: objectId.optional(),
  class: objectId.optional(),
  subject: objectId.optional(),
  status: Joi.string().valid('COMPLETE', 'INCOMPLETE').optional(),
  stale: Joi.string().valid('true', 'false').optional(),
});

const listTermResultsSchema = Joi.object({
  academicYear: objectId.optional(),
  term: objectId.optional(),
  class: objectId.optional(),
  resultType: Joi.string().valid('TERM', 'CUMULATIVE', 'ANNUAL').optional(),
  status: Joi.string().valid('COMPLETE', 'INCOMPLETE').optional(),
  stale: Joi.string().valid('true', 'false').optional(),
});

const snapshotHistorySchema = Joi.object({
  academicYear: objectId.optional(),
  term: objectId.optional(),
  class: objectId.optional(),
  subject: objectId.optional(),
  resultType: Joi.string().valid('TERM', 'CUMULATIVE', 'ANNUAL', 'SUBJECT').optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

// ─── Grading scales ────────────────────────────────────────────────────────

const gradeBandSchema = Joi.object({
  grade: Joi.string().trim().min(1).max(8).required(),
  minPercentage: Joi.number().min(0).max(100).required(),
  maxPercentage: Joi.number().min(0).max(100).required(),
  remark: Joi.string().trim().max(120).optional().allow('', null),
});

const saveGradingScaleSchema = Joi.object({
  academicYear: objectId.required().messages({ 'any.required': 'Academic year ID is required' }),
  name: Joi.string().trim().min(1).max(80).optional().default('Default'),
  bands: Joi.array().items(gradeBandSchema).min(1).required().messages({
    'any.required': 'Grade bands are required',
    'array.min': 'At least one grade band is required',
  }),
});

const listGradingScalesSchema = Joi.object({
  academicYear: objectId.optional(),
});

const resultStatusSchema = Joi.object({
  academicYear: objectId.optional(),
  term: objectId.optional(),
  class: objectId.optional(),
});

module.exports = {
  generateSubjectResultsSchema,
  generateTermResultsSchema,
  recalculateScopeSchema,
  listSubjectResultsSchema,
  listTermResultsSchema,
  snapshotHistorySchema,
  saveGradingScaleSchema,
  listGradingScalesSchema,
  resultStatusSchema,
  MISSING_MARK_POLICIES,
  SCALE_GRADES,
};
