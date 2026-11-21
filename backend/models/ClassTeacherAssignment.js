'use strict';

const odm = require('../lib/pg-odm');

const ClassTeacherAssignment = odm.defineModel('ClassTeacherAssignment', {
  defaults: {
    status: 'ACTIVE',
  },
  indexes: [
    {
      fields: { teacher: 1, academicYear: 1, term: 1, class: 1 },
      unique: true,
    },
  ],
  refs: {
    school: 'School',
    teacher: 'User',
    academicYear: 'AcademicYear',
    term: 'Term',
    class: 'Class',
    assignedBy: 'User',
  },
  statics: {
    STATUSES: ['ACTIVE', 'INACTIVE', 'CANCELLED'],
  },
});

module.exports = ClassTeacherAssignment;
