'use strict';

const odm = require('../lib/pg-odm');

const AcademicYear = odm.defineModel('AcademicYear', {
  defaults: {
    status: 'PLANNED',
  },
  indexes: [{ fields: { school: 1, code: 1 }, unique: true }],
  refs: {
    school: 'School',
    createdBy: 'User',
  },
  statics: {
    STATUSES: ['PLANNED', 'ACTIVE', 'CLOSED'],
  },
});

module.exports = AcademicYear;
