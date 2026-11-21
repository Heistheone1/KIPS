'use strict';

const odm = require('../lib/pg-odm');

const TeacherAssignment = odm.defineModel('TeacherAssignment', {
  defaults: {
    status: 'ACTIVE',
  },
  indexes: [
    {
      fields: { teacher: 1, academicYear: 1, term: 1, class: 1, subject: 1 },
      unique: true,
    },
  ],
  refs: {
    school: 'School',
    teacher: 'User',
    academicYear: 'AcademicYear',
    term: 'Term',
    class: 'Class',
    subject: 'Subject',
    assignedBy: 'User',
  },
  statics: {
    STATUSES: ['ACTIVE', 'INACTIVE', 'CANCELLED'],
  },
});

module.exports = TeacherAssignment;
