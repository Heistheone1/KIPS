'use strict';

const odm = require('../lib/pg-odm');

const ReportVersion = odm.defineModel('ReportVersion', {
  defaults: {
    status: 'GENERATED',
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    approvedBy: null,
    approvedAt: null,
    approvalNote: null,
    publishedBy: null,
    publishedAt: null,
  },
  indexes: [{ fields: { reportCard: 1, version: 1 }, unique: true }],
  refs: {
    reportCard: 'ReportCard',
    school: 'School',
    academicYear: 'AcademicYear',
    term: 'Term',
    class: 'Class',
    student: 'Student',
    generatedBy: 'User',
    reviewedBy: 'User',
    approvedBy: 'User',
    publishedBy: 'User',
  },
  statics: {
    STATUSES: ['GENERATED', 'REVIEWED', 'APPROVED', 'PUBLISHED'],
  },
});

module.exports = ReportVersion;
