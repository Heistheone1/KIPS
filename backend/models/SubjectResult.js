'use strict';

const odm = require('../lib/pg-odm');

const SubjectResult = odm.defineModel('SubjectResult', {
  defaults: {
    status: 'INCOMPLETE',
    isStale: false,
    total: null,
    percentage: null,
    grade: null,
    remark: null,
    missingCount: 0,
    recordedCount: 0,
    assessmentsCount: 0,
    sourceMarks: [],
    termsIncluded: [],
  },
  indexes: [
    {
      fields: {
        school: 1, academicYear: 1, term: 1, class: 1, subject: 1, student: 1,
      },
      unique: true,
    },
  ],
  refs: {
    school: 'School',
    academicYear: 'AcademicYear',
    term: 'Term',
    class: 'Class',
    subject: 'Subject',
    student: 'Student',
    enrollment: 'Enrollment',
    calculatedBy: 'User',
  },
  statics: {
    STATUSES: ['COMPLETE', 'INCOMPLETE'],
  },
});

module.exports = SubjectResult;
