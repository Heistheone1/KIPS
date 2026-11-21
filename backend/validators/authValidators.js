'use strict';

const Joi = require('joi');

const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({ message: 'Validation failed', errors: messages });
  }
  req[source] = value; // Replace with validated + stripped value
  next();
};

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'A valid email is required',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

const createUserSchema = Joi.object({
  school: Joi.string().hex().length(24).optional(),
  firstName: Joi.string().trim().min(1).max(60).required(),
  lastName: Joi.string().trim().min(1).max(60).required(),
  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string().trim().max(20).optional().allow(''),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters',
  }),
  // Role is NOT accepted from the request body for ADMIN creation
  // It is set explicitly in the controller
  role: Joi.string().valid('DOS', 'TEACHER').required().messages({
    'any.only': 'Role must be one of: DOS, TEACHER',
    'any.required': 'Role is required',
  }),
});

const updateUserSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(60).optional(),
  lastName: Joi.string().trim().min(1).max(60).optional(),
  phone: Joi.string().trim().max(20).optional().allow(''),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
  // Email and role changes are intentionally excluded — handled separately
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(60).optional(),
  lastName: Joi.string().trim().min(1).max(60).optional(),
  phone: Joi.string().trim().max(20).optional().allow(''),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: Joi.string().min(8).max(128).required().messages({
    'string.min': 'New password must be at least 8 characters',
    'any.required': 'New password is required',
  }),
});

const createSchoolSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  code: Joi.string().trim().uppercase().alphanum().min(2).max(20).required(),
  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string().trim().max(20).optional().allow(''),
  address: Joi.string().trim().max(255).optional().allow(''),
  logoUrl: Joi.string().uri().optional().allow(''),
});

const updateSchoolSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  phone: Joi.string().trim().max(20).optional().allow(''),
  address: Joi.string().trim().max(255).optional().allow(''),
  logoUrl: Joi.string().uri().optional().allow(''),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
});

module.exports = {
  validate,
  loginSchema,
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  createSchoolSchema,
  updateSchoolSchema,
};
