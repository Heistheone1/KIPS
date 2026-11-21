'use strict';

const odm = require('../lib/pg-odm');

const AssessmentMark = odm.defineModel('AssessmentMark', {
  defaults: {
    score: null,
    entered: false,
    updatedBy: null,
    correctionCount: 0,
  },
  indexes: [{ fields: { assessment: 1, student: 1 }, unique: true }],
  refs: {
    school: 'School',
    academicYear: 'AcademicYear',
    term: 'Term',
    class: 'Class',
    subject: 'Subject',
    assessment: 'Assessment',
    student: 'Student',
    recordedBy: 'User',
    updatedBy: 'User',
  },
});

module.exports = AssessmentMark;
