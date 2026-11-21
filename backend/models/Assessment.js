'use strict';

const odm = require('../lib/pg-odm');

const TYPES = [
  'TEST', 'CAT', 'QUIZ', 'HOMEWORK', 'MID_TERM',
  'EXAM', 'END_OF_TERM',
];

const STATUSES = ['DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED'];

const Assessment = odm.defineModel('Assessment', {
  defaults: {
    status: 'DRAFT',
    description: null,
    date: null,
  },
  indexes: [{ fields: { school: 1, academicYear: 1, term: 1, class: 1, subject: 1, name: 1 } }],
  refs: {
    school: 'School',
    academicYear: 'AcademicYear',
    term: 'Term',
    class: 'Class',
    subject: 'Subject',
    createdBy: 'User',
    updatedBy: 'User',
  },
  statics: { TYPES, STATUSES },
});

module.exports = Assessment;
