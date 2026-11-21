'use strict';

const odm = require('../lib/pg-odm');

const Subject = odm.defineModel('Subject', {
  defaults: {
    status: 'ACTIVE',
    description: null,
    level: null,
  },
  indexes: [{ fields: { school: 1, code: 1 }, unique: true }],
  refs: {
    school: 'School',
    createdBy: 'User',
  },
  statics: {
    STATUSES: ['ACTIVE', 'INACTIVE'],
    LEVELS: ['NURSERY', 'PRIMARY', 'ALL'],
  },
});

module.exports = Subject;
