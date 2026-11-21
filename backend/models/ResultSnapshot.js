'use strict';

const odm = require('../lib/pg-odm');

const ResultSnapshot = odm.defineModel('ResultSnapshot', {
  immutable: true,
  defaults: {
    subject: null,
    reason: 'GENERATION',
  },
  indexes: [{ fields: { school: 1, academicYear: 1, term: 1, class: 1 } }],
  refs: {
    school: 'School',
    academicYear: 'AcademicYear',
    term: 'Term',
    class: 'Class',
    subject: 'Subject',
    snapshotBy: 'User',
  },
  statics: {
    RESULT_TYPES: ['SUBJECT', 'TERM', 'CUMULATIVE', 'ANNUAL'],
  },
});

module.exports = ResultSnapshot;
