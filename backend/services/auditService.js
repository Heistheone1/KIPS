'use strict';

const AuditLog = require('../models/AuditLog');

// Fields that must never appear in audit metadata
const FORBIDDEN_FIELDS = [
  'password', 'passwordHash', 'token', 'accessToken', 'refreshToken',
  'secret', 'jwt', 'authorization', 'cookie',
];

const sanitizeMetadata = (data) => {
  if (!data || typeof data !== 'object') return data;
  const sanitized = { ...data };
  for (const field of FORBIDDEN_FIELDS) {
    if (field in sanitized) delete sanitized[field];
  }
  return sanitized;
};

/**
 * Log an auditable action.
 *
 * @param {object} params
 * @param {object|null} params.actor       - The User document performing the action (or null for system)
 * @param {string}      params.action      - Action identifier e.g. 'USER_CREATED', 'LOGIN_SUCCESS'
 * @param {string|null} params.entityType  - e.g. 'User', 'School', 'Mark'
 * @param {*|null}      params.entityId    - MongoDB ObjectId of the affected entity
 * @param {object|null} params.metadata    - Additional context (will be sanitized)
 * @param {object|null} params.req         - Express request (for IP + userAgent)
 */
const log = async ({ actor = null, action, entityType = null, entityId = null, metadata = null, req = null }) => {
  try {
    const entry = {
      school: actor?.school || null,
      actor: actor?._id || null,
      actorEmail: actor?.email || null,
      actorRole: actor?.role || null,
      action,
      entityType,
      entityId: entityId || null,
      metadata: sanitizeMetadata(metadata),
      ipAddress: req ? (req.ip || req.headers['x-forwarded-for'] || null) : null,
      userAgent: req ? (req.headers['user-agent'] || null) : null,
    };
    await AuditLog.create(entry);
  } catch (err) {
    // Audit log failure must never crash the application
    console.error('[AuditLog] Failed to write audit entry:', err.message);
  }
};

module.exports = { log };
