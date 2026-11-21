'use strict';

const odm = require('../lib/pg-odm');

const Enrollment = odm.defineModel('Enrollment', {
  defaults: {
    status: 'ACTIVE',
  },
  indexes: [{ fields: { student: 1, academicYear: 1 }, unique: true }],
  refs: {
    school: 'School',
    student: 'Student',
    academicYear: 'AcademicYear',
    class: 'Class',
    createdBy: 'User',
  },
  statics: {
    STATUSES: ['ACTIVE', 'COMPLETED', 'TRANSFERRED', 'WITHDRAWN', 'INACTIVE'],
  },
});

module.exports = Enrollment;
