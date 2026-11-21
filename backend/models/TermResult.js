'use strict';

const odm = require('../lib/pg-odm');

const TermResult = odm.defineModel('TermResult', {
  defaults: {
    status: 'INCOMPLETE',
    isStale: false,
    subjects: [],
    average: null,
    grade: null,
    remark: null,
    rank: null,
    rankOutOf: null,
    eligibleForRanking: false,
    termsIncluded: [],
    subjectsCounted: 0,
    subjectsTotal: 0,
  },
  indexes: [
    {
      fields: {
        school: 1, academicYear: 1, term: 1, class: 1, student: 1, resultType: 1,
      },
      unique: true,
    },
  ],
  refs: {
    school: 'School',
    academicYear: 'AcademicYear',
    term: 'Term',
    class: 'Class',
    student: 'Student',
    enrollment: 'Enrollment',
    'subjects.subject': 'Subject',
    'subjects.subjectResult': 'SubjectResult',
    calculatedBy: 'User',
  },
  statics: {
    RESULT_TYPES: ['TERM', 'CUMULATIVE', 'ANNUAL'],
    STATUSES: ['COMPLETE', 'INCOMPLETE'],
  },
});

module.exports = TermResult;
