'use strict';

const odm = require('../lib/pg-odm');

const Term = odm.defineModel('Term', {
  defaults: {
    status: 'PLANNED',
  },
  indexes: [{ fields: { school: 1, academicYear: 1, code: 1 }, unique: true }],
  refs: {
    school: 'School',
    academicYear: 'AcademicYear',
    createdBy: 'User',
  },
  statics: {
    STATUSES: ['PLANNED', 'ACTIVE', 'CLOSED'],
  },
});

module.exports = Term;
