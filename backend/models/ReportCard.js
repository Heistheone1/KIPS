'use strict';

const odm = require('../lib/pg-odm');

const ReportCard = odm.defineModel('ReportCard', {
  defaults: {
    status: 'GENERATED',
    currentVersion: 1,
    isStale: false,
    resultType: 'TERM',
    periodType: null,
    catAssessment: null,
    termsIncluded: [],
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    approvedBy: null,
    approvedAt: null,
    approvalNote: null,
    publishedBy: null,
    publishedAt: null,
    invalidatedBy: null,
    invalidatedAt: null,
    invalidationReason: null,
  },
  indexes: [
    {
      fields: { school: 1, academicYear: 1, term: 1, class: 1, student: 1, periodType: 1, catAssessment: 1 },
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
    catAssessment: 'Assessment',
    sourceTermResult: 'TermResult',
    generatedBy: 'User',
    reviewedBy: 'User',
    approvedBy: 'User',
    publishedBy: 'User',
    invalidatedBy: 'User',
  },
  statics: {
    STATUSES: ['GENERATED', 'REVIEWED', 'APPROVED', 'PUBLISHED'],
    RESULT_TYPES: ['TERM', 'CUMULATIVE', 'ANNUAL', 'PERIOD'],
    PERIOD_TYPES: ['CAT', 'MID_TERM', 'QUIZ', 'TEST'],
  },
});

module.exports = ReportCard;
