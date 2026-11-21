'use strict';

const odm = require('../lib/pg-odm');

const AuditLog = odm.defineModel('AuditLog', {
  defaults: {
    actor: null,
    entityType: null,
    entityId: null,
    metadata: null,
    ip: null,
    userAgent: null,
    school: null,
  },
  indexes: [{ fields: { school: 1, action: 1, createdAt: -1 } }],
  refs: {
    actor: 'User',
    school: 'School',
  },
});

module.exports = AuditLog;
